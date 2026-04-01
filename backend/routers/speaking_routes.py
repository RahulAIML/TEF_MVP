from fastapi import APIRouter, Depends, HTTPException

from ai_service import evaluate_speaking_conversation, generate_speaking_reply
from auth import get_optional_user
from models import User
from schemas import (
  ConversationRequest,
  ConversationResponse,
  SpeakingEvaluationRequest,
  SpeakingEvaluationResponse
)

router = APIRouter(tags=["speaking"])


@router.post("/conversation", response_model=ConversationResponse)
async def post_conversation(
  payload: ConversationRequest,
  _user: User = Depends(get_optional_user)
) -> ConversationResponse:
  try:
    response = generate_speaking_reply(
      message=payload.message,
      history=[item.model_dump() for item in payload.history],
      task_type=payload.task_type,
      mode=payload.mode or "practice",
      hints=payload.hints,
      session_id=payload.session_id
    )
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error

  return ConversationResponse(**response)


@router.post("/evaluate", response_model=SpeakingEvaluationResponse)
async def post_speaking_evaluation(
  payload: SpeakingEvaluationRequest,
  _user: User = Depends(get_optional_user)
) -> SpeakingEvaluationResponse:
  try:
    evaluation = evaluate_speaking_conversation(
      history=[item.model_dump() for item in payload.history],
      task_type=payload.task_type
    )
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error

  return SpeakingEvaluationResponse(**evaluation)

