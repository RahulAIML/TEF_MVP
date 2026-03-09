import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.dictionary import router as dictionary_router
from routers.reading import router as reading_router
from routers.submission import router as submission_router

load_dotenv()

app = FastAPI(title="TEF Reading Comprehension API", version="0.1.0")

configured_origins = [
  origin.strip()
  for origin in os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000,http://localhost:3001"
  ).split(",")
  if origin.strip()
]
frontend_origins = sorted(
  set(configured_origins).union({"http://localhost:3000", "http://localhost:3001"})
)
app.add_middleware(
  CORSMiddleware,
  allow_origins=frontend_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)

app.include_router(reading_router)
app.include_router(dictionary_router)
app.include_router(submission_router)


@app.get("/")
async def root() -> dict[str, str]:
  return {"status": "ok", "service": "tef-reading-backend"}
