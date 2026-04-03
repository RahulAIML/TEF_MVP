import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_optional_user
from database import get_db
from models import ExamAttempt, LearnSession, ListeningAttempt, User, WritingSession
from schemas import (
  DashboardSummaryResponse,
  LearnSessionSummary,
  LearnSummary,
  ModuleExamSummary,
  RecentExam,
  WritingSubmissionSummary,
  WritingSummary
)

router = APIRouter(tags=["performance"])

QUESTION_TYPE_LABELS = {
  "everyday_life": "Everyday-life documents",
  "gap_fill": "Incomplete sentences",
  "rapid_reading": "Rapid reading",
  "administrative": "Administrative documents",
  "press": "Press articles"
}


def _build_recent_exams(attempts: list[ExamAttempt | ListeningAttempt]) -> list[RecentExam]:
  return [
    RecentExam(
      id=attempt.id,
      score=attempt.score,
      accuracy=float(attempt.accuracy),
      created_at=attempt.created_at
    )
    for attempt in attempts
  ]


def _parse_eval_score(payload: str | None) -> float | None:
  if not payload:
    return None
  try:
    data = json.loads(payload)
  except json.JSONDecodeError:
    return None
  scores = data.get("scores") if isinstance(data, dict) else None
  if not isinstance(scores, dict):
    return None
  values = []
  for key in ("structure", "grammar", "coherence", "vocab"):
    value = scores.get(key)
    try:
      values.append(float(value))
    except (TypeError, ValueError):
      continue
  if not values:
    return None
  return sum(values) / len(values)


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
  db: Session = Depends(get_db),
  user: User = Depends(get_optional_user)
) -> DashboardSummaryResponse:
  reading_avg = db.query(func.coalesce(func.avg(ExamAttempt.accuracy), 0)).filter(
    ExamAttempt.user_id == user.id
  ).scalar()

  reading_attempts = (
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

  reading_summary = ModuleExamSummary(
    average_accuracy=round(float(reading_avg or 0), 2),
    recent_exams=_build_recent_exams(reading_attempts),
    weakest_question_type=weakest_label
  )

  listening_avg = db.query(func.coalesce(func.avg(ListeningAttempt.accuracy), 0)).filter(
    ListeningAttempt.user_id == user.id
  ).scalar()
  listening_attempts = (
    db.query(ListeningAttempt)
    .filter(ListeningAttempt.user_id == user.id)
    .order_by(ListeningAttempt.created_at.desc())
    .limit(3)
    .all()
  )

  listening_summary = ModuleExamSummary(
    average_accuracy=round(float(listening_avg or 0), 2),
    recent_exams=_build_recent_exams(listening_attempts),
    weakest_question_type="Not tracked"
  )

  writing_sessions = (
    db.query(WritingSession)
    .filter(WritingSession.user_id == user.id, WritingSession.is_submitted.is_(True))
    .order_by(WritingSession.updated_at.desc())
    .all()
  )

  submission_summaries: list[WritingSubmissionSummary] = []
  submission_scores: list[float] = []
  for session in writing_sessions:
    task1_score = _parse_eval_score(session.task1_evaluation)
    task2_score = _parse_eval_score(session.task2_evaluation)
    scores = [score for score in (task1_score, task2_score) if score is not None]
    if not scores:
      continue
    average_score = sum(scores) / len(scores)
    submission_scores.append(average_score)
    if len(submission_summaries) < 3:
      submission_summaries.append(
        WritingSubmissionSummary(
          id=session.id,
          average_score=round(average_score, 2),
          created_at=session.updated_at
        )
      )

  writing_average = round(sum(submission_scores) / len(submission_scores), 2) if submission_scores else 0.0
  writing_summary = WritingSummary(
    average_score=writing_average,
    recent_submissions=submission_summaries
  )

  learn_sessions = (
    db.query(LearnSession)
    .filter(LearnSession.user_id == user.id)
    .order_by(LearnSession.created_at.desc())
    .all()
  )
  learn_scores = [s.score for s in learn_sessions if s.score is not None]
  learn_average = round(sum(learn_scores) / len(learn_scores), 2) if learn_scores else 0.0
  learn_summaries: list[LearnSessionSummary] = [
    LearnSessionSummary(
      id=s.id,
      topic=s.topic,
      level=s.level,
      score=s.score,
      exercises_completed=s.exercises_completed,
      exercises_total=s.exercises_total,
      created_at=s.created_at
    )
    for s in learn_sessions[:3]
  ]
  learning_summary = LearnSummary(average_score=learn_average, recent_sessions=learn_summaries)

  return DashboardSummaryResponse(
    reading=reading_summary,
    listening=listening_summary,
    writing=writing_summary,
    learning=learning_summary
  )

