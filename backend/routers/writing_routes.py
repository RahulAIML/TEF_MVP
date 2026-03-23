import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai_service import (
  evaluate_writing_step,
  evaluate_writing_task,
  generate_writing_tasks
)
from auth import get_optional_user
from database import get_db
from models import User, WritingSession
from schemas import (
  GenerateWritingTasksRequest,
  GenerateWritingTasksResponse,
  WritingEvaluationRequest,
  WritingEvaluationResponse,
  WritingProgressRequest,
  WritingProgressResponse,
  WritingStepFeedbackRequest,
  WritingStepFeedbackResponse,
  WritingSubmitRequest,
  WritingSubmitResponse
)

router = APIRouter(tags=["writing"])


@router.post("/generate-writing-tasks", response_model=GenerateWritingTasksResponse)
async def post_generate_writing_tasks(
  payload: GenerateWritingTasksRequest,
  _user: User = Depends(get_optional_user)
) -> GenerateWritingTasksResponse:
  try:
    prompts = generate_writing_tasks()
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error

  return GenerateWritingTasksResponse(**prompts)


@router.post("/evaluate-writing", response_model=WritingEvaluationResponse)
async def post_evaluate_writing(
  payload: WritingEvaluationRequest,
  _user: User = Depends(get_optional_user)
) -> WritingEvaluationResponse:
  try:
    evaluation = evaluate_writing_task(payload.task_type, payload.prompt, payload.response_text)
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error

  return WritingEvaluationResponse(**evaluation)


@router.post("/evaluate-writing-step", response_model=WritingStepFeedbackResponse)
async def post_evaluate_writing_step(
  payload: WritingStepFeedbackRequest,
  _user: User = Depends(get_optional_user)
) -> WritingStepFeedbackResponse:
  try:
    evaluation = evaluate_writing_step(payload.task_type, payload.step, payload.prompt, payload.text)
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error

  return WritingStepFeedbackResponse(**evaluation)


@router.post("/writing/save-progress", response_model=WritingProgressResponse)
async def post_save_writing_progress(
  payload: WritingProgressRequest,
  db: Session = Depends(get_db),
  user: User = Depends(get_optional_user)
) -> WritingProgressResponse:
  session = (
    db.query(WritingSession)
    .filter(WritingSession.session_id == payload.session_id, WritingSession.user_id == user.id)
    .first()
  )

  if session is None:
    session = WritingSession(
      user_id=user.id,
      session_id=payload.session_id,
      mode=payload.mode
    )
    db.add(session)

  steps_json = json.dumps(payload.steps, ensure_ascii=False)
  if payload.task_type == "task1":
    session.task1_steps = steps_json
    if payload.task_prompt:
      session.task1_prompt = payload.task_prompt
  else:
    session.task2_steps = steps_json
    if payload.task_prompt:
      session.task2_prompt = payload.task_prompt

  session.updated_at = datetime.utcnow()
  db.commit()

  return WritingProgressResponse(status="saved")


@router.post("/writing/submit", response_model=WritingSubmitResponse)
async def post_submit_writing(
  payload: WritingSubmitRequest,
  db: Session = Depends(get_db),
  user: User = Depends(get_optional_user)
) -> WritingSubmitResponse:
  try:
    evaluation_task1 = evaluate_writing_task("task1", payload.task1_prompt, payload.task1_text)
    evaluation_task2 = evaluate_writing_task("task2", payload.task2_prompt, payload.task2_text)
  except RuntimeError as error:
    raise HTTPException(status_code=500, detail=str(error)) from error

  session = (
    db.query(WritingSession)
    .filter(WritingSession.session_id == payload.session_id, WritingSession.user_id == user.id)
    .first()
  )
  if session is None:
    session = WritingSession(
      user_id=user.id,
      session_id=payload.session_id,
      mode=payload.mode
    )
    db.add(session)

  session.task1_prompt = payload.task1_prompt
  session.task2_prompt = payload.task2_prompt
  session.task1_text = payload.task1_text
  session.task2_text = payload.task2_text
  session.task1_steps = json.dumps(payload.task1_steps or {}, ensure_ascii=False)
  session.task2_steps = json.dumps(payload.task2_steps or {}, ensure_ascii=False)
  session.task1_evaluation = json.dumps(evaluation_task1, ensure_ascii=False)
  session.task2_evaluation = json.dumps(evaluation_task2, ensure_ascii=False)
  session.is_submitted = True
  session.updated_at = datetime.utcnow()
  db.commit()

  return WritingSubmitResponse(
    task1=WritingEvaluationResponse(**evaluation_task1),
    task2=WritingEvaluationResponse(**evaluation_task2)
  )

