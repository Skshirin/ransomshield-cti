import os
import time
import socket
import subprocess
import threading
from pathlib import Path
from datetime import datetime

# ============================================================
# SAFE SANDBOX
# ============================================================

BASE = Path(__file__).resolve().parent / "simulation_workspace"
BASE.mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("RANSOMWARE BEHAVIOR STRESS SIMULATOR")
print("=" * 70)
print(f"Sandbox: {BASE}")
print("Nothing outside this directory will be modified.")
print()


# Recognized encrypted extensions from FeatureExtractor.SUSPICIOUS_EXTENSIONS
RECOGNIZED_SUSPICIOUS_EXTENSIONS = [
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
]


# ============================================================
# 1. MASS FILE CREATION
# ============================================================

def mass_file_creation():

    print("[1/7] Creating 1500 files with recognized ransomware extensions...")

    for i in range(1500):

        directory = BASE / f"directory_{i % 30}"
        directory.mkdir(exist_ok=True)

        ext = RECOGNIZED_SUSPICIOUS_EXTENSIONS[i % len(RECOGNIZED_SUSPICIOUS_EXTENSIONS)]
        file = directory / f"document_{i}{ext}"

        with open(file, "w", encoding="utf-8") as f:
            f.write(
                "Sensitive document simulation\n"
                * 20
            )

    print("[+] 1500 files created with recognized suspicious extensions")


# ============================================================
# 2. MASS FILE MODIFICATION
# ============================================================

def mass_file_modification():

    print("[2/7] Modifying files...")

    files = [f for f in BASE.rglob("*") if f.is_file() and f.suffix in RECOGNIZED_SUSPICIOUS_EXTENSIONS]

    for file in files:

        with open(file, "a", encoding="utf-8") as f:
            f.write(
                "\nSIMULATED RANSOMWARE MODIFICATION\n"
                * 10
            )

    print(f"[+] Modified {len(files)} files")


# ============================================================
# 3. CREATE HIGH-ENTROPY / RANSOMWARE-LIKE NAMES
# ============================================================
def suspicious_renames():
    print("[3/7] Renaming files with simulated encrypted extensions...")

    files = [f for f in BASE.rglob("*") if f.is_file()]

    renamed = 0
    skipped = 0

    for i, file in enumerate(files):
        ext = RECOGNIZED_SUSPICIOUS_EXTENSIONS[(i + 1) % len(RECOGNIZED_SUSPICIOUS_EXTENSIONS)]
        new_name = file.with_name(
            file.stem + ext
        )

        # Already exists from a previous run
        if new_name.exists():
            skipped += 1
            continue

        for attempt in range(5):
            try:
                file.rename(new_name)
                renamed += 1
                break

            except PermissionError:
                if attempt < 4:
                    time.sleep(0.1)
                else:
                    skipped += 1

            except FileExistsError:
                skipped += 1
                break

            except OSError:
                skipped += 1
                break

    print(f"[+] Renamed: {renamed}")
    print(f"[+] Skipped: {skipped}")


# ============================================================
# 4. MASS DIRECTORY ACTIVITY
# ============================================================

def directory_activity():

    print("[4/7] Generating additional directory activity...")

    for i in range(500):

        directory = (
            BASE
            / "deep"
            / f"level_{i % 50}"
            / f"subdir_{i % 20}"
        )

        directory.mkdir(
            parents=True,
            exist_ok=True
        )

        ext = RECOGNIZED_SUSPICIOUS_EXTENSIONS[i % len(RECOGNIZED_SUSPICIOUS_EXTENSIONS)]
        file = directory / f"activity_{i}{ext}"

        with open(file, "wb") as f:
            f.write(os.urandom(2048))

    print("[+] Additional directory/file activity generated")


# ============================================================
# 5. FILE TIMESTAMP MODIFICATION
# ============================================================

def timestamp_activity():

    print("[5/7] Modifying file timestamps...")

    files = list(BASE.rglob("*"))

    files = [
        f for f in files
        if f.is_file()
    ]

    now = time.time()

    for file in files:

        try:
            os.utime(
                file,
                (
                    now - 3600,
                    now - 3600
                )
            )
        except OSError:
            pass

    print(f"[+] Touched {len(files)} files")


# ============================================================
# 6. LOCALHOST NETWORK ACTIVITY
# ============================================================

def network_activity():

    print("[6/7] Generating localhost network activity...")

    def connect():

        for _ in range(100):

            try:

                sock = socket.socket(
                    socket.AF_INET,
                    socket.SOCK_STREAM
                )

                sock.settimeout(0.05)

                sock.connect(
                    ("127.0.0.1", 9)
                )

                sock.close()

            except OSError:
                pass

    threads = []

    for _ in range(5):

        t = threading.Thread(
            target=connect
        )

        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    print("[+] Localhost connection attempts generated")


# ============================================================
# 7. PROCESS CREATION
# ============================================================

def process_activity():

    print("[7/7] Generating process activity...")

    processes = []

    for _ in range(30):

        try:

            p = subprocess.Popen(
                [
                    "cmd.exe",
                    "/c",
                    "echo simulated-ransomware-process"
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            processes.append(p)

        except Exception:
            pass

    for p in processes:

        try:
            p.wait(timeout=2)
        except Exception:
            pass

    print("[+] Process activity generated")


# ============================================================
# MAIN ATTACK BURST
# ============================================================

def main():

    print("Starting in 3 seconds...")
    time.sleep(3)

    start = time.time()

    mass_file_creation()

    mass_file_modification()

    suspicious_renames()

    directory_activity()

    timestamp_activity()

    network_activity()

    process_activity()

    elapsed = time.time() - start

    print()
    print("=" * 70)
    print("SIMULATION COMPLETE")
    print("=" * 70)
    print(f"Elapsed time: {elapsed:.2f} seconds")
    print(f"Sandbox: {BASE}")
    print()
    print("Expected result:")
    print()
    print("=" * 70)
    print("ATTACK COMPLETE — KEEPING PROCESS ALIVE FOR 30 SECONDS")
    print("Let the Sysmon agent consume the generated events...")
    print("=" * 70)

    time.sleep(30)
    print("  file activity       -> HIGH")
    print("  directory activity  -> HIGH")
    print("  encrypted extensions-> HIGH")
    print("  process activity    -> elevated")
    print("  network activity    -> elevated")
    print("  overall XGBoost     -> RANSOMWARE")
    print()


if __name__ == "__main__":
    main()