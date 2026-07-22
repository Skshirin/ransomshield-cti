import time
import psutil
from feature_extractor import extract_features_from_process_event
# pyrefly: ignore [missing-import]
from ml_client import get_prediction, report_detection

RISK_SCORE_ALERT_THRESHOLD = 70
POLL_INTERVAL_SECONDS = 2


def _now_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def start_process_watcher():
    """
    Polls running processes every few seconds and scores any *new* process
    (one we haven't seen since the agent started) against the model.
    Polling rather than a true event hook is a simplification for this
    skeleton — Sysmon (planned for a later milestone) gives real-time
    process-creation events instead of polling.
    """
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

            features = extract_features_from_process_event(
                process_name=proc.info.get("name") or "",
                parent_process_name=parent_name,
                exe_path=proc.info.get("exe") or "",
            )

            try:
                result = get_prediction(features)
            except Exception as exc:
                print(f"[process_watcher] Failed to get prediction: {exc}")
                continue

            print(f"[process_watcher] NEW PROCESS {proc.info.get('name')} -> risk_score={result['risk_score']}")

            if result["risk_score"] >= RISK_SCORE_ALERT_THRESHOLD:
                print(f"[process_watcher] ALERT: high risk score, reporting detection to backend")
                try:
                    report_detection(
                        result["risk_score"],
                        indicators=[
                            {
                                "type": "SUSPICIOUS_PROCESS",
                                "description": f"Process {proc.info.get('name')} (parent: {parent_name}) scored {result['risk_score']}/100",
                                "observedAt": _now_iso(),
                            }
                        ],
                    )
                except Exception as exc:
                    print(f"[process_watcher] Failed to report detection: {exc}")

        seen_pids = current_pids