from fastapi import APIRouter, HTTPException

from ai_service import generate_reading_exercise
from schemas import GenerateReadingRequest, ReadingExerciseResponse

router = APIRouter(tags=["reading"])


@router.get("/generate-reading-exercise", response_model=ReadingExerciseResponse)
async def get_reading_exercise() -> ReadingExerciseResponse:
  try:
    return generate_reading_exercise()
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/generate-reading", response_model=ReadingExerciseResponse)
async def post_generate_reading(payload: GenerateReadingRequest) -> ReadingExerciseResponse:
  try:
    return generate_reading_exercise(mode=payload.mode, part=payload.part)
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error
