from fastapi import APIRouter, Depends

from ai_service import generate_listening_question, generate_listening_audio
from auth import get_optional_user
from schemas import GenerateListeningQuestionRequest, ListeningQuestionResponse, UserResponse, GenerateListeningAudioRequest, GenerateListeningAudioResponse

router = APIRouter(tags=["listening"])


@router.post("/generate-listening-question", response_model=ListeningQuestionResponse)
async def post_generate_listening_question(
  payload: GenerateListeningQuestionRequest,
  _user: UserResponse = Depends(get_optional_user)
) -> ListeningQuestionResponse:
  return generate_listening_question(payload.question_number, payload.session_id)


@router.post("/generate-listening-audio", response_model=GenerateListeningAudioResponse)
async def post_generate_listening_audio(
  payload: GenerateListeningAudioRequest,
  _user: UserResponse = Depends(get_optional_user)
) -> GenerateListeningAudioResponse:
  audio_url = generate_listening_audio(payload.script, payload.question_number, payload.session_id)
  return GenerateListeningAudioResponse(audio_url=audio_url)
