import time
from datetime import datetime, timezone
import psutil
from feature_extractor import extract_features_from_process_event
from ml_client import get_prediction, report_detection
from process_pair_tracker import ProcessPairTracker

RISK_SCORE_ALERT_THRESHOLD = 70
POLL_INTERVAL_SECONDS = 2

tracker = ProcessPairTracker()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def start_process_watcher():
    seen_pids = set(p.pid for p in psutil.process_iter())
    print(f"[process_watcher] Tracking {len(seen_pids)} existing processes, watching for new ones...")

    while True:
        time.sleep(POLL_INTERVAL_SECONDS)
        current_pids = set()

        for proc in psutil.process_iter(["pid", "name", "exe", "ppid"]):
            current_pids.add(proc.pid)
            if proc.pid in seen_pids:
                continue

            try:
                parent = psutil.Process(proc.ppid())
                parent_name = parent.name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                parent_name = ""

            proc_name = proc.info.get("name") or ""
            exe_path = proc.info.get("exe") or ""

            freq_ratio = tracker.get_ratio(parent_name, proc_name)
            pair_count = tracker.pair_count(parent_name, proc_name)

            features = extract_features_from_process_event(
                process_name=proc_name,
                parent_process_name=parent_name,
                exe_path=exe_path,
                freq_ratio=freq_ratio,
            )

            try:
                result = get_prediction(features)
            except Exception as exc:
                print(f"[process_watcher] Failed to get prediction: {exc}")
                continue

            risk_score = result["risk_score"]
            print(f"[process_watcher] NEW PROCESS {proc_name} (parent: {parent_name}, pair seen {pair_count}x, freq_ratio={freq_ratio:.4f}) -> risk_score={risk_score}")

            if risk_score >= RISK_SCORE_ALERT_THRESHOLD:
                print("[process_watcher] ALERT: high risk score, reporting detection to backend")
                try:
                    report_detection(
                        risk_score,
                        indicators=[
                            {
                                "type": "SUSPICIOUS_PROCESS",
                                "description": f"Process {proc_name} (parent: {parent_name}) scored {risk_score}/100",
                                "observedAt": _now_iso(),
                            }
                        ],
                    )
                except Exception as exc:
                    print(f"[process_watcher] Failed to report detection: {exc}")

        seen_pids = current_pids
