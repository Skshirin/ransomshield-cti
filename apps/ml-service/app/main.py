from fastapi import FastAPI
from app.routers import health, predict
from app.config import settings

app = FastAPI(
    title="Ransomware Detection ML Service",
    description="Behavioural analysis service for ransomware detection",
    version="0.1.0",
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(predict.router, prefix="/predict", tags=["predict"])


@app.get("/")
def root():
    return {"message": "Ransomware Detection ML Service is running"}