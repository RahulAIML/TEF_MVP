from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal

from pydantic import BaseModel, Field, field_validator

AnswerOption = Literal["A", "B", "C", "D"]
ExamQuestionType = Literal[
  "everyday_life",
  "gap_fill",
  "rapid_reading",
  "administrative",
  "press"
]


class GenerateQuestionRequest(BaseModel):
  question_number: int = Field(ge=1, le=40)
  session_id: str | None = None


class ExamQuestion(BaseModel):
  text: str
  question: str
  options: List[str] = Field(default_factory=list)
  correct_answer: AnswerOption
  explanation: str
  question_type: ExamQuestionType

  @field_validator("options")
  @classmethod
  def validate_options(cls, options: List[str]) -> List[str]:
    if len(options) != 4:
      raise ValueError("Each question must contain exactly 4 options.")
    return options


class GenerateQuestionResponse(ExamQuestion):
  question_number: int


class SubmitExamQuestion(BaseModel):
  question_number: int = Field(ge=1, le=40)
  correct_answer: AnswerOption
  question_type: ExamQuestionType
  explanation: str


class SubmitExamRequest(BaseModel):
  started_at: datetime
  completed_at: datetime
  answers: Dict[int, str]
  questions: List[SubmitExamQuestion]

  @field_validator("answers")
  @classmethod
  def normalize_answers(cls, answers: Dict[int, str]) -> Dict[int, str]:
    normalized: Dict[int, str] = {}
    for key, value in answers.items():
      clean = (value or "").strip().upper()
      if clean and clean not in {"A", "B", "C", "D"}:
        raise ValueError("Answers must be one of A, B, C, D, or empty string.")
      normalized[int(key)] = clean
    return normalized


class ExamResultItem(BaseModel):
  question_number: int
  correct_answer: AnswerOption
  user_answer: str
  is_correct: bool
  explanation: str
  question_type: ExamQuestionType


class SubmitExamResponse(BaseModel):
  score: int
  total: int
  accuracy: float
  completion_time: int
  results: List[ExamResultItem]


class PassageResponse(BaseModel):
  title: str
  passage: str


class PassageQuizQuestion(BaseModel):
  question: str
  options: List[str] = Field(default_factory=list)
  correct_answer: AnswerOption
  explanation: str

  @field_validator("options")
  @classmethod
  def validate_options(cls, options: List[str]) -> List[str]:
    if len(options) != 4:
      raise ValueError("Each question must contain exactly 4 options.")
    return options


class PassageQuizResponse(BaseModel):
  title: str
  passage: str
  questions: List[PassageQuizQuestion]

  @field_validator("questions")
  @classmethod
  def validate_question_count(cls, questions: List[PassageQuizQuestion]) -> List[PassageQuizQuestion]:
    if len(questions) != 10:
      raise ValueError("Passage quiz must contain exactly 10 questions.")
    return questions


class WordMeaningRequest(BaseModel):
  word: str = Field(min_length=1, max_length=120)


class WordMeaningResponse(BaseModel):
  word: str
  part_of_speech: str
  definition_simple: str
  french_explanation: str
  english_translation: str
  example_sentence: str
  synonyms: List[str]


class GenerateListeningQuestionRequest(BaseModel):
  question_number: int = Field(ge=1, le=40)
  session_id: str | None = None


class ListeningQuestionResponse(BaseModel):
  script: str
  audio: str
  audio_mime: str | None = None
  question: str
  options: List[str] = Field(default_factory=list)
  correct_answer: AnswerOption
  explanation: str

  @field_validator("options")
  @classmethod
  def validate_options(cls, options: List[str]) -> List[str]:
    if len(options) != 4:
      raise ValueError("Each question must contain exactly 4 options.")
    return options


class ExplainTextRequest(BaseModel):
  text: str = Field(min_length=1)


class ExplainTextResponse(BaseModel):
  meaning: str
  explanation: str
  translation: str
  example: str


class SignupRequest(BaseModel):
  email: str = Field(min_length=5, max_length=255)
  password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
  email: str = Field(min_length=5, max_length=255)
  password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
  id: int
  email: str
  created_at: datetime


class AuthResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  user: UserResponse


class RecentExam(BaseModel):
  id: int
  score: int
  accuracy: float
  created_at: datetime


class DashboardSummaryResponse(BaseModel):
  average_accuracy: float
  recent_exams: List[RecentExam]
  weakest_question_type: str
