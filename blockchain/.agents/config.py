import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8000")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:4000")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")
ORGANIZATION_ID = os.getenv("ORGANIZATION_ID", "")
ENDPOINT_ID = os.getenv("ENDPOINT_ID", "")
WATCH_DIRECTORY = os.getenv("WATCH_DIRECTORY", "C:\\Users\\Public\\Documents")