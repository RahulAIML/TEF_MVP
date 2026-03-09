from __future__ import annotations

import json
import os
import re
from threading import Lock
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import ValidationError

from schemas import ReadingExerciseResponse, WordMeaningResponse

load_dotenv()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")

_cache_lock = Lock()
_last_exercise: Optional[ReadingExerciseResponse] = None


def _ensure_api_key() -> None:
  if not API_KEY:
    raise RuntimeError(
      "Missing API key. Set GEMINI_API_KEY (preferred) or OPENAI_API_KEY in backend/.env."
    )


def _extract_json_payload(text: str) -> Dict[str, Any]:
  stripped = text.strip()
  try:
    return json.loads(stripped)
  except json.JSONDecodeError:
    pass

  match = re.search(r"\{[\s\S]*\}", stripped)
  if not match:
    raise ValueError("Could not find JSON object in Gemini response.")

  return json.loads(match.group(0))


def _generate_json(prompt: str, temperature: float = 0.7) -> Dict[str, Any]:
  _ensure_api_key()
  genai.configure(api_key=API_KEY)
  model = genai.GenerativeModel(MODEL_NAME)
  try:
    response = model.generate_content(
      prompt,
      generation_config=genai.types.GenerationConfig(
        temperature=temperature,
        response_mime_type="application/json"
      )
    )
  except Exception as error:
    raise RuntimeError(f"Gemini generate_content failed with model '{MODEL_NAME}': {error}") from error

  if not getattr(response, "text", None):
    raise RuntimeError("Gemini returned an empty response.")

  return _extract_json_payload(response.text)


def _normalize_option(option: str, option_index: int) -> str:
  letters = ["A", "B", "C", "D"]
  clean = option.strip()
  if re.match(r"^[A-D][).:\-\s]+", clean, flags=re.IGNORECASE):
    return clean
  return f"{letters[option_index]}. {clean}"


def _normalize_question(question_payload: Dict[str, Any]) -> Dict[str, Any]:
  options_raw = question_payload.get("options", [])
  options = [str(item) for item in options_raw][:4]
  while len(options) < 4:
    options.append("Option missing")
  options = [_normalize_option(option, index) for index, option in enumerate(options)]

  raw_answer = str(question_payload.get("correct_answer", "")).strip().upper()
  answer_match = re.match(r"([A-D])", raw_answer)
  normalized_answer = answer_match.group(1) if answer_match else "A"

  return {
    "question": str(question_payload.get("question", "")).strip(),
    "options": options,
    "correct_answer": normalized_answer,
    "explanation": str(question_payload.get("explanation", "")).strip()
  }


def generate_reading_exercise() -> ReadingExerciseResponse:
  prompt = """
Generate a TEF Canada B2 reading comprehension exercise.

Return JSON containing:
title
passage (250 words)
8 MCQ questions.

Each question must include:
question
4 options
correct_answer
explanation

Questions types:
main idea
detail
inference
vocabulary in context

Strict requirements:
- Passage language must be French.
- Passage length: between 250 and 300 words.
- Topic should be one of: society, work, environment, technology.
- Options should be plausible and clearly distinct.
- correct_answer must be one of: A, B, C, D.
- Output must be valid JSON only (no markdown, no commentary).
- Use this exact JSON shape:
{
  "title": "string",
  "passage": "string",
  "questions": [
    {
      "question": "string",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A",
      "explanation": "string"
    }
  ]
}
"""

  payload = _generate_json(prompt, temperature=0.85)
  payload["questions"] = [
    _normalize_question(question)
    for question in payload.get("questions", [])
  ]

  try:
    exercise = ReadingExerciseResponse.model_validate(payload)
  except ValidationError as validation_error:
    raise RuntimeError(
      f"Gemini response validation failed for reading exercise: {validation_error}"
    ) from validation_error

  set_last_exercise(exercise)
  return exercise


def explain_word(word: str) -> WordMeaningResponse:
  clean_word = word.strip()
  prompt = f"""
Explain the French word for a B2 learner.

Return JSON with:
word
part_of_speech
definition_simple
french_explanation
english_translation
example_sentence
synonyms

Word: {clean_word}

Rules:
- Keep outputs concise and learner-friendly.
- example_sentence must be in French.
- synonyms should be a JSON array of 3 to 6 French synonyms.
- The "word" field in output must exactly match: {clean_word}
- Output valid JSON only.
"""

  payload = _generate_json(prompt, temperature=0.4)
  synonyms = payload.get("synonyms", [])
  if isinstance(synonyms, str):
    synonyms = [part.strip() for part in synonyms.split(",") if part.strip()]
  payload["synonyms"] = [str(item).strip() for item in synonyms]
  payload["word"] = clean_word

  try:
    return WordMeaningResponse.model_validate(payload)
  except ValidationError as validation_error:
    raise RuntimeError(
      f"Gemini response validation failed for dictionary lookup: {validation_error}"
    ) from validation_error


def set_last_exercise(exercise: ReadingExerciseResponse) -> None:
  global _last_exercise
  with _cache_lock:
    _last_exercise = exercise


def get_last_exercise() -> Optional[ReadingExerciseResponse]:
  with _cache_lock:
    return _last_exercise
