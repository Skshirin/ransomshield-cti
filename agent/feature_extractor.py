from collections import Counter
import math
import os
from typing import List, Dict, Any


class FeatureExtractor:
    """
    Extract ransomware-behavior features from ONE process's
    sliding-window Sysmon events.
    """

    SUSPICIOUS_EXTENSIONS = {
        ".locked",
        ".encrypted",
        ".enc",
        ".crypt",
        ".crypted",
        ".lock",
        ".wncry",
        ".wncryt",
        ".ryk",
        ".revil",
    }

    SUSPICIOUS_PATHS = (
        "\\temp\\",
        "\\appdata\\",
        "\\downloads\\",
        "\\desktop\\",
        "\\documents\\",
    )

    def __init__(self):
        pass

    # =========================================================
    # Utility functions
    # =========================================================

    @staticmethod
    def _get_data(event: Dict[str, Any]) -> Dict[str, Any]:
        return event.get("data", {})

    @staticmethod
    def _get_event_id(event: Dict[str, Any]) -> int:

        try:
            return int(event.get("event_id", -1))
        except (TypeError, ValueError):
            return -1

    @staticmethod
    def _get_image(event: Dict[str, Any]) -> str:

        image = event.get("image")

        if image:
            return str(image)

        data = event.get("data", {})

        return str(
            data.get("Image") or ""
        )

    @staticmethod
    def _safe_ratio(
        numerator: float,
        denominator: float
    ) -> float:

        if denominator == 0:
            return 0.0

        return numerator / denominator

    # =========================================================
    # File path extraction
    # =========================================================

    def _get_file_path(
        self,
        event: Dict[str, Any]
    ) -> str:

        data = self._get_data(event)

        possible_fields = (
            "TargetFilename",
            "TargetObject",
            "FileName",
            "Image",
        )

        for field in possible_fields:

            value = data.get(field)

            if value:
                return str(value)

        return ""

    # =========================================================
    # Filename entropy
    # =========================================================

    @staticmethod
    def _entropy(text: str) -> float:

        if not text:
            return 0.0

        counts = Counter(text)

        total = len(text)

        return -sum(
            (count / total)
            * math.log2(count / total)
            for count in counts.values()
        )

    # =========================================================
    # Main feature extraction
    # =========================================================

    def extract(
        self,
        events: List[Dict[str, Any]]
    ) -> Dict[str, float]:

        # -----------------------------------------------------
        # Empty window
        # -----------------------------------------------------

        if not events:
            return self._empty_features()

        # -----------------------------------------------------
        # Count Sysmon event IDs
        #
        # 1  = Process Create
        # 2  = File creation time changed
        # 3  = Network connection
        # 5  = Process terminated
        # 11 = File created
        # 13 = Registry value set
        # 17 = Named pipe created
        # 22 = DNS query
        #
        # Event 23 is intentionally NOT used because your
        # current Sysmon configuration does not produce it.
        # -----------------------------------------------------

        event_counts = Counter(
            self._get_event_id(event)
            for event in events
        )

        process_create_count = event_counts[1]

        file_creation_time_changed = event_counts[2]

        network_connection_count = event_counts[3]

        process_terminated_count = event_counts[5]

        file_create_count = event_counts[11]

        registry_write_count = event_counts[13]

        pipe_create_count = event_counts[17]

        dns_query_count = event_counts[22]

        # -----------------------------------------------------
        # Process activity
        # -----------------------------------------------------

        process_activity = (
            process_create_count
            + process_terminated_count
        )

        # -----------------------------------------------------
        # File activity
        # -----------------------------------------------------

        file_activity = (
            file_create_count
            + file_creation_time_changed
        )

        # -----------------------------------------------------
        # Paths
        # -----------------------------------------------------

        file_paths = []

        process_paths = []

        for event in events:

            event_id = self._get_event_id(event)

            if event_id in {2, 11}:

                path = self._get_file_path(event)

                if path:
                    file_paths.append(path)

            image = self._get_image(event)

            if image:
                process_paths.append(image)

        # -----------------------------------------------------
        # Unique extensions written
        # -----------------------------------------------------

        extensions = set()

        for path in file_paths:

            extension = os.path.splitext(
                path
            )[1].lower()

            if extension:
                extensions.add(extension)

        unique_extensions_written = len(
            extensions
        )

        # -----------------------------------------------------
        # Suspicious/user-data paths
        # -----------------------------------------------------

        suspicious_path_count = 0

        for path in file_paths:

            lower_path = path.lower()

            if any(
                location in lower_path
                for location in self.SUSPICIOUS_PATHS
            ):
                suspicious_path_count += 1

        suspicious_path_ratio = self._safe_ratio(
            suspicious_path_count,
            max(len(file_paths), 1)
        )

        # -----------------------------------------------------
        # Known encrypted extensions
        # -----------------------------------------------------

        known_encrypted_ext_count = 0

        for path in file_paths:

            extension = os.path.splitext(
                path
            )[1].lower()

            if extension in self.SUSPICIOUS_EXTENSIONS:
                known_encrypted_ext_count += 1

        # -----------------------------------------------------
        # 10-second window rates
        # -----------------------------------------------------

        WINDOW_SECONDS = 10.0

        file_activity_rate = (
            file_activity
            / WINDOW_SECONDS
        )

        process_activity_rate = (
            process_activity
            / WINDOW_SECONDS
        )

        network_activity_rate = (
            network_connection_count
            / WINDOW_SECONDS
        )

        registry_activity_rate = (
            registry_write_count
            / WINDOW_SECONDS
        )

        pipe_activity_rate = (
            pipe_create_count
            / WINDOW_SECONDS
        )

        # -----------------------------------------------------
        # Network destinations
        # -----------------------------------------------------

        destinations = set()

        for event in events:

            if self._get_event_id(event) != 3:
                continue

            data = self._get_data(event)

            destination_ip = data.get(
                "DestinationIp"
            )

            destination_host = data.get(
                "DestinationHostname"
            )

            destination = (
                destination_ip
                or destination_host
            )

            if destination:

                destinations.add(
                    str(destination).lower()
                )

        network_unique_destinations = len(
            destinations
        )

        # -----------------------------------------------------
        # Filename entropy
        # -----------------------------------------------------

        filename_entropies = []

        for path in file_paths:

            filename = os.path.basename(path)

            if filename:

                filename_entropies.append(
                    self._entropy(filename)
                )

        if filename_entropies:

            file_name_entropy = (
                sum(filename_entropies)
                / len(filename_entropies)
            )

        else:

            file_name_entropy = 0.0

        # -----------------------------------------------------
        # Average file path length
        # -----------------------------------------------------

        if file_paths:

            average_file_path_length = (
                sum(len(path) for path in file_paths)
                / len(file_paths)
            )

        else:

            average_file_path_length = 0.0

        # -----------------------------------------------------
        # Unique directories touched
        # -----------------------------------------------------

        directories = set()

        for path in file_paths:

            directory = os.path.dirname(
                path
            ).lower()

            if directory:
                directories.add(directory)

        unique_directories_touched = len(
            directories
        )

        # -----------------------------------------------------
        # File-operation burst ratio
        # -----------------------------------------------------

        file_operation_ratio = self._safe_ratio(
            file_activity,
            len(events)
        )

        # =====================================================
        # FINAL FEATURE VECTOR
        # =====================================================

        return {

            # Process behavior
            "process_create_count":
                float(process_create_count),

            "process_terminated_count":
                float(process_terminated_count),

            # File behavior
            "file_create_count":
                float(file_create_count),

            "file_creation_time_changed":
                float(file_creation_time_changed),

            # Registry / IPC
            "registry_write_count":
                float(registry_write_count),

            "pipe_create_count":
                float(pipe_create_count),

            # Network
            "network_connection_count":
                float(network_connection_count),

            "dns_query_count":
                float(dns_query_count),

            # Activity rates
            "file_activity_rate":
                float(file_activity_rate),

            "process_activity_rate":
                float(process_activity_rate),

            "network_activity_rate":
                float(network_activity_rate),

            "registry_activity_rate":
                float(registry_activity_rate),

            "pipe_activity_rate":
                float(pipe_activity_rate),

            # File characteristics
            "unique_extensions_written":
                float(unique_extensions_written),

            "unique_directories_touched":
                float(unique_directories_touched),

            "known_encrypted_ext_count":
                float(known_encrypted_ext_count),

            "file_operation_ratio":
                float(file_operation_ratio),

            "file_name_entropy":
                float(file_name_entropy),

            "average_file_path_length":
                float(average_file_path_length),

            # Path behavior
            "suspicious_path_ratio":
                float(suspicious_path_ratio),

            # Network behavior
            "network_unique_destinations":
                float(network_unique_destinations),
        }

    # =========================================================
    # Empty feature vector
    # =========================================================

    @staticmethod
    def _empty_features():

        return {

            "process_create_count": 0.0,
            "process_terminated_count": 0.0,

            "file_create_count": 0.0,
            "file_creation_time_changed": 0.0,

            "registry_write_count": 0.0,
            "pipe_create_count": 0.0,

            "network_connection_count": 0.0,
            "dns_query_count": 0.0,

            "file_activity_rate": 0.0,
            "process_activity_rate": 0.0,
            "network_activity_rate": 0.0,
            "registry_activity_rate": 0.0,
            "pipe_activity_rate": 0.0,

            "unique_extensions_written": 0.0,
            "unique_directories_touched": 0.0,

            "known_encrypted_ext_count": 0.0,

            "file_operation_ratio": 0.0,

            "file_name_entropy": 0.0,

            "average_file_path_length": 0.0,

            "suspicious_path_ratio": 0.0,

            "network_unique_destinations": 0.0,
        }