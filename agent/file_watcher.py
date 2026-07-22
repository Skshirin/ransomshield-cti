import time
from datetime import datetime, timezone
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from feature_extractor import extract_features_from_file_event
from ml_client import get_prediction, report_detection

RISK_SCORE_ALERT_THRESHOLD = 70


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


class RansomwareFileHandler(FileSystemEventHandler):
    def _handle_event(self, event_type, file_path):
        features = extract_features_from_file_event(file_path, event_type)
        try:
            result = get_prediction(features)
        except Exception as exc:
            print(f"[file_watcher] Failed to get prediction: {exc}")
            return

        risk_score = result["risk_score"]
        print(f"[file_watcher] {event_type.upper()} {file_path} -> risk_score={risk_score}")

        if risk_score >= RISK_SCORE_ALERT_THRESHOLD:
            print("[file_watcher] ALERT: high risk score, reporting detection to backend")
            try:
                report_detection(
                    risk_score,
                    indicators=[
                        {
                            "type": "SUSPICIOUS_FILE_ACTIVITY",
                            "description": f"{event_type} on {file_path} scored {risk_score}/100",
                            "observedAt": _now_iso(),
                        }
                    ],
                )
            except Exception as exc:
                print(f"[file_watcher] Failed to report detection: {exc}")

    def on_created(self, event):
        if not event.is_directory:
            self._handle_event("created", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self._handle_event("deleted", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self._handle_event("modified", event.src_path)


def start_file_watcher(watch_directory):
    event_handler = RansomwareFileHandler()
    observer = Observer()
    observer.schedule(event_handler, watch_directory, recursive=True)
    observer.start()
    print(f"[file_watcher] Watching {watch_directory} for changes...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
