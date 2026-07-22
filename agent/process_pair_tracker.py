import threading


class ProcessPairTracker:
    """
    Tracks how many times each (parent_process_name, child_process_name)
    pair has been observed since the agent started. Used to compute a real
    process_vs_parent_freq_ratio: common, repeated parent-child relationships
    (e.g. explorer.exe -> chrome.exe happening constantly) should trend
    toward a small ratio, while a pairing seen for the first time gets a
    higher ratio, since the system has no history to judge it as "normal" yet.

    This is a live analogue of the dataset's original feature (whose exact
    formula referenced a raw log corpus we do not have access to) - it is
    not a byte-for-byte reproduction, but is a real, honestly-computed
    signal with the same intended meaning and the same general shape.
    """

    def __init__(self):
        self._counts = {}
        self._lock = threading.Lock()

    def get_ratio(self, parent_name: str, child_name: str) -> float:
        key = (parent_name.lower(), child_name.lower())
        with self._lock:
            self._counts[key] = self._counts.get(key, 0) + 1
            count = self._counts[key]
        return 1.0 / count

    def pair_count(self, parent_name: str, child_name: str) -> int:
        key = (parent_name.lower(), child_name.lower())
        with self._lock:
            return self._counts.get(key, 0)
