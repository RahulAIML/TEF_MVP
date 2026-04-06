from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ai_service import ai_chat_reply
from auth import get_optional_user
from models import User

router = APIRouter(tags=["ai-chat"])


class AIChatRequest(BaseModel):
  message: str
  context: str = ""
  language: str = "en"  # "en" | "fr"


class AIChatResponse(BaseModel):
  reply: str


@router.post("/ai-chat", response_model=AIChatResponse)
async def post_ai_chat(
  payload: AIChatRequest,
  _user: User = Depends(get_optional_user)
) -> AIChatResponse:
  reply = ai_chat_reply(
    message=payload.message,
    context=payload.context,
    language=payload.language
  )
  return AIChatResponse(reply=reply)
