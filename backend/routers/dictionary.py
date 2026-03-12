from fastapi import APIRouter, Depends, HTTPException

from ai_service import explain_word
from auth import get_optional_user
from models import User
from schemas import WordMeaningRequest, WordMeaningResponse

router = APIRouter(tags=["dictionary"])


@router.post("/word-meaning", response_model=WordMeaningResponse)
async def post_word_meaning(
  payload: WordMeaningRequest,
  _user: User = Depends(get_optional_user)
) -> WordMeaningResponse:
  try:
    return explain_word(payload.word)
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error
