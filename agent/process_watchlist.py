import os
from typing import Optional


class ProcessWatchlist:

    # -----------------------------------------
    # Processes that generate huge amounts of
    # normal Windows activity.
    # -----------------------------------------

    SYSTEM_WHITELIST = {
        "svchost.exe",
        "lsass.exe",
        "csrss.exe",
        "smss.exe",
        "wininit.exe",

        "services.exe",
        "MsMpEng.exe",
        "WmiPrvSE.exe",
        "SearchIndexer.exe",
        "RuntimeBroker.exe",
        "spoolsv.exe",

        "TiWorker.exe",
        "wuauclt.exe",
        "msiexec.exe",
    }

    # -----------------------------------------
    # Known applications.
    #
    # We DON'T ignore these.
    # We simply use a higher threshold later.
    # -----------------------------------------

    KNOWN_APPLICATIONS = {
        "chrome.exe",
        "msedge.exe",
        "firefox.exe",
        "code.exe",
        "python.exe",
        "python3.exe",
        "node.exe",
        "explorer.exe",
    }

    @classmethod
    def normalize_name(
        cls,
        process_name: Optional[str]
    ) -> Optional[str]:

        if not process_name:
            return None

        return os.path.basename(
            process_name
        ).lower()

    @classmethod
    def is_whitelisted(
        cls,
        process_name: Optional[str]
    ) -> bool:

        name = cls.normalize_name(process_name)

        if not name:
            return False

        return name in {
            process.lower()
            for process in cls.SYSTEM_WHITELIST
        }

    @classmethod
    def is_known_application(
        cls,
        process_name: Optional[str]
    ) -> bool:

        name = cls.normalize_name(process_name)

        if not name:
            return False

        return name in {
            process.lower()
            for process in cls.KNOWN_APPLICATIONS
        }

    @classmethod
    def should_monitor(
        cls,
        process_name: Optional[str]
    ) -> bool:
        """
        Returns True if the process should enter
        the ML monitoring pipeline.
        """

        if not process_name:
            return False

        if cls.is_whitelisted(process_name):
            return False

        return True

    @classmethod
    def threshold(
        cls,
        process_name: Optional[str]
    ) -> float:
        """
        Threshold used later by the inference engine.

        Known applications:
            0.80

        Unknown processes:
            0.65
        """

        if cls.is_known_application(process_name):
            return 0.80

        return 0.65