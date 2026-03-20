import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers.dictionary import router as dictionary_router
from routers.auth_routes import router as auth_router
from routers.exam_routes import router as exam_router
from routers.passage_routes import router as passage_router
from routers.performance_routes import router as performance_router
from routers.listening_routes import router as listening_router

load_dotenv()

app = FastAPI(title="TEF Reading Comprehension API", version="0.1.0")

AUDIO_DIR = Path(__file__).resolve().parent / "data" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

configured_origins = [
  origin.strip()
  for origin in os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
  ).split(",")
  if origin.strip()
]
frontend_origins = sorted(
  set(configured_origins).union({
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000"
  })
)
app.add_middleware(
  CORSMiddleware,
  allow_origins=frontend_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)

app.include_router(dictionary_router)
app.include_router(exam_router)
app.include_router(passage_router)
app.include_router(performance_router)
app.include_router(listening_router)
app.include_router(auth_router)


@app.on_event("startup")
async def on_startup() -> None:
  init_db()


@app.get("/")
async def root() -> dict[str, str]:
  return {"status": "ok", "service": "tef-reading-backend"}
