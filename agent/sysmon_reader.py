"""
Reads Sysmon events directly from the Windows Event Log
(Microsoft-Windows-Sysmon/Operational channel) using pywin32's Vista+
Event Log API (EvtQuery/EvtNext/EvtRender). This replaces the old
watchdog (file) + psutil (process polling) approach with real,
event-driven telemetry that includes true process attribution -
something a plain filesystem watcher can never provide, since it has no
knowledge of which process performed a file operation.

Requires the agent to run with Administrator privileges (or as a member
of the "Event Log Readers" local group) to read this channel.
"""
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import win32evtlog

from feature_extractor import (
    extract_features_from_process_event,
    extract_features_from_file_event,
    extract_features_from_registry_event,
)
from ml_client import get_prediction, report_detection
from process_pair_tracker import ProcessPairTracker
from config import AUTO_REPORT_DETECTIONS

CHANNEL = "Microsoft-Windows-Sysmon/Operational"
POLL_INTERVAL_SECONDS = 2
RISK_SCORE_ALERT_THRESHOLD = 70

# XML namespace used by all Windows Event Log XML - required to correctly
# find elements with ElementTree, since Sysmon events aren't in the default
# (no-namespace) XML namespace.
NS = {"e": "http://schemas.microsoft.com/win/2004/08/events/event"}

tracker = ProcessPairTracker()

# ProcessId -> {"image": str, "parent_image": str, "freq_ratio": float}
# Populated on every ProcessCreate (Event 1) event, so that later File
# Create (11) and Registry (13) events - which only carry a ProcessId, not
# the full parent chain - can be correctly attributed back to the process
# that caused them.
process_context = {}


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _parse_event_xml(xml_str):
    """Extracts EventID and all <Data Name="..."> key/value pairs from a
    raw Sysmon event XML string into a plain dict."""
    root = ET.fromstring(xml_str)
    system = root.find("e:System", NS)
    event_id = int(system.find("e:EventID", NS).text)

    data = {}
    event_data = root.find("e:EventData", NS)
    if event_data is not None:
        for item in event_data.findall("e:Data", NS):
            name = item.get("Name")
            data[name] = item.text or ""

    return event_id, data


def _handle_process_create(data):
    image = data.get("Image", "")
    parent_image = data.get("ParentImage", "")
    process_id = data.get("ProcessId", "")
    command_line = data.get("CommandLine", "")

    image_name = image.split("\\")[-1] if image else ""
    parent_name = parent_image.split("\\")[-1] if parent_image else ""

    freq_ratio = tracker.get_ratio(parent_name, image_name)

    # Remember this process's context so later file/registry events from
    # the same ProcessId can be attributed correctly.
    process_context[process_id] = {
        "image": image_name,
        "exe_path": image,
        "parent_image": parent_name,
        "freq_ratio": freq_ratio,
    }

    features = extract_features_from_process_event(
        process_name=image_name,
        parent_process_name=parent_name,
        exe_path=image,
        freq_ratio=freq_ratio,
    )

    _score_and_report(
        features,
        f"PROCESS_CREATE {image_name} (parent: {parent_name}, cmdline: {command_line[:80]})",
        "SUSPICIOUS_PROCESS",
        f"Process {image_name} (parent: {parent_name}) launched with command line: {command_line[:200]}",
    )


def _handle_file_create(data):
    target_filename = data.get("TargetFilename", "")
    process_id = data.get("ProcessId", "")
    image = data.get("Image", "")

    context = process_context.get(process_id, {})
    process_name = context.get("image") or (image.split("\\")[-1] if image else "")
    parent_name = context.get("parent_image", "")
    freq_ratio = context.get("freq_ratio", 0.5)  # neutral default if process wasn't seen at startup

    features = extract_features_from_file_event(
        file_path=target_filename,
        event_type="created",
        process_name=process_name,
        parent_process_name=parent_name,
        freq_ratio=freq_ratio,
    )

    _score_and_report(
        features,
        f"FILE_CREATE {target_filename} (by: {process_name})",
        "SUSPICIOUS_FILE_ACTIVITY",
        f"File created: {target_filename} (by process: {process_name})",
    )


def _handle_registry_event(data):
    target_object = data.get("TargetObject", "")
    image = data.get("Image", "")
    process_id = data.get("ProcessId", "")

    context = process_context.get(process_id, {})
    process_name = context.get("image") or (image.split("\\")[-1] if image else "")
    parent_name = context.get("parent_image", "")
    freq_ratio = context.get("freq_ratio", 0.5)

    features = extract_features_from_registry_event(
        target_object=target_object,
        process_name=process_name,
        parent_process_name=parent_name,
        freq_ratio=freq_ratio,
    )

    _score_and_report(
        features,
        f"REGISTRY_SET {target_object} (by: {process_name})",
        "SUSPICIOUS_REGISTRY_CHANGE",
        f"Registry value set: {target_object} (by process: {process_name})",
    )


def _score_and_report(features, log_label, indicator_type, description):
    try:
        result = get_prediction(features)
    except Exception as exc:
        print(f"[sysmon_reader] Failed to get prediction: {exc}")
        return

    risk_score = result["risk_score"]
    print(f"[sysmon_reader] {log_label} -> risk_score={risk_score}")

    if risk_score >= RISK_SCORE_ALERT_THRESHOLD:
        if not AUTO_REPORT_DETECTIONS:
            print("[sysmon_reader] High risk score (auto-report disabled, see config.py)")
            return
        print("[sysmon_reader] ALERT: high risk score, reporting detection to backend")
        try:
            report_detection(
                risk_score,
                indicators=[{"type": indicator_type, "description": description, "observedAt": _now_iso()}],
            )
        except Exception as exc:
            print(f"[sysmon_reader] Failed to report detection: {exc}")


def start_sysmon_reader():
    print(f"[sysmon_reader] Starting Sysmon event reader on channel: {CHANNEL}")

    last_time_iso = datetime.now(timezone.utc).isoformat()

    while True:
        time.sleep(POLL_INTERVAL_SECONDS)

        query = "*"
        try:
            flags = win32evtlog.EvtQueryChannelPath | win32evtlog.EvtQueryForwardDirection
            handle = win32evtlog.EvtQuery(CHANNEL, flags, query)
        except Exception as exc:
            print(f"[sysmon_reader] Failed to query event log: {exc}")
            print("[sysmon_reader] Is Sysmon installed and is this process running as Administrator?")
            time.sleep(5)
            continue

        while True:
            try:
                events = win32evtlog.EvtNext(handle, 50)
            except Exception:
                break  # no more events available right now

            if not events:
                break

            for event in events:
                xml_str = win32evtlog.EvtRender(event, win32evtlog.EvtRenderEventXml)
                try:
                    event_id, data = _parse_event_xml(xml_str)
                except Exception as exc:
                    print(f"[sysmon_reader] Failed to parse event XML: {exc}")
                    continue

                if event_id == 1:
                    _handle_process_create(data)
                elif event_id == 11:
                    _handle_file_create(data)
                elif event_id == 13:
                    _handle_registry_event(data)

                last_time_iso = datetime.now(timezone.utc).isoformat()