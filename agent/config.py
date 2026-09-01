import os
import sys
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Check if command line argument specifies a custom env file
env_file = ".env"
for arg in sys.argv:
    if arg.startswith("--env-file="):
        env_file = arg.split("=", 1)[1]
        break

# Or fallback to environment variable
if env_file == ".env":
    env_file = os.getenv("ENV_FILE", ".env")

# If custom env file path is provided, load it
ENV_FILE_PATH = env_file
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
ACTIVATION_TOKEN = os.getenv("ACTIVATION_TOKEN", "")
WATCH_DIRECTORY = os.getenv("WATCH_DIRECTORY", "C:\\Users\\Public\\Documents")

AUTO_REPORT_DETECTIONS = os.getenv("AUTO_REPORT_DETECTIONS", "false").lower() == "true"

# Telemetry and Simulation configuration
TELEMETRY_MODE = os.getenv("TELEMETRY_MODE", "real").lower()  # "real" or "simulated"
SIMULATION_SCENARIO = os.getenv("SIMULATION_SCENARIO", "normal").lower()  # "normal" or "ransomware"