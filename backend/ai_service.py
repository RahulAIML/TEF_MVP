from __future__ import annotations

import json
import os
import random
import re
from typing import Any, Dict, Tuple

import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import ValidationError

from schemas import ExamQuestion, PassageResponse, WordMeaningResponse

load_dotenv()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")

DOMAINS = [
  "culture and arts",
  "travel and geography",
  "history",
  "daily life and routines",
  "science and innovation",
  "health and wellness",
  "education",
  "business and careers",
  "environment and sustainability",
  "cuisine and food culture"
]

QUESTION_PROFILES = [
  (1, 7, "everyday_life", "Everyday-life document"),
  (8, 17, "gap_fill", "Incomplete sentences / gap-fill text"),
  (18, 22, "rapid_reading", "Rapid reading of texts or graphics"),
  (23, 32, "administrative", "Administrative or professional document"),
  (33, 40, "press", "Press article")
]

_last_domain: str | None = None


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


def _normalize_exam_question(payload: Dict[str, Any], question_type: str) -> Dict[str, Any]:
  options_raw = payload.get("options", [])
  options = [str(item) for item in options_raw][:4]
  while len(options) < 4:
    options.append("Option missing")
  options = [_normalize_option(option, index) for index, option in enumerate(options)]

  raw_answer = str(payload.get("correct_answer", "")).strip().upper()
  answer_match = re.match(r"([A-D])", raw_answer)
  normalized_answer = answer_match.group(1) if answer_match else "A"

  return {
    "text": str(payload.get("text", "")).strip(),
    "question": str(payload.get("question", "")).strip(),
    "options": options,
    "correct_answer": normalized_answer,
    "explanation": str(payload.get("explanation", "")).strip(),
    "question_type": question_type
  }


def _pick_domain() -> str:
  global _last_domain
  choices = [domain for domain in DOMAINS if domain != _last_domain]
  if not choices:
    choices = DOMAINS[:]
  selected = random.choice(choices)
  _last_domain = selected
  return selected


def _question_profile(question_number: int) -> Tuple[str, str]:
  for start, end, key, label in QUESTION_PROFILES:
    if start <= question_number <= end:
      return key, label
  return "everyday_life", "Everyday-life document"


def generate_exam_question(question_number: int) -> ExamQuestion:
  question_type, label = _question_profile(question_number)

  guidance = {
    "everyday_life": "Use a notice, email, ad, or public service message.",
    "gap_fill": "Include a short text with one blank (____). The question asks for the best completion.",
    "rapid_reading": "Use a short text or schedule/graphic described in words to test quick scanning.",
    "administrative": "Use a memo, policy excerpt, form, or workplace announcement.",
    "press": "Use a brief press article or news report extract."
  }[question_type]

  prompt = f"""
Generate one TEF Canada reading question in French.

Return JSON with:
text
question
options (array of 4)
correct_answer
explanation
question_type

Rules:
- Language: French only.
- Question number: {question_number} of 40.
- Question type: {label}.
- {guidance}
- Text length: 60 to 140 words.
- correct_answer must be one of A, B, C, D.
- Output valid JSON only (no markdown, no commentary).
- Use this exact JSON shape:
{{
  "text": "string",
  "question": "string",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct_answer": "A",
  "explanation": "string",
  "question_type": "{question_type}"
}}
"""

  last_error: Exception | None = None
  for _ in range(5):
    try:
      payload = _generate_json(prompt, temperature=0.75)
      normalized = _normalize_exam_question(payload, question_type)
      return ExamQuestion.model_validate(normalized)
    except Exception as error:
      last_error = error
      continue

  raise RuntimeError(f"Gemini response validation failed after retries: {last_error}") from last_error


def generate_passage() -> PassageResponse:
  domain = _pick_domain()
  prompt = f"""
Generate a TEF Canada B2 reading passage in French.

Return JSON with:
title
passage

Rules:
- Passage length: 250 to 350 words.
- Domain: {domain}. Keep the topic focused on this domain.
- Output valid JSON only (no markdown, no commentary).
- Use this exact JSON shape:
{{
  "title": "string",
  "passage": "string"
}}
"""

  payload = _generate_json(prompt, temperature=0.85)
  try:
    return PassageResponse.model_validate(payload)
  except ValidationError as validation_error:
    raise RuntimeError(
      f"Gemini response validation failed for passage generation: {validation_error}"
    ) from validation_error


def explain_word(word: str) -> WordMeaningResponse:
  clean_word = word.strip()
  prompt = f"""
Explain the French word or phrase for a B2 learner.

Return JSON with:
word
part_of_speech
definition_simple
french_explanation
english_translation
example_sentence
synonyms

Word or phrase: {clean_word}

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
