import random
from datetime import datetime, timezone
from typing import List, Dict, Any


class TelemetryProvider:
    """Abstract base class for telemetry collection."""

    def read_latest(self, max_events: int = 100) -> List[Dict[str, Any]]:
        raise NotImplementedError("read_latest must be implemented by subclasses")


class WindowsTelemetryProvider(TelemetryProvider):
    """Real telemetry provider reading actual Sysmon event logs from Windows."""

    def __init__(self):
        # Lazy import of SysmonReader to ensure simulated endpoints do not load win32evtlog
        from sysmon_reader import SysmonReader
        self.reader = SysmonReader()

    def read_latest(self, max_events: int = 100) -> List[Dict[str, Any]]:
        return self.reader.read_latest(max_events)


class SimulatedTelemetryProvider(TelemetryProvider):
    """Simulated telemetry provider generating isolated synthetic event logs in memory."""

    def __init__(self, scenario: str = "normal"):
        self.scenario = scenario
        self._record_id = 20000
        self._benign_pids = [1122, 3344, 5566]
        self._ransom_pid = 9999
        self._step = 0

    def read_latest(self, max_events: int = 100) -> List[Dict[str, Any]]:
        self._step += 1
        events = []

        # 1. Simulate standard background process activity (benign noise)
        for pid in self._benign_pids:
            # Randomly generate benign file creates or network events
            if random.random() < 0.3:
                self._record_id += 1
                proc_name = "explorer.exe" if pid == 1122 else "chrome.exe"
                img_path = "C:\\Windows\\explorer.exe" if pid == 1122 else "C:\\Program Files\\Chrome\\chrome.exe"
                events.append({
                    "record_id": self._record_id,
                    "timestamp": datetime.now(timezone.utc),
                    "event_id": 11,  # File Created
                    "pid": pid,
                    "process_name": proc_name,
                    "image": img_path,
                    "data": {
                        "TargetFilename": f"C:\\Users\\Public\\Documents\\file_{self._record_id}.tmp",
                    }
                })

            if random.random() < 0.15:
                self._record_id += 1
                proc_name = "chrome.exe" if pid != 1122 else "explorer.exe"
                events.append({
                    "record_id": self._record_id,
                    "timestamp": datetime.now(timezone.utc),
                    "event_id": 3,  # Network Connection
                    "pid": pid,
                    "process_name": proc_name,
                    "image": f"C:\\Path\\to\\{proc_name}",
                    "data": {
                        "DestinationIp": f"192.168.1.{random.randint(2, 254)}",
                        "DestinationHostname": "benign-external-host.com"
                    }
                })

        # 2. Simulate ransomware-like telemetry if the ransomware scenario is selected
        if self.scenario == "ransomware":
            # Generate 20 high-frequency file creation events with suspicious extensions and high entropy
            # in each poll interval to trigger the feature extractor thresholds.
            for _ in range(20):
                self._record_id += 1
                high_entropy_name = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=10))
                filepath = f"C:\\Users\\Public\\Documents\\important_doc_{self._record_id}_{high_entropy_name}.locked"

                events.append({
                    "record_id": self._record_id,
                    "timestamp": datetime.now(timezone.utc),
                    "event_id": 11,  # File Created
                    "pid": self._ransom_pid,
                    "process_name": "ransomware_demo.exe",
                    "image": "C:\\Users\\Public\\Downloads\\ransomware_demo.exe",
                    "data": {
                        "TargetFilename": filepath,
                    }
                })

                if random.random() < 0.4:
                    self._record_id += 1
                    events.append({
                        "record_id": self._record_id,
                        "timestamp": datetime.now(timezone.utc),
                        "event_id": 2,  # File creation time changed
                        "pid": self._ransom_pid,
                        "process_name": "ransomware_demo.exe",
                        "image": "C:\\Users\\Public\\Downloads\\ransomware_demo.exe",
                        "data": {
                            "TargetFilename": filepath,
                        }
                    })

        return events
