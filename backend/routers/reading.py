from fastapi import APIRouter, HTTPException

from ai_service import generate_reading_exercise
from schemas import ReadingExerciseResponse

router = APIRouter(tags=["reading"])


@router.get("/generate-reading-exercise", response_model=ReadingExerciseResponse)
async def get_reading_exercise() -> ReadingExerciseResponse:
  try:
    return generate_reading_exercise()
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error
