from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ai_service import analyze_learn_content, evaluate_learn_answer, extract_text_from_image_bytes, generate_more_exercises
from auth import get_optional_user
from database import get_db
from models import LearnSession, User
from schemas import (
  LearnAnalyzeRequest,
  LearnContentResponse,
  LearnEvaluateRequest,
  LearnEvaluationResponse,
  LearnExercise,
  LearnMoreExercisesRequest,
  LearnSaveSessionRequest,
  LearnSessionSummary
)

logger = logging.getLogger("tef.learn")
router = APIRouter(prefix="/learn", tags=["learn"])


@router.post("/analyze", response_model=LearnContentResponse)
async def analyze_content(
  payload: LearnAnalyzeRequest,
  _user: User = Depends(get_optional_user)
) -> LearnContentResponse:
  try:
    result = analyze_learn_content(payload.text)
  except Exception as err:
    logger.error("analyze_learn_content failed: %s", err)
    raise HTTPException(status_code=500, detail="Content analysis failed. Please try again.")
  return LearnContentResponse(**result)


@router.post("/upload")
async def upload_content(
  file: UploadFile = File(...),
  _user: User = Depends(get_optional_user)
) -> dict:
  """Accept PDF or image upload; extract text and return it for the frontend to send to /learn/analyze."""
  content_type = (file.content_type or "").lower()
  raw = await file.read()

  if content_type == "application/pdf" or file.filename.endswith(".pdf"):
    text = _extract_pdf_text(raw)
    source_type = "pdf"
  elif content_type.startswith("image/"):
    text = extract_text_from_image_bytes(raw, content_type)
    source_type = "image"
  else:
    raise HTTPException(status_code=415, detail="Only PDF and image files are supported.")

  if not text.strip():
    raise HTTPException(status_code=422, detail="No readable text found in the file.")

  return {"text": text, "source_type": source_type}


@router.post("/evaluate", response_model=LearnEvaluationResponse)
async def evaluate_answer(
  payload: LearnEvaluateRequest,
  _user: User = Depends(get_optional_user)
) -> LearnEvaluationResponse:
  try:
    result = evaluate_learn_answer(
      exercise_type=payload.exercise_type,
      question=payload.question,
      correct_answer=payload.correct_answer,
      user_answer=payload.user_answer,
      context=payload.context
    )
  except Exception as err:
    logger.error("evaluate_learn_answer failed: %s", err)
    raise HTTPException(status_code=500, detail="Evaluation failed. Please try again.")
  return LearnEvaluationResponse(**result)


@router.post("/more-exercises", response_model=list[LearnExercise])
async def more_exercises(
  payload: LearnMoreExercisesRequest,
  _user: User = Depends(get_optional_user)
) -> list[LearnExercise]:
  try:
    raw = generate_more_exercises(payload.topic, payload.level, payload.summary)
  except Exception as err:
    logger.error("generate_more_exercises failed: %s", err)
    raise HTTPException(status_code=500, detail="Failed to generate exercises. Please try again.")
  exercises = []
  for item in raw:
    try:
      exercises.append(LearnExercise(**item))
    except Exception:
      continue
  if not exercises:
    raise HTTPException(status_code=500, detail="No valid exercises generated.")
  return exercises


@router.post("/session/save", response_model=LearnSessionSummary)
async def save_session(
  payload: LearnSaveSessionRequest,
  db: Session = Depends(get_db),
  user: User = Depends(get_optional_user)
) -> LearnSessionSummary:
  session = LearnSession(
    user_id=user.id,
    source_type=payload.source_type,
    topic=payload.topic,
    level=payload.level,
    score=payload.score,
    grammar=payload.grammar,
    vocabulary=payload.vocabulary,
    structure=payload.structure,
    exercises_total=payload.exercises_total,
    exercises_completed=payload.exercises_completed
  )
  db.add(session)
  db.commit()
  db.refresh(session)
  return LearnSessionSummary(
    id=session.id,
    topic=session.topic,
    level=session.level,
    score=session.score,
    exercises_completed=session.exercises_completed,
    exercises_total=session.exercises_total,
    created_at=session.created_at
  )


def _extract_pdf_text(raw: bytes) -> str:
  try:
    import pypdf
    import io
    reader = pypdf.PdfReader(io.BytesIO(raw))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()
  except ImportError:
    logger.warning("pypdf not installed; falling back to empty PDF text")
    return ""
  except Exception as err:
    logger.error("PDF extraction error: %s", err)
    return ""
