import random
import string
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional


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
    """
    Simulated telemetry provider generating isolated synthetic event logs in memory.
    
    STRICT ISOLATION GUARANTEES:
    - Never imports win32evtlog or sysmon_reader
    - Never reads Windows Event Logs
    - Never inspects host processes, filesystem, or network
    - Generates independent synthetic streams per instance
    """

    RANSOM_EXTENSIONS = [".locked", ".encrypted", ".crypt", ".wncry", ".ryk"]
    BENIGN_EXTENSIONS = [".txt", ".docx", ".xlsx", ".json", ".log", ".tmp"]

    def __init__(self, scenario: str = "normal", instance_id: Optional[str] = None):
        self.scenario = scenario.lower()
        self.instance_id = instance_id or f"sim_{random.randint(1000, 9999)}"
        
        # Instance-specific offsets to guarantee distinct event IDs and PIDs across multiple agents
        pid_offset = random.randint(100, 900) * 10
        self._record_id = random.randint(10000, 50000)
        self._benign_pids = [1100 + pid_offset, 2200 + pid_offset, 3300 + pid_offset]
        self._ransom_pid = 9000 + pid_offset
        self._step = 0

    def set_scenario(self, scenario: str):
        """Allows dynamically switching between 'normal' and 'ransomware' scenarios."""
        self.scenario = scenario.lower()

    def _random_entropy_name(self, length: int = 12) -> str:
        """Generates a random high-entropy filename string."""
        return "".join(random.choices(string.ascii_letters + string.digits, k=length))

    def read_latest(self, max_events: int = 100) -> List[Dict[str, Any]]:
        self._step += 1
        events: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        # ── 1. Simulate background benign endpoint activity ───────────────────
        # Always emit a baseline benign file activity event
        self._record_id += 1
        base_pid = self._benign_pids[0]
        ext = random.choice(self.BENIGN_EXTENSIONS)
        events.append({
            "record_id": self._record_id,
            "timestamp": now,
            "event_id": 11,  # File Created
            "pid": base_pid,
            "process_name": "explorer.exe",
            "image": "C:\\Program Files\\SimulatedApp\\explorer.exe",
            "data": {
                "TargetFilename": f"C:\\Users\\StandardUser\\Documents\\notes_{self._record_id}{ext}",
            }
        })

        for pid in self._benign_pids:
            proc_name = "explorer.exe" if pid == self._benign_pids[0] else (
                "chrome.exe" if pid == self._benign_pids[1] else "code.exe"
            )
            img_path = f"C:\\Program Files\\SimulatedApp\\{proc_name}"

            # Benign file creation / modification
            if random.random() < 0.40:
                self._record_id += 1
                ext = random.choice(self.BENIGN_EXTENSIONS)
                events.append({
                    "record_id": self._record_id,
                    "timestamp": now,
                    "event_id": 11,  # File Created
                    "pid": pid,
                    "process_name": proc_name,
                    "image": img_path,
                    "data": {
                        "TargetFilename": f"C:\\Users\\StandardUser\\Documents\\document_{self._record_id}{ext}",
                    }
                })

            # Benign network connection
            if random.random() < 0.30:
                self._record_id += 1
                events.append({
                    "record_id": self._record_id,
                    "timestamp": now,
                    "event_id": 3,  # Network Connection
                    "pid": pid,
                    "process_name": proc_name,
                    "image": img_path,
                    "data": {
                        "DestinationIp": f"10.0.0.{random.randint(2, 250)}",
                        "DestinationHostname": "internal-service.local",
                    }
                })

            # Benign DNS query
            if random.random() < 0.25:
                self._record_id += 1
                events.append({
                    "record_id": self._record_id,
                    "timestamp": now,
                    "event_id": 22,  # DNS Query
                    "pid": pid,
                    "process_name": proc_name,
                    "image": img_path,
                    "data": {
                        "QueryName": "api.sentineliq-simulated.io",
                    }
                })

        # ── 2. Simulate ransomware burst when scenario is active ───────────────
        if self.scenario == "ransomware":
            # Generate mass file encryption patterns purely in memory:
            # - Event ID 11 (File Create) with suspicious extensions and high entropy
            # - Event ID 2 (File Creation Time Changed / timestomp)
            # - Multiple target subdirectories to trigger directory sweep features
            subdirs = ["Documents", "Desktop", "AppData\\Local\\Temp", "Downloads"]
            
            for _ in range(25):
                self._record_id += 1
                ext = random.choice(self.RANSOM_EXTENSIONS)
                rand_entropy = self._random_entropy_name(14)
                target_dir = random.choice(subdirs)
                filepath = f"C:\\Users\\StandardUser\\{target_dir}\\financial_{self._record_id}_{rand_entropy}{ext}"

                events.append({
                    "record_id": self._record_id,
                    "timestamp": now,
                    "event_id": 11,  # File Created
                    "pid": self._ransom_pid,
                    "process_name": "ransomware_demo.exe",
                    "image": "C:\\Users\\StandardUser\\AppData\\Local\\Temp\\ransomware_demo.exe",
                    "data": {
                        "TargetFilename": filepath,
                    }
                })

                if random.random() < 0.5:
                    self._record_id += 1
                    events.append({
                        "record_id": self._record_id,
                        "timestamp": now,
                        "event_id": 2,  # File creation time changed
                        "pid": self._ransom_pid,
                        "process_name": "ransomware_demo.exe",
                        "image": "C:\\Users\\StandardUser\\AppData\\Local\\Temp\\ransomware_demo.exe",
                        "data": {
                            "TargetFilename": filepath,
                        }
                    })

        return events
