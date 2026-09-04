"""
agent.py
========
Wires SysmonReader → SlidingWindowBuffer → FeatureExtractor → XGBoost.

Run as Administrator (Sysmon log requires elevated access).

Usage:
    python agent.py                        # live detection
    python agent.py --csv output.csv       # also save feature vectors to CSV
    python agent.py --no-model             # feature extraction only, no prediction
"""

import argparse
import csv
import os
import xgboost as xgb
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import numpy as np

import config as cfg

# Your files — must be in the same directory
from feature_extractor import FeatureExtractor
from sliding_window_buffer import SlidingWindowBuffer


# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — edit these
# ─────────────────────────────────────────────────────────────────────────────

# How often the agent reads new Sysmon events and runs predictions (seconds)
STEP_INTERVAL = 3

# Sliding window size — must match what FeatureExtractor assumes (10s)
WINDOW_SIZE_SECONDS = 10

# How many Sysmon events to read per poll
# 500 is safe for a 3-second interval on a normal machine
MAX_EVENTS_PER_READ = 10000

# XGBoost model path — set to None to run without a model
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "agent",
    "models",
    "ransomware_xgb.json"
)

# EMA smoothing factor: higher = more reactive, lower = smoother
# 0.4 means: 40% new score + 60% previous score
EMA_ALPHA = 0.4

# Alert thresholds
SUSPICIOUS_THRESHOLD = 0.50   # amber
ALERT_THRESHOLD = 0.65        # red
CRITICAL_CONSECUTIVE = 3      # windows above ALERT_THRESHOLD before CRITICAL

# Processes to ignore entirely — system noise
# Add process names (lowercase, no path) that dominate your logs
WHITELIST = {
    "svchost.exe",
    "msmpeng.exe",       # Windows Defender
    "wmiprvse.exe",
    "searchindexer.exe",
    "runtimebroker.exe",
    "backgroundtaskhost.exe",
    "tiworker.exe",      # Windows Update
    "wuauclt.exe",
    "spoolsv.exe",
    "lsass.exe",
    "csrss.exe",
    "smss.exe",
    "wininit.exe",
    "services.exe",
    "system",
    "registry",
    "fontdrvhost.exe",
    "dwm.exe",
    "audiodg.exe",
    "ctfmon.exe",
    "sihost.exe",
    "taskhostw.exe",
    "securityhealthservice.exe",
}

# Feature names in the exact order the model was trained on
# Must match FeatureExtractor.extract() output keys
FEATURE_NAMES = [
    "process_create_count",
    "process_terminated_count",
    "file_create_count",
    "file_creation_time_changed",
    "registry_write_count",
    "pipe_create_count",
    "network_connection_count",
    "dns_query_count",
    "file_activity_rate",
    "process_activity_rate",
    "network_activity_rate",
    "registry_activity_rate",
    "pipe_activity_rate",
    "unique_extensions_written",
    "unique_directories_touched",
    "known_encrypted_ext_count",
    "file_operation_ratio",
    "file_name_entropy",
    "average_file_path_length",
    "suspicious_path_ratio",
    "network_unique_destinations",
]


# ─────────────────────────────────────────────────────────────────────────────
# TERMINAL COLORS (Windows-safe)
# ─────────────────────────────────────────────────────────────────────────────

def _enable_color():
    """Enable ANSI colors on Windows."""
    if sys.platform == "win32":
        import ctypes
        kernel = ctypes.windll.kernel32
        kernel.SetConsoleMode(kernel.GetStdHandle(-11), 7)

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def cprint(msg, color=None, bold=False):
    prefix = (BOLD if bold else "") + (color or "")
    print(f"{prefix}{msg}{RESET}", flush=True)


# ─────────────────────────────────────────────────────────────────────────────
# PER-PROCESS STATE
# ─────────────────────────────────────────────────────────────────────────────

