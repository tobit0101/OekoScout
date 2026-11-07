import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Schwammstadt-Score Pforzheim API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)
