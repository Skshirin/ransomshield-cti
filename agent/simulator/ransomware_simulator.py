"""
Safe Ransomware Behavior Simulator
===================================
- Creates its own isolated sandbox directory
- Generates only disposable dummy files
- Touches NOTHING outside the sandbox
- No real encryption, no shadow copy deletion, no Defender changes
- Cleans up automatically after each phase
- Designed for ML feature demonstration

Run order:
  Terminal 1: Sysmon (already running as service)
  Terminal 2: python your_collector.py
  Terminal 3: python ransomware_simulator.py
"""

import os
import sys
import time
import uuid
import shutil
import random
import string
import struct
import hashlib
import subprocess
import tempfile
import threading
from datetime import datetime
from pathlib import Path

# ─── CONFIG ──────────────────────────────────────────────────────────────────
SANDBOX_DIR = Path("C:/RansomSimSandbox")   # ONLY place this script writes to
PHASE_PAUSE = 3          # seconds between phases (time for your collector to catch up)
FILES_PER_PHASE = 80     # how many files to create in mass-creation phase
SUBDIRS = 12             # subdirectory count for directory sweep

# Known ransomware-style extensions (fake, for feature demonstration only)
RANSOM_EXTENSIONS = [".locked", ".encrypted", ".crypt", ".L0ck", ".WNCRY", ".zepto"]

# Suspicious path fragments (for suspicious_path_ratio feature)
SUSPICIOUS_SUBPATHS = ["temp", "appdata_sim", "roaming_sim", "startup_sim"]

SEPARATOR = "=" * 60

# ─── HELPERS ─────────────────────────────────────────────────────────────────
def log(msg, color=None):
    codes = {"green": "\033[92m", "yellow": "\033[93m", "red": "\033[91m", "cyan": "\033[96m", "reset": "\033[0m"}
    prefix = codes.get(color, "") if sys.platform != "win32" else ""
    suffix = codes["reset"] if color and sys.platform != "win32" else ""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {prefix}{msg}{suffix}", flush=True)

def random_name(length=12):
    """UUID-style high-entropy filename — mimics ransomware's random output names."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def make_high_entropy_content(size_bytes=512):
    """Pseudo-random bytes — high Shannon entropy, mimics encrypted file content."""
    return bytes(random.getrandbits(8) for _ in range(size_bytes))

def make_benign_content(size_bytes=512):
    """Repetitive readable text — low entropy, mimics real documents."""
    word = "Hello this is a normal document. "
    return (word * (size_bytes // len(word) + 1))[:size_bytes].encode()

def wait(seconds, label=""):
    log(f"  ⏳ Waiting {seconds}s {label}— let your collector capture this window...", "cyan")
    time.sleep(seconds)

def ensure_sandbox():
    if SANDBOX_DIR.exists():
        shutil.rmtree(SANDBOX_DIR)
    SANDBOX_DIR.mkdir(parents=True)
    log(f"Sandbox created: {SANDBOX_DIR}", "green")


# ─── PHASE 0: BASELINE (normal activity) ─────────────────────────────────────
def phase_0_baseline():
    """
    Normal file activity — low counts, predictable extensions, low entropy names.
    Your model should predict GOOD here.
    Features expected: low file_create_count, low file_activity_rate,
                       unique_extensions_written ~2, file_name_entropy ~low
    """
    log(SEPARATOR)
    log("PHASE 0 — BASELINE (normal activity)", "green")
    log("  Creating normal-looking files with low-entropy names and benign extensions.")
    log("  Expected prediction: GOOD / benign")

    phase_dir = SANDBOX_DIR / "baseline"
    phase_dir.mkdir()

    normal_names = [
        "report_q1", "meeting_notes", "budget_2024", "project_plan",
        "readme", "config_backup", "user_data", "summary"
    ]
    for name in normal_names:
        ext = random.choice([".txt", ".docx", ".xlsx"])
        f = phase_dir / (name + ext)
        f.write_bytes(make_benign_content(256))
        time.sleep(0.3)   # slow — realistic human pace

    log(f"  Created {len(normal_names)} normal files in {phase_dir}", "green")
    log("  Features to check: file_create_count ≈ 8, unique_extensions_written ≈ 3, file_name_entropy ≈ low")
    wait(PHASE_PAUSE, "(baseline window)")


# ─── PHASE 1: MASS FILE CREATION + HIGH-ENTROPY NAMES ────────────────────────
def phase_1_mass_file_creation():
    """
    RANSOMWARE BEHAVIOR: Mass creation of files with random names.
    Real ransomware creates encrypted copies with UUID-style names.

    Sysmon events generated: EventID 11 (FileCreate) — many, rapidly
    Features that spike:
      - file_create_count         (was ~8, now 80+)
      - file_activity_rate        (events per second — very high)
      - file_name_entropy         (random names = high Shannon entropy)
      - unique_extensions_written (mixed fake encrypted extensions)
      - known_encrypted_ext_count (.locked, .crypt, etc.)
      - unique_directories_touched (spread across subdirs)
    """
    log(SEPARATOR)
    log("PHASE 1 — MASS FILE CREATION (ransomware-like)", "red")
    log("  Rapidly creating many files with high-entropy names and fake encrypted extensions.")
    log("  Expected prediction: RANSOMWARE")

    phase_dir = SANDBOX_DIR / "phase1_mass_creation"
    phase_dir.mkdir()

    # Create subdirectories to spread files (mimics directory traversal)
    subdirs = []
    for i in range(6):
        subdir = phase_dir / f"dir_{random_name(6)}"
        subdir.mkdir()
        subdirs.append(subdir)

    created = 0
    for i in range(FILES_PER_PHASE):
        # High-entropy random filename (mimics ransomware output)
        fname = random_name(14)
        # Randomly pick a ransom extension or no extension
        if random.random() > 0.3:
            ext = random.choice(RANSOM_EXTENSIONS)
        else:
            ext = random.choice([".tmp", ".dat"])
        target_dir = random.choice(subdirs)
        f = target_dir / (fname + ext)
        f.write_bytes(make_high_entropy_content(random.randint(256, 1024)))
        created += 1
        # No sleep — rapid burst, this is the signal

    log(f"  Created {created} files across {len(subdirs)} directories", "red")
    log("  Features to check:")
    log("    file_create_count         → should be 80+")
    log("    file_activity_rate        → should be very high (files/sec)")
    log("    file_name_entropy         → should be high (random names)")
    log("    known_encrypted_ext_count → should be 50+ (.locked, .crypt, etc.)")
    log("    unique_extensions_written → 6-8 different extensions")
    log("    unique_directories_touched → 6+ directories")
    wait(PHASE_PAUSE, "(mass creation window)")


# ─── PHASE 2: DIRECTORY SWEEP + TIMESTAMP MANIPULATION ───────────────────────
def phase_2_directory_sweep():
    """
    RANSOMWARE BEHAVIOR: Walk entire directory tree before encrypting.
    Real ransomware enumerates all user files to build its target list,
    then backdates files to hide its presence.

    Sysmon events generated:
      EventID 11 (FileCreate) — many across many directories
      EventID 2  (FileCreationTimeChanged) — timestamp manipulation

    Features that spike:
      - unique_directories_touched    (walking many dirs)
      - average_file_path_length      (deep nested paths = longer)
      - suspicious_path_ratio         (paths contain temp/appdata-like names)
      - file_creation_time_changed    (backdating files)
      - file_create_count             (creating in every directory)
    """
    log(SEPARATOR)
    log("PHASE 2 — DIRECTORY SWEEP + TIMESTAMP MANIPULATION (ransomware-like)", "red")
    log("  Walking a fake directory tree, creating files in every directory,")
    log("  and manipulating file timestamps (EventID 2).")
    log("  Expected prediction: RANSOMWARE")

    phase_dir = SANDBOX_DIR / "phase2_sweep"
    phase_dir.mkdir()

    # Build a realistic fake directory tree with suspicious path names
    tree_dirs = []
    for top in SUSPICIOUS_SUBPATHS:
        top_dir = phase_dir / top
        top_dir.mkdir()
        tree_dirs.append(top_dir)
        for mid in ["documents", "pictures", "downloads", "desktop"]:
            mid_dir = top_dir / mid
            mid_dir.mkdir()
            tree_dirs.append(mid_dir)
            for sub in ["2022", "2023", "work", "personal"]:
                sub_dir = mid_dir / sub
                sub_dir.mkdir()
                tree_dirs.append(sub_dir)

    log(f"  Built fake directory tree: {len(tree_dirs)} directories")

    # Create a dummy file in every directory (mimics ransomware file walk)
    created_files = []
    for d in tree_dirs:
        fname = random_name(10) + ".locked"
        f = d / fname
        f.write_bytes(make_high_entropy_content(128))
        created_files.append(f)

    log(f"  Created {len(created_files)} files across all directories")

    # Timestamp manipulation — use Python's os.utime to backdate files
    # This triggers Sysmon EventID 2 (FileCreationTimeChanged)
    log("  Backdating file timestamps (triggers Sysmon EventID 2)...")
    import os
    old_time = 1000000000  # Unix timestamp for 2001 — obviously backdated
    for f in created_files[:20]:  # backdate first 20 files
        try:
            os.utime(str(f), (old_time, old_time))
        except Exception:
            pass

    log("  Features to check:")
    log("    unique_directories_touched → 48+ directories")
    log("    average_file_path_length   → long paths (deeply nested)")
    log("    suspicious_path_ratio      → high (temp, appdata, roaming in path)")
    log("    file_creation_time_changed → 20+ timestamp changes")
    log("    file_create_count          → 48+ files")
    wait(PHASE_PAUSE, "(directory sweep window)")


# ─── PHASE 3: PROCESS BURST ──────────────────────────────────────────────────
def phase_3_process_burst():
    """
    RANSOMWARE BEHAVIOR: Spawns multiple short-lived child processes
    for parallel encryption (worker processes) or to call system utilities.

    Sysmon events generated:
      EventID 1 (ProcessCreate) — many, rapidly
      EventID 5 (ProcessTerminate) — each short-lived process exits quickly

    Features that spike:
      - process_create_count    (burst of new processes)
      - process_terminated_count (each exits quickly)
      - process_activity_rate   (processes per second)
    """
    log(SEPARATOR)
    log("PHASE 3 — PROCESS BURST (ransomware-like)", "red")
    log("  Spawning many short-lived subprocesses rapidly.")
    log("  Mimics ransomware's parallel worker process pattern.")
    log("  Expected prediction: RANSOMWARE (combined with other phases)")

    # Use harmless commands — just spawn Python with -c and a no-op
    # These are completely benign but generate real ProcessCreate events
    commands = [
        [sys.executable, "-c", "import time; time.sleep(0.1)"],
        [sys.executable, "-c", "x = [i**2 for i in range(100)]"],
        [sys.executable, "-c", "import os; os.getcwd()"],
    ]

    procs = []
    log("  Launching 30 short-lived subprocesses...")
    for i in range(30):
        cmd = random.choice(commands)
        p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        procs.append(p)
        time.sleep(0.05)   # 50ms apart — rapid but not instant

    # Wait for all to finish
    for p in procs:
        p.wait()

    log(f"  Launched and terminated 30 subprocesses")
    log("  Features to check:")
    log("    process_create_count    → 30+")
    log("    process_terminated_count → 30+")
    log("    process_activity_rate   → high (processes per second)")
    wait(PHASE_PAUSE, "(process burst window)")


# ─── PHASE 4: COMBINED ATTACK (most dramatic for demo) ───────────────────────
def phase_4_combined():
    """
    All behaviors simultaneously — most realistic ransomware simulation.
    Real ransomware does all of this at once:
      - walks directories (recon)
      - creates encrypted output files
      - spawns workers
      - modifies timestamps

    This is your MAIN DEMO PHASE — the one that should spike every feature.
    """
    log(SEPARATOR)
    log("PHASE 4 — COMBINED ATTACK SIMULATION (main demo phase)", "red")
    log("  All ransomware behaviors simultaneously.")
    log("  This is your most dramatic demo moment.")

    phase_dir = SANDBOX_DIR / "phase4_combined"
    phase_dir.mkdir()

    # Thread 1: rapid file creation across many directories
    def file_thread():
        dirs = []
        for i in range(SUBDIRS):
            d = phase_dir / f"victim_dir_{random_name(5)}"
            d.mkdir(exist_ok=True)
            dirs.append(d)
        for _ in range(FILES_PER_PHASE):
            d = random.choice(dirs)
            f = d / (random_name(14) + random.choice(RANSOM_EXTENSIONS))
            f.write_bytes(make_high_entropy_content(random.randint(256, 2048)))

    # Thread 2: process burst
    def process_thread():
        for _ in range(20):
            p = subprocess.Popen(
                [sys.executable, "-c", "import time; time.sleep(0.08)"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            time.sleep(0.07)
        # Don't wait — let them run and terminate naturally

    # Thread 3: timestamp manipulation on existing files
    def timestamp_thread():
        time.sleep(1)
        for f in list(phase_dir.rglob("*"))[:15]:
            if f.is_file():
                try:
                    os.utime(str(f), (1000000000, 1000000000))
                except Exception:
                    pass

    t1 = threading.Thread(target=file_thread)
    t2 = threading.Thread(target=process_thread)
    t3 = threading.Thread(target=timestamp_thread)

    t1.start(); t2.start(); t3.start()
    t1.join();  t2.join();  t3.join()

    log("  Combined phase complete.")
    log("  Features to check (all should be at maximum):")
    log("    file_create_count         → 80+")
    log("    process_create_count      → 20+")
    log("    file_name_entropy         → high")
    log("    known_encrypted_ext_count → high")
    log("    unique_directories_touched → 12+")
    log("    file_creation_time_changed → 15+")
    log("    process_activity_rate     → high")
    log("    file_activity_rate        → high")
    wait(PHASE_PAUSE, "(combined attack window)")


# ─── CLEANUP ─────────────────────────────────────────────────────────────────
def cleanup():
    log(SEPARATOR)
    log("CLEANUP — removing sandbox directory", "green")
    try:
        shutil.rmtree(SANDBOX_DIR)
        log(f"  Deleted: {SANDBOX_DIR}", "green")
    except Exception as e:
        log(f"  Could not delete sandbox: {e}. Delete manually: rmdir /s /q {SANDBOX_DIR}", "yellow")


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print(SEPARATOR)
    print("  SAFE RANSOMWARE BEHAVIOR SIMULATOR")
    print("  For ML feature demonstration only")
    print("  Sandbox:", SANDBOX_DIR)
    print("  This script will NOT touch files outside the sandbox.")
    print(SEPARATOR)
    print()

    print("Phases that will run:")
    print("  Phase 0 — Baseline normal activity           → expect GOOD prediction")
    print("  Phase 1 — Mass file creation + ransom exts   → expect RANSOMWARE prediction")
    print("  Phase 2 — Directory sweep + timestamp change  → expect RANSOMWARE prediction")
    print("  Phase 3 — Process burst                       → expect RANSOMWARE prediction")
    print("  Phase 4 — Combined (all behaviors at once)    → strongest RANSOMWARE signal")
    print()
    print("Make sure your Sysmon collector is running in another terminal before continuing.")
    print()
    input("Press ENTER to start (or Ctrl+C to cancel)...")
    print()

    import os  # needed for utime in phase 2

    ensure_sandbox()
    print()

    phase_0_baseline()
    phase_1_mass_file_creation()
    phase_2_directory_sweep()
    phase_3_process_burst()
    phase_4_combined()

    print()
    log(SEPARATOR)
    log("ALL PHASES COMPLETE", "green")
    log("")
    log("LABELLING GUIDE FOR YOUR DATASET:", "cyan")
    log("  Windows collected during Phase 0 → label = 0 (good/benign)")
    log("  Windows collected during Phase 1 → label = 1 (ransomware)")
    log("  Windows collected during Phase 2 → label = 1 (ransomware)")
    log("  Windows collected during Phase 3 → label = 1 (ransomware)")
    log("  Windows collected during Phase 4 → label = 1 (ransomware)")
    log("")
    log("WHAT TO CHECK IN YOUR FEATURE VECTORS:", "cyan")
    log("  Print the feature vector for each 10-second window.")
    log("  Phase 0 values become your BENIGN baseline ranges.")
    log("  Phase 1-4 values become your RANSOMWARE target ranges.")
    log("  Use these ranges to audit/fix your synthetic CSV dataset.")

    cleanup()

    print()
    print("Done. Check your collector output for feature vectors.")


if __name__ == "__main__":
    main()