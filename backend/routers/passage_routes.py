from fastapi import APIRouter, Depends, HTTPException

from ai_service import generate_passage, generate_passage_quiz
from auth import get_optional_user
from models import User
from schemas import PassageQuizResponse, PassageResponse

router = APIRouter(tags=["passage"])


@router.post("/generate-passage", response_model=PassageResponse)
async def post_generate_passage(_user: User = Depends(get_optional_user)) -> PassageResponse:
  try:
    return generate_passage()
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/generate-passage-quiz", response_model=PassageQuizResponse)
async def post_generate_passage_quiz(
  _user: User = Depends(get_optional_user)
) -> PassageQuizResponse:
  try:
    return generate_passage_quiz()
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error