class ProcessState:
    """Tracks EMA score and consecutive alert count for one PID."""

    def __init__(self, pid: int, process_name: str):
        self.pid = pid
        self.process_name = process_name
        self.ema_score: float = 0.0
        self.consecutive_alerts: int = 0
        self.critical_fired: bool = False
        self.alert_reported: bool = False
        self.last_seen: datetime = datetime.now(timezone.utc)

    def update(self, raw_score: float) -> str:
        """Update EMA, return alert level string."""
        self.ema_score = EMA_ALPHA * raw_score + (1 - EMA_ALPHA) * self.ema_score
        self.last_seen = datetime.now(timezone.utc)

        if self.ema_score >= ALERT_THRESHOLD:
            self.consecutive_alerts += 1
        else:
            self.consecutive_alerts = 0

        if self.consecutive_alerts >= CRITICAL_CONSECUTIVE:
            self.critical_fired = True
            return "CRITICAL"
        if self.ema_score >= ALERT_THRESHOLD:
            return "ALERT"
        if self.ema_score >= SUSPICIOUS_THRESHOLD:
            return "SUSPICIOUS"
        return "NORMAL"


# ─────────────────────────────────────────────────────────────────────────────
# CSV LOGGER
# ─────────────────────────────────────────────────────────────────────────────

class CSVLogger:
    def __init__(self, path: str):
        self.path = path
        self._file = open(path, "w", newline="", encoding="utf-8")
        self._writer = csv.DictWriter(
            self._file,
            fieldnames=["timestamp", "pid", "process_name", "ema_score", "level", "label"]
                       + FEATURE_NAMES
        )
        self._writer.writeheader()
        cprint(f"[CSV] Logging to: {os.path.abspath(path)}", CYAN)

    def write(self, timestamp, pid, process_name, features, ema_score, level, label=""):
        row = {
            "timestamp": timestamp.isoformat(),
            "pid": pid,
            "process_name": process_name,
            "ema_score": round(ema_score, 4),
            "level": level,
            "label": label,
        }
        row.update({k: round(v, 4) for k, v in features.items()})
        self._writer.writerow(row)
        self._file.flush()

    def close(self):
        self._file.close()


# ─────────────────────────────────────────────────────────────────────────────
# AGENT
# ─────────────────────────────────────────────────────────────────────────────

