from fastapi import APIRouter, HTTPException

from ai_service import get_last_exercise
from schemas import SubmitReadingRequest, SubmissionResponse, SubmissionResultItem

router = APIRouter(tags=["submission"])


@router.post("/submit-reading", response_model=SubmissionResponse)
async def post_submit_reading(payload: SubmitReadingRequest) -> SubmissionResponse:
  exercise = get_last_exercise()
  if exercise is None:
    raise HTTPException(
      status_code=400,
      detail="No generated exercise found. Call /generate-reading-exercise first."
    )

  score = 0
  results = []
  for index, question in enumerate(exercise.questions):
    user_answer = payload.answers[index] if index < len(payload.answers) else ""
    is_correct = user_answer == question.correct_answer
    if is_correct:
      score += 1

    results.append(
      SubmissionResultItem(
        question_index=index + 1,
        correct_answer=question.correct_answer,
        user_answer=user_answer,
        is_correct=is_correct,
        explanation=question.explanation
      )
    )

  return SubmissionResponse(score=score, total=len(exercise.questions), results=results)
