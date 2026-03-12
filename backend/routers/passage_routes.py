from fastapi import APIRouter, Depends, HTTPException

from ai_service import generate_passage
from auth import get_optional_user
from models import User
from schemas import PassageResponse

router = APIRouter(tags=["passage"])


@router.post("/generate-passage", response_model=PassageResponse)
async def post_generate_passage(_user: User = Depends(get_optional_user)) -> PassageResponse:
  try:
    return generate_passage()
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error
