import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from feature_extractor import extract_features_from_file_event
# pyrefly: ignore [missing-import]
from ml_client import get_prediction, report_detection

RISK_SCORE_ALERT_THRESHOLD = 70


class RansomwareFileHandler(FileSystemEventHandler):
    def _handle_event(self, event_type: str, file_path: str):
        if os.path.isdir(file_path):
            return  # placeholder guard, refined once directory-vs-file distinction matters more

        features = extract_features_from_file_event(file_path, event_type)
        try:
            result = get_prediction(features)
        except Exception as exc:
            print(f"[file_watcher] Failed to get prediction: {exc}")
            return

        print(f"[file_watcher] {event_type.upper()} {file_path} -> risk_score={result['risk_score']}")

        if result["risk_score"] >= RISK_SCORE_ALERT_THRESHOLD:
            print(f"[file_watcher] ALERT: high risk score, reporting detection to backend")
            try:
                report_detection(
                    result["risk_score"],
                    indicators=[
                        {
                            "type": "SUSPICIOUS_FILE_ACTIVITY",
                            "description": f"{event_type} on {file_path} scored {result['risk_score']}/100",
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


def _now_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def start_file_watcher(watch_directory: str):
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