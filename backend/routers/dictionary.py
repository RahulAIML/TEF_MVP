from fastapi import APIRouter, Depends, HTTPException

from ai_service import explain_word, explain_text
from auth import get_optional_user
from models import User
from schemas import WordMeaningRequest, WordMeaningResponse, ExplainTextRequest, ExplainTextResponse

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


@router.post("/explain-text", response_model=ExplainTextResponse)
async def post_explain_text(
  payload: ExplainTextRequest,
  _user: User = Depends(get_optional_user)
) -> ExplainTextResponse:
  try:
    return ExplainTextResponse(**explain_text(payload.text))
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error
