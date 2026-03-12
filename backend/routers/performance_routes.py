import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_optional_user
from database import get_db
from models import ExamAttempt, User
from schemas import DashboardSummaryResponse, RecentExam

router = APIRouter(tags=["performance"])

QUESTION_TYPE_LABELS = {
  "everyday_life": "Everyday-life documents",
  "gap_fill": "Incomplete sentences",
  "rapid_reading": "Rapid reading",
  "administrative": "Administrative documents",
  "press": "Press articles"
}


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
  db: Session = Depends(get_db),
  user: User = Depends(get_optional_user)
) -> DashboardSummaryResponse:
  average_accuracy = db.query(func.coalesce(func.avg(ExamAttempt.accuracy), 0)).filter(
    ExamAttempt.user_id == user.id
  ).scalar()

  recent_attempts = (
    db.query(ExamAttempt)
    .filter(ExamAttempt.user_id == user.id)
    .order_by(ExamAttempt.created_at.desc())
    .limit(3)
    .all()
  )

  error_counts: dict[str, int] = {}
  for attempt in db.query(ExamAttempt.error_types).filter(ExamAttempt.user_id == user.id):
    try:
      payload = json.loads(attempt.error_types or "{}")
    except json.JSONDecodeError:
      payload = {}
    for key, value in payload.items():
      error_counts[key] = error_counts.get(key, 0) + int(value)

  weakest_key = ""
  if error_counts:
    weakest_key = max(error_counts, key=error_counts.get)

  weakest_label = QUESTION_TYPE_LABELS.get(weakest_key, "Not enough data")

  recent_exams = [
    RecentExam(
      id=attempt.id,
      score=attempt.score,
      accuracy=float(attempt.accuracy),
      created_at=attempt.created_at
    )
    for attempt in recent_attempts
  ]

  return DashboardSummaryResponse(
    average_accuracy=round(float(average_accuracy or 0), 2),
    recent_exams=recent_exams,
    weakest_question_type=weakest_label
  )
