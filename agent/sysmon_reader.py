import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import win32evtlog


SYSLOG_NAME = "Microsoft-Windows-Sysmon/Operational"

NS = {
    "e": "http://schemas.microsoft.com/win/2004/08/events/event"
}


class SysmonReader:
    """
    Reads Sysmon events and converts them into a normalized Python dictionary.

    Output format:

    {
        "record_id": 12345,
        "timestamp": datetime(...),
        "event_id": 11,
        "pid": 4820,
        "process_name": "python.exe",
        "image": "C:\\Python\\python.exe",
        "data": {...}
    }
    """

    def __init__(self, log_name: str = SYSLOG_NAME):
        self.log_name = log_name

    def _parse_event(self, event) -> Optional[Dict[str, Any]]:
        try:
            xml = win32evtlog.EvtRender(
                event,
                win32evtlog.EvtRenderEventXml
            )

            root = ET.fromstring(xml)

            # -----------------------------
            # System information
            # -----------------------------

            record_id_node = root.find(
                ".//e:EventRecordID",
                NS
            )

            event_id_node = root.find(
                ".//e:EventID",
                NS
            )

            time_node = root.find(
                ".//e:TimeCreated",
                NS
            )

            if record_id_node is None or event_id_node is None:
                return None

            record_id = int(record_id_node.text)
            event_id = int(event_id_node.text)

            timestamp = datetime.now(timezone.utc)

            if time_node is not None:
                system_time = time_node.attrib.get("SystemTime")

                if system_time:
                    timestamp = datetime.fromisoformat(
                        system_time.replace("Z", "+00:00")
                    )

            # -----------------------------
            # EventData
            # -----------------------------

            data = {}

            for node in root.findall(
                ".//e:EventData/e:Data",
                NS
            ):
                name = node.attrib.get("Name")

                if not name:
                    continue

                data[name] = node.text

            # -----------------------------
            # Extract PID
            # -----------------------------

            pid = self._extract_pid(data)

            # -----------------------------
            # Extract process information
            # -----------------------------

            process_name = self._extract_process_name(data)

            image = data.get("Image")

            return {
                "record_id": record_id,
                "timestamp": timestamp,
                "event_id": event_id,
                "pid": pid,
                "process_name": process_name,
                "image": image,
                "data": data,
            }

        except Exception as e:
            print(f"[SysmonReader] Failed to parse event: {e}")
            return None

    @staticmethod
    def _extract_pid(data: Dict[str, Any]) -> Optional[int]:
        """
        Sysmon commonly exposes ProcessId as a decimal or hexadecimal value.
        """

        value = data.get("ProcessId")

        if value is None:
            return None

        try:
            # Decimal
            return int(value)

        except ValueError:
            try:
                # Hexadecimal
                return int(value, 16)

            except ValueError:
                return None

    @staticmethod
    def _extract_process_name(
        data: Dict[str, Any]
    ) -> Optional[str]:

        image = data.get("Image")

        if image:
            return image.split("\\")[-1]

        process_name = data.get("ProcessName")

        if process_name:
            return process_name

        return None

    def read_latest(self, max_events: int = 100):
        """
        Read the latest Sysmon events.

        Returns:
            list[dict]
        """

        handle = win32evtlog.EvtQuery(
            self.log_name,
            win32evtlog.EvtQueryReverseDirection,
            "*"
        )

        try:
            events = win32evtlog.EvtNext(
                handle,
                min(int(max_events), 64)
            )
        except pywintypes.error as e:
            if e.winerror == 1734:
                print("[SysmonReader] EvtNext buffer error; retrying with 1 event")
                try:
                    events = win32evtlog.EvtNext(handle, 1)
                except pywintypes.error:
                    events = []
            else:
                raise

        results = []

        for event in events:
            parsed = self._parse_event(event)

            if parsed is not None:
                results.append(parsed)

        return results