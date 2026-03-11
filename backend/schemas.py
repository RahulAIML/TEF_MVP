from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field, field_validator

AnswerOption = Literal["A", "B", "C", "D"]


class ReadingQuestion(BaseModel):
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


class ReadingExerciseResponse(BaseModel):
  title: str
  passage: str
  questions: List[ReadingQuestion]

  @field_validator("questions")
  @classmethod
  def validate_question_count(cls, questions: List[ReadingQuestion]) -> List[ReadingQuestion]:
    if len(questions) != 8:
      raise ValueError("Exercise must contain exactly 8 questions.")
    return questions


class GenerateReadingRequest(BaseModel):
  mode: Literal["exam", "practice"]
  part: Literal[1, 2, 3]


class WordMeaningRequest(BaseModel):
  word: str = Field(min_length=1, max_length=60)


class WordMeaningResponse(BaseModel):
  word: str
  part_of_speech: str
  definition_simple: str
  french_explanation: str
  english_translation: str
  example_sentence: str
  synonyms: List[str]


class SubmitReadingRequest(BaseModel):
  answers: List[str]

  @field_validator("answers")
  @classmethod
  def normalize_answers(cls, answers: List[str]) -> List[str]:
    normalized = []
    for answer in answers:
      clean = (answer or "").strip().upper()
      if clean and clean not in {"A", "B", "C", "D"}:
        raise ValueError("Answers must be one of A, B, C, D, or empty string.")
      normalized.append(clean)
    return normalized


class SubmissionResultItem(BaseModel):
  question_index: int
  correct_answer: AnswerOption
  user_answer: str
  is_correct: bool
  explanation: str


class SubmissionResponse(BaseModel):
  score: int
  total: int
  results: List[SubmissionResultItem]


class SpeechToTextResponse(BaseModel):
  transcript: str
