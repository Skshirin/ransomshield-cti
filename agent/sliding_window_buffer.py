from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class SlidingWindowBuffer:
    """
    Maintains an independent sliding window for every PID.

    Window:
        10 seconds

    Events are automatically removed when they
    become older than the configured window size.
    """

    def __init__(self, window_size_seconds: int = 10):

        self.window_size = timedelta(
            seconds=window_size_seconds
        )

        # PID -> deque of events
        self.buffers: Dict[int, deque] = defaultdict(deque)

    def add_event(
        self,
        pid: int,
        event: dict
    ) -> None:

        if pid is None:
            return

        self.buffers[pid].append(event)

        self._evict_old_events(pid)

    def _evict_old_events(
        self,
        pid: int
    ) -> None:

        buffer = self.buffers.get(pid)

        if not buffer:
            return

        newest_event = buffer[-1]

        newest_timestamp = newest_event["timestamp"]

        cutoff = newest_timestamp - self.window_size

        while buffer:

            oldest_event = buffer[0]

            if oldest_event["timestamp"] >= cutoff:
                break

            buffer.popleft()

    def get_window(
        self,
        pid: int
    ) -> List[dict]:

        buffer = self.buffers.get(pid)

        if not buffer:
            return []

        self._evict_old_events(pid)

        return list(buffer)

    def get_all_windows(
        self
    ) -> Dict[int, List[dict]]:

        result = {}

        for pid in list(self.buffers.keys()):

            window = self.get_window(pid)

            if window:
                result[pid] = window

        return result

    def remove_process(
        self,
        pid: int
    ) -> None:

        self.buffers.pop(pid, None)

    def process_count(self) -> int:

        return len(self.buffers)

    def event_count(
        self,
        pid: Optional[int] = None
    ) -> int:

        if pid is not None:
            return len(
                self.buffers.get(pid, [])
            )

        return sum(
            len(buffer)
            for buffer in self.buffers.values()
        )