from sysmon_reader import start_sysmon_reader


def main():
    print("[agent] Starting Ransomware Detection Agent (Sysmon-driven)...")
    print("[agent] NOTE: this process must run as Administrator to read the Sysmon event log.")
    start_sysmon_reader()


if __name__ == "__main__":
    main()