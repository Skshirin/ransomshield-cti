"""
Computes the same 19 behavioural features the ML model was trained on,
from a real file-system event or process-creation event observed on the
Windows machine. Mirrors the feature definitions used when the training
dataset was built, so the numbers we send to /predict mean the same thing
the model learned from.
"""
import math
import os
from collections import Counter

SUSPICIOUS_PATH_MARKERS = ["\\temp\\", "\\appdata\\local\\temp\\", "\\downloads\\"]
SYSTEM_EXECUTABLE_NAMES = {"svchost.exe", "explorer.exe", "winword.exe", "cmd.exe", "powershell.exe"}


def _file_name_entropy(filename: str) -> float:
    """Shannon entropy of a filename's characters — ransomware-renamed
    files (random-looking extensions/names) tend to have higher entropy
    than normal filenames."""
    if not filename:
        return 0.0
    counts = Counter(filename)
    length = len(filename)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())


def extract_features_from_file_event(file_path: str, event_type: str, process_name: str = "",
                                      parent_process_name: str = "") -> dict:
    path_lower = file_path.lower()
    filename = os.path.basename(file_path)

    return {
        "File_Delete_archived": 1 if event_type == "deleted" else 0,
        "File_created": 1 if event_type == "created" else 0,
        "File_creation_time_changed": 1 if event_type == "modified" else 0,
        "Pipe_Created": 0,
        "Process_Create": 0,
        "Registry_value_set": 0,
        "process-related": 1 if process_name else 0,
        "network-related": 0,
        "file-related": 1,
        "suspicious_path": 1 if any(marker in path_lower for marker in SUSPICIOUS_PATH_MARKERS) else 0,
        "system_executable": 1 if process_name.lower() in SYSTEM_EXECUTABLE_NAMES else 0,
        "path_length": len(file_path),
        "directory_depth": file_path.count(os.sep),
        "process_name_length": len(process_name),
        "process_vs_parent_freq_ratio": 0.1,  # placeholder — needs real process-frequency tracking, see note below
        "executable_depth_diff": file_path.count(os.sep),
        "parent_is_system_executable": 1 if parent_process_name.lower() in SYSTEM_EXECUTABLE_NAMES else 0,
        "extension_similarity": 0,
        "file_name_entropy": _file_name_entropy(filename),
    }


def extract_features_from_process_event(process_name: str, parent_process_name: str, exe_path: str = "") -> dict:
    path_lower = exe_path.lower() if exe_path else ""

    return {
        "File_Delete_archived": 0,
        "File_created": 0,
        "File_creation_time_changed": 0,
        "Pipe_Created": 0,
        "Process_Create": 1,
        "Registry_value_set": 0,
        "process-related": 1,
        "network-related": 0,
        "file-related": 0,
        "suspicious_path": 1 if any(marker in path_lower for marker in SUSPICIOUS_PATH_MARKERS) else 0,
        "system_executable": 1 if process_name.lower() in SYSTEM_EXECUTABLE_NAMES else 0,
        "path_length": len(exe_path),
        "directory_depth": exe_path.count(os.sep) if exe_path else 0,
        "process_name_length": len(process_name),
        "process_vs_parent_freq_ratio": 0.1,  # placeholder, see note below
        "executable_depth_diff": exe_path.count(os.sep) if exe_path else 0,
        "parent_is_system_executable": 1 if parent_process_name.lower() in SYSTEM_EXECUTABLE_NAMES else 0,
        "extension_similarity": 0,
        "file_name_entropy": _file_name_entropy(process_name),
    }