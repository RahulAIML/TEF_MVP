from fastapi import APIRouter, Depends

from ai_service import generate_listening_question
from auth import get_optional_user
from schemas import GenerateListeningQuestionRequest, ListeningQuestionResponse, UserResponse

router = APIRouter(tags=["listening"])


@router.post("/generate-listening-question", response_model=ListeningQuestionResponse)
async def post_generate_listening_question(
  payload: GenerateListeningQuestionRequest,
  _user: UserResponse = Depends(get_optional_user)
) -> ListeningQuestionResponse:
  return generate_listening_question(payload.question_number, payload.session_id)