class Agent:
    def __init__(
        self,
        csv_path: Optional[str] = None,
        no_model: bool = False,
        mode: Optional[str] = None,
        scenario: Optional[str] = None,
    ):
        self.telemetry_mode = (mode or cfg.TELEMETRY_MODE).lower()
        self.scenario = (scenario or cfg.SIMULATION_SCENARIO).lower()

        # Automatic activation hook: if endpoint ID is not present but activation token is set, activate
        if not cfg.ENDPOINT_ID and cfg.ACTIVATION_TOKEN:
            try:
                from activation import activate_agent
                activate_agent()
            except Exception as e:
                cprint(f"[Agent] Activation attempt failed: {e}", YELLOW)

        # Select provider based on configuration mode
        if self.telemetry_mode == "simulated":
            from telemetry_provider import SimulatedTelemetryProvider
            self.reader = SimulatedTelemetryProvider(scenario=self.scenario)
            cprint(f"[Agent] Telemetry Mode: SIMULATED (Scenario: {self.scenario.upper()})", GREEN)
            from isolation_provider import SimulatedIsolationProvider
            self.isolation_provider = SimulatedIsolationProvider(telemetry_provider=self.reader)
        else:
            from telemetry_provider import WindowsTelemetryProvider
            self.reader = WindowsTelemetryProvider()
            cprint("[Agent] Telemetry Mode: REAL (Windows Event Logs)", GREEN)
            from isolation_provider import WindowsSafeDemoIsolationProvider
            self.isolation_provider = WindowsSafeDemoIsolationProvider()

        self.buffer   = SlidingWindowBuffer(window_size_seconds=WINDOW_SIZE_SECONDS)
        self.extractor = FeatureExtractor()

        # De-duplication: track the highest record_id seen so far
        self._last_record_id: int = 0

        # Per-PID state
        self._process_states: Dict[int, ProcessState] = {}

        # Model
        self.model = None
        if not no_model and os.path.exists(MODEL_PATH):
            self.model = xgb.XGBClassifier()
            self.model.load_model(MODEL_PATH)

            cprint(
                f"[Agent] XGBoost model loaded: {MODEL_PATH}",
                GREEN)

        elif not no_model:
            cprint(
                f"[Agent] WARNING: {MODEL_PATH} not found — "
                "running in feature-only mode",
                YELLOW
            )
        # CSV
        self.csv_logger = CSVLogger(csv_path) if csv_path else None

        # Stats
        self._total_events_seen = 0
        self._total_windows_scored = 0

        # Heartbeat backoff state
        self._heartbeat_backoff_until: float = 0.0
        self._heartbeat_backoff_delay: float = 15.0

    # ── Whitelist check ───────────────────────────────────────────────────────

    @staticmethod
    def _is_whitelisted(process_name: Optional[str]) -> bool:
        if not process_name:
            return False
        return process_name.lower() in WHITELIST

    # ── Feature vector → numpy row ────────────────────────────────────────────

    @staticmethod
    def _to_numpy(features: dict) -> np.ndarray:
        return np.array(
            [[features.get(f, 0.0) for f in FEATURE_NAMES]],
            dtype=np.float32
        )

    # ── Print a feature vector (for debugging / demo) ─────────────────────────

    @staticmethod
    def _print_features(features: dict, pid: int, name: str, score: float, level: str):
        level_color = {
            "CRITICAL":  RED,
            "ALERT":     RED,
            "SUSPICIOUS": YELLOW,
            "NORMAL":    GREEN,
        }.get(level, RESET)

        ts = datetime.now().strftime("%H:%M:%S")
        cprint(f"\n{'─'*60}", CYAN)
        cprint(f"[{ts}]  PID {pid}  {name}  |  score={score:.3f}  [{level}]",
               level_color, bold=(level in ("CRITICAL", "ALERT")))
        cprint(f"{'─'*60}", CYAN)

        # Only print non-zero features to keep output readable
        nonzero = {k: v for k, v in features.items() if v != 0.0}
        if nonzero:
            for k, v in nonzero.items():
                print(f"  {k:<35} {v:.4f}")
        else:
            print("  (all features zero — no activity in window)")

    # ── Poll Sysmon for new events ────────────────────────────────────────────

    def _poll(self) -> int:
        """
        Read new Sysmon events, deduplicate, dispatch to buffer.
        Returns number of new events added.
        """
        raw_events = self.reader.read_latest(MAX_EVENTS_PER_READ)

        # read_latest returns NEWEST first (EvtQueryReverseDirection)
        # Reverse so we process oldest→newest, keeping timestamps monotonic
        raw_events = list(reversed(raw_events))

        new_count = 0
        for event in raw_events:
            record_id = event.get("record_id", 0)

            # Skip events we've already processed
            if record_id <= self._last_record_id:
                continue

            self._last_record_id = max(self._last_record_id, record_id)

            pid = event.get("pid")
            if pid is None:
                continue

            process_name = event.get("process_name") or ""
            if self._is_whitelisted(process_name):
                continue

            self.buffer.add_event(pid, event)
            new_count += 1

        return new_count

    # ── Score one process window ──────────────────────────────────────────────

    def _score_window(self, pid: int, events: list) -> Optional[dict]:
        """
        Extract features and predict for one PID's window.
        Returns result dict or None if window too sparse.
        """
        # Skip windows with very few events — not enough signal
        if len(events) < 3:
            return None

        process_name = events[-1].get("process_name") or f"pid_{pid}"

        features = self.extractor.extract(events)

        # Get or create process state
        if pid not in self._process_states:
            self._process_states[pid] = ProcessState(pid, process_name)
        state = self._process_states[pid]

        # Predict
        if self.model is not None:
            X = self._to_numpy(features)
            raw_score = float(self.model.predict_proba(X)[0][1])
        else:
            # No model: use a simple heuristic for demo
            raw_score = min(
                (features["file_create_count"] / 50.0
                 + features["known_encrypted_ext_count"] / 20.0
                 + features["file_name_entropy"] / 4.0) / 3.0,
                1.0
            )

        level = state.update(raw_score)
        self._total_windows_scored += 1

        return {
            "pid": pid,
            "process_name": process_name,
            "features": features,
            "raw_score": raw_score,
            "ema_score": state.ema_score,
            "level": level,
            "timestamp": datetime.now(timezone.utc),
        }

    # ── Print summary of all active processes ─────────────────────────────────

    def _print_summary(self):
        """One-line status for every tracked process."""
        if not self._process_states:
            return
        ts = datetime.now().strftime("%H:%M:%S")
        print(f"\n[{ts}] Active processes: {len(self._process_states)}")
        for pid, state in sorted(
            self._process_states.items(),
            key=lambda x: x[1].ema_score,
            reverse=True
        )[:10]:  # top 10 by score
            bar_len = int(state.ema_score * 20)
            bar = "█" * bar_len + "░" * (20 - bar_len)
            color = RED if state.ema_score >= ALERT_THRESHOLD else \
                    YELLOW if state.ema_score >= SUSPICIOUS_THRESHOLD else GREEN
            level_tag = f"[{self._process_states[pid].consecutive_alerts}x]" \
                        if state.ema_score >= ALERT_THRESHOLD else ""
            cprint(
                f"  PID {pid:6d}  {state.process_name:<25}  "
                f"{bar}  {state.ema_score:.3f}  {level_tag}",
                color
            )

    # ── Main loop ─────────────────────────────────────────────────────────────

    def run(self):
        _enable_color()
        cprint("\n" + "="*60, CYAN)
        cprint("  RANSOMWARE DETECTION AGENT", CYAN, bold=True)
        cprint(f"  Window: {WINDOW_SIZE_SECONDS}s | Step: {STEP_INTERVAL}s | "
               f"Threshold: {ALERT_THRESHOLD}", CYAN)
        cprint(f"  Model: {'loaded' if self.model else 'NOT LOADED (heuristic mode)'}", CYAN)
        cprint("="*60 + "\n", CYAN)

        step = 0
        try:
            while True:
                step += 1
                t_start = time.monotonic()

                # 1. Read new events
                new_events = self._poll()
                self._total_events_seen += new_events

                # 2. Score every active PID window
                windows = self.buffer.get_all_windows()
                results = []
                for pid, events in windows.items():
                    result = self._score_window(pid, events)
                    if result:
                        results.append(result)

                # 3. Print and log results
                for result in results:
                    level = result["level"]

                    # Always print non-NORMAL results
                    # Print NORMAL only every 5 steps to reduce noise
                    if level != "NORMAL" or step % 5 == 0:
                        self._print_features(
                            result["features"],
                            result["pid"],
                            result["process_name"],
                            result["ema_score"],
                            level,
                        )

                    # CRITICAL alert
                    if level == "CRITICAL":
                        cprint(
                            f"\n{'!'*60}\n"
                            f"  ⚠  CRITICAL ALERT — {result['process_name']} (PID {result['pid']})\n"
                            f"  Score: {result['ema_score']:.3f}  |  "
                            f"{CRITICAL_CONSECUTIVE} consecutive windows above threshold\n"
                            f"{'!'*60}",
                            RED, bold=True
                        )
                        state = self._process_states.get(result["pid"])
                        if state and not state.alert_reported:
                            reported = self._report_ransomware_alert(result["pid"], result["process_name"], result["ema_score"])
                            if reported:
                                state.alert_reported = True
                        elif not state:
                            self._report_ransomware_alert(result["pid"], result["process_name"], result["ema_score"])

                # Send heartbeat every 3 steps (approx. 9-10 seconds)
                if step % 3 == 0:
                    self._send_heartbeat()

                    if self.csv_logger:
                        self.csv_logger.write(
                            timestamp=result["timestamp"],
                            pid=result["pid"],
                            process_name=result["process_name"],
                            features=result["features"],
                            ema_score=result["ema_score"],
                            level=level,
                        )

                # 4. Summary every 5 steps
                if step % 5 == 0:
                    self._print_summary()
                    cprint(
                        f"  [Stats] Events total: {self._total_events_seen} | "
                        f"Windows scored: {self._total_windows_scored} | "
                        f"Tracked PIDs: {self.buffer.process_count()}",
                        CYAN
                    )

                # 5. Sleep for remainder of step interval
                elapsed = time.monotonic() - t_start
                sleep_time = max(0.0, STEP_INTERVAL - elapsed)
                time.sleep(sleep_time)

        except KeyboardInterrupt:
            cprint("\n[Agent] Stopped by user.", YELLOW)
        finally:
            if self.csv_logger:
                self.csv_logger.close()
                cprint(f"[Agent] CSV saved: {self.csv_logger.path}", GREEN)

    def _send_heartbeat(self):
        """Sends CPU, RAM, and Disk usage stats to the backend to keep status ONLINE."""
        if not cfg.ENDPOINT_ID:
            return

        now = time.monotonic()
        if now < self._heartbeat_backoff_until:
            remaining = self._heartbeat_backoff_until - now
            cprint(f"  [Heartbeat] Rate limited (429) previously. Backing off for {remaining:.1f}s...", YELLOW)
            return

        try:
            import requests

            if self.telemetry_mode == "simulated":
                # Strict simulated heartbeat isolation: never inspect host psutil / OS metrics
                import random
                payload = {
                    "cpuUsagePercent": round(random.uniform(10.0, 25.0), 1),
                    "ramUsagePercent": round(random.uniform(35.0, 48.0), 1),
                    "diskUsagePercent": round(random.uniform(28.0, 35.0), 1)
                }
            else:
                # Real agent reads physical host metrics
                import psutil
                payload = {
                    "cpuUsagePercent": round(psutil.cpu_percent(), 1),
                    "ramUsagePercent": round(psutil.virtual_memory().percent, 1),
                    "diskUsagePercent": round(psutil.disk_usage('/').percent, 1)
                }

            headers = {"x-api-key": cfg.BACKEND_API_KEY}

            url = f"{cfg.BACKEND_API_URL}/api/endpoints/{cfg.ENDPOINT_ID}/heartbeat"
            response = requests.post(url, json=payload, headers=headers, timeout=5)

            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    delay = max(5.0, float(retry_after))
                else:
                    delay = self._heartbeat_backoff_delay
                    self._heartbeat_backoff_delay = min(120.0, self._heartbeat_backoff_delay * 2)

                self._heartbeat_backoff_until = now + delay
                cprint(f"  [Heartbeat] Rate limited (429). Backing off for {delay:.0f}s...", YELLOW)
                return

            response.raise_for_status()

            # Successful heartbeat: reset backoff
            self._heartbeat_backoff_delay = 15.0
            self._heartbeat_backoff_until = 0.0

            res_json = response.json()
            status = res_json.get("status")
            pending_actions = res_json.get("pendingActions", [])

            if self.isolation_provider.is_isolated:
                cprint(f"  [Heartbeat] Stats sent. Status: {status} (ENDPOINT ISOLATED)", YELLOW)
            else:
                cprint(f"  [Heartbeat] Stats sent. Status: {status}", GREEN)

            if pending_actions:
                self._process_pending_actions(pending_actions)

        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                delay = self._heartbeat_backoff_delay
                self._heartbeat_backoff_delay = min(120.0, self._heartbeat_backoff_delay * 2)
                self._heartbeat_backoff_until = now + delay
                cprint(f"  [Heartbeat] Rate limited (429). Backing off for {delay:.0f}s...", YELLOW)
            else:
                cprint(f"  [Heartbeat] Failed to send: {e}", YELLOW)
        except Exception as e:
            cprint(f"  [Heartbeat] Failed to send: {e}", YELLOW)

    def _acknowledge_action(self, action_id: str, status: str = "ACKNOWLEDGED", error_msg: Optional[str] = None):
        """Sends an acknowledgment to the backend that an action was received and executed."""
        if not cfg.ENDPOINT_ID:
            return
        try:
            import requests
            url = f"{cfg.BACKEND_API_URL}/api/endpoints/{cfg.ENDPOINT_ID}/actions/{action_id}/ack"
            headers = {"x-api-key": cfg.BACKEND_API_KEY}
            payload = {"status": status}
            if error_msg:
                payload["errorMessage"] = error_msg
            requests.post(url, json=payload, headers=headers, timeout=5)
        except Exception as e:
            cprint(f"  [Action] Failed to send acknowledgment: {e}", YELLOW)

    def _process_pending_actions(self, pending_actions: list):
        """Processes incoming response/isolation actions directed strictly to this endpoint."""
        for action in pending_actions:
            action_id = action.get("actionId")
            endpoint_id = action.get("endpointId")
            action_type = action.get("actionType")
            reason = action.get("reason", "")

            # CRITICAL: Command must strictly match this agent's endpoint ID
            if endpoint_id != cfg.ENDPOINT_ID:
                continue

            if action_type == "ISOLATE":
                if not self.isolation_provider.is_isolated:
                    cprint(f"\n{'='*60}", YELLOW, bold=True)
                    cprint(f"  [ISOLATE] ISOLATION COMMAND RECEIVED FOR THIS ENDPOINT ({cfg.ENDPOINT_ID})", YELLOW, bold=True)
                    cprint(f"  Reason: {reason}", YELLOW)
                    cprint(f"{'='*60}", YELLOW, bold=True)
                    result = self.isolation_provider.isolate(reason=reason)
                    cprint(f"  [Isolation] {result['message']}", GREEN)
                    self._acknowledge_action(action_id, status="ACKNOWLEDGED")
                else:
                    self._acknowledge_action(action_id, status="ACKNOWLEDGED")

            elif action_type == "UNISOLATE":
                if self.isolation_provider.is_isolated:
                    cprint(f"\n{'='*60}", GREEN, bold=True)
                    cprint(f"  [UNISOLATE] UNISOLATE COMMAND RECEIVED FOR THIS ENDPOINT ({cfg.ENDPOINT_ID})", GREEN, bold=True)
                    cprint(f"{'='*60}", GREEN, bold=True)
                    result = self.isolation_provider.release()
                    cprint(f"  [Isolation] {result['message']}", GREEN)
                    self._acknowledge_action(action_id, status="ACKNOWLEDGED")
                else:
                    self._acknowledge_action(action_id, status="ACKNOWLEDGED")

    def _report_ransomware_alert(self, pid: int, process_name: str, score: float) -> bool:
        """Sends a critical ransomware detection alert to the backend."""
        if not cfg.ENDPOINT_ID or not cfg.AUTO_REPORT_DETECTIONS:
            return False

        if self.isolation_provider.is_isolated:
            cprint("  [Detection] Endpoint is currently ISOLATED. Alert reporting suppressed.", YELLOW)
            return False

        try:
            import requests
            now_iso = datetime.now(timezone.utc).isoformat()
            payload = {
                "organizationId": cfg.ORGANIZATION_ID,
                "endpointId": cfg.ENDPOINT_ID,
                "riskScore": int(round(score * 100)),
                "indicators": [
                    {
                        "type": "PROCESS_ANOMALY",
                        "description": f"Ransomware activity detected in process {process_name} (PID {pid})",
                        "observedAt": now_iso
                    },
                    {
                        "type": "EMA_THRESHOLD",
                        "description": f"EMA detection score: {score:.3f}",
                        "observedAt": now_iso
                    },
                    {
                        "type": "TELEMETRY_PATTERN",
                        "description": "Simulated ransomware telemetry indicators detected" if self.telemetry_mode == "simulated" else "Real Sysmon events triggered local XGBoost thresholds",
                        "observedAt": now_iso
                    }
                ],
                "modelVersion": "agent-v0.1"
            }
            headers = {"x-api-key": cfg.BACKEND_API_KEY}
            url = f"{cfg.BACKEND_API_URL}/api/detections/ingest"
            response = requests.post(url, json=payload, headers=headers, timeout=5)
            response.raise_for_status()
            cprint("  [Detection] Alert reported to backend successfully.", GREEN)
            return True
        except Exception as e:
            cprint(f"  [Detection] Failed to report alert to backend: {e}", RED)
            return False


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SentinelIQ Ransomware Detection Agent")
    parser.add_argument(
        "--csv", metavar="PATH",
        help="Save feature vectors to CSV (e.g. --csv output.csv)"
    )
    parser.add_argument(
        "--no-model", action="store_true",
        help="Run in feature-extraction mode without a model"
    )
    parser.add_argument(
        "--env-file", "-e", metavar="PATH",
        help="Path to custom .env file (e.g. --env-file=.env.agent2)"
    )
    parser.add_argument(
        "--mode", choices=["real", "simulated"],
        help="Override TELEMETRY_MODE ('real' or 'simulated')"
    )
    parser.add_argument(
        "--scenario", choices=["normal", "ransomware"],
        help="Override SIMULATION_SCENARIO ('normal' or 'ransomware')"
    )
    args = parser.parse_args()

    agent = Agent(
        csv_path=args.csv,
        no_model=args.no_model,
        mode=args.mode,
        scenario=args.scenario,
    )
    agent.run()


if __name__ == "__main__":
    main()