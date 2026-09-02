import os
import sys
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Check if command line argument specifies a custom env file
env_file = None
for i, arg in enumerate(sys.argv):
    if arg.startswith("--env-file="):
        env_file = arg.split("=", 1)[1]
        break
    elif arg in ("--env-file", "-e") and i + 1 < len(sys.argv):
        env_file = sys.argv[i + 1]
        break
    elif arg.startswith("-e="):
        env_file = arg.split("=", 1)[1]
        break

# Fallback to environment variable or default .env
if not env_file:
    env_file = os.getenv("ENV_FILE", ".env")

ENV_FILE_PATH = env_file

# If relative path does not exist in CWD, check relative to the agent/ directory
if not os.path.isabs(ENV_FILE_PATH) and not os.path.exists(ENV_FILE_PATH):
    agent_dir_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ENV_FILE_PATH)
    if os.path.exists(agent_dir_path):
        ENV_FILE_PATH = agent_dir_path

if os.path.exists(ENV_FILE_PATH):
    print(f"[config] Loading settings from: {os.path.abspath(ENV_FILE_PATH)}")
    load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)
else:
    print(f"[config] Loading default .env")
    load_dotenv()

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8000")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:4000")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")
ORGANIZATION_ID = os.getenv("ORGANIZATION_ID", "")
ENDPOINT_ID = os.getenv("ENDPOINT_ID", "")
ACTIVATION_TOKEN = os.getenv("ACTIVATION_TOKEN", "").strip().split(" ")[0] if os.getenv("ACTIVATION_TOKEN") else ""
WATCH_DIRECTORY = os.getenv("WATCH_DIRECTORY", "C:\\Users\\Public\\Documents")

AUTO_REPORT_DETECTIONS = os.getenv("AUTO_REPORT_DETECTIONS", "false").lower() == "true"

# Telemetry and Simulation configuration
TELEMETRY_MODE = os.getenv("TELEMETRY_MODE", "real").lower()  # "real" or "simulated"
SIMULATION_SCENARIO = os.getenv("SIMULATION_SCENARIO", "normal").lower()  # "normal" or "ransomware"