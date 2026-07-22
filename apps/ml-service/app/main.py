from fastapi import FastAPI
from app.routers import health, predict
from app.ml.model_loader import load_model

app = FastAPI(
    title="Ransomware Detection ML Service",
    description="Behavioural analysis service for ransomware detection",
    version="0.1.0",
)


@app.on_event("startup")
def startup_event():
    load_model()
    print("[ml-service] Model loaded successfully")


app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(predict.router, prefix="/predict", tags=["predict"])


@app.get("/")
def root():
    return {"message": "Ransomware Detection ML Service is running"}