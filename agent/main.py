import threading
from config import WATCH_DIRECTORY
from file_watcher import start_file_watcher
from process_watcher import start_process_watcher


def main():
    print("[agent] Starting Ransomware Detection Agent...")

    file_thread = threading.Thread(target=start_file_watcher, args=(WATCH_DIRECTORY,), daemon=True)
    file_thread.start()

    start_process_watcher()


if __name__ == "__main__":
    main()
