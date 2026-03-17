from __future__ import annotations

import json
import base64
from collections import deque
import hashlib
import os
import random
import re
import uuid
from typing import Any, Dict, Tuple

import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import ValidationError

from schemas import ExamQuestion, PassageQuizResponse, PassageResponse, WordMeaningResponse, ListeningQuestionResponse

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

SCENARIO_PLACES = [
  "Montreal",
  "Quebec",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Nantes",
  "Grenoble",
  "Rennes",
  "Bordeaux",
  "Lille"
]

SCENARIO_CONTEXTS = [
  "un centre communautaire",
  "une ecole municipale",
  "une bibliotheque",
  "une entreprise locale",
  "un service public",
  "une association culturelle",
  "un marche de quartier",
  "un hopital",
  "un bureau administratif",
  "un parc urbain"
]

RECENT_PASSAGE_HASHES = deque(maxlen=25)

EXAM_HASHES_PER_SESSION = 50
EXAM_HASHES_PER_SESSION_ALL = 250
MAX_EXAM_SESSIONS = 200
RECENT_EXAM_HASHES_BY_SESSION: dict[str, dict[str, deque[str]]] = {}
RECENT_EXAM_HASHES_ALL_BY_SESSION: dict[str, deque[str]] = {}
RECENT_EXAM_TEXT_HASHES_ALL_BY_SESSION: dict[str, deque[str]] = {}
RECENT_EXAM_SESSIONS: deque[str] = deque()
RECENT_EXAM_HASHES_GLOBAL: dict[str, deque[str]] = {}
RECENT_EXAM_HASHES_ALL_GLOBAL: deque[str] = deque(maxlen=EXAM_HASHES_PER_SESSION_ALL)
RECENT_EXAM_TEXT_HASHES_ALL_GLOBAL: deque[str] = deque(maxlen=EXAM_HASHES_PER_SESSION_ALL)

LISTENING_HASHES_PER_SESSION = 80
LISTENING_HASHES_PER_SESSION_ALL = 200
RECENT_LISTENING_HASHES_BY_SESSION: dict[str, deque[str]] = {}
RECENT_LISTENING_HASHES_ALL_BY_SESSION: dict[str, deque[str]] = {}
RECENT_LISTENING_SCRIPT_HASHES_ALL_BY_SESSION: dict[str, deque[str]] = {}
RECENT_LISTENING_SESSIONS: deque[str] = deque()
RECENT_LISTENING_HASHES_GLOBAL: deque[str] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)
RECENT_LISTENING_HASHES_ALL_GLOBAL: deque[str] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)
RECENT_LISTENING_SCRIPT_HASHES_ALL_GLOBAL: deque[str] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)

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


def _normalize_passage_question(payload: Dict[str, Any]) -> Dict[str, Any]:
  options_raw = payload.get("options", [])
  options = [str(item) for item in options_raw][:4]
  while len(options) < 4:
    options.append("Option missing")
  options = [_normalize_option(option, index) for index, option in enumerate(options)]

  raw_answer = str(payload.get("correct_answer", "")).strip().upper()
  answer_match = re.match(r"([A-D])", raw_answer)
  normalized_answer = answer_match.group(1) if answer_match else "A"

  return {
    "question": str(payload.get("question", "")).strip(),
    "options": options,
    "correct_answer": normalized_answer,
    "explanation": str(payload.get("explanation", "")).strip()
  }


def _freshness_token() -> str:
  return uuid.uuid4().hex[:8]

def _scenario_from_seed(seed: str) -> tuple[str, str]:
  rng = random.Random(seed)
  place = rng.choice(SCENARIO_PLACES)
  context = rng.choice(SCENARIO_CONTEXTS)
  return place, context


def _passage_fingerprint(title: str, passage: str) -> str:
  normalized = re.sub(r"\s+", " ", f"{title} {passage}".strip().lower())
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def _starts_with_avis(text: str) -> bool:
  return bool(re.match(r"(?i)^\s*avis\b", text))

def _exam_fingerprint(question: ExamQuestion) -> str:
  normalized = re.sub(
    r"\s+",
    " ",
    f"{question.text} {question.question} {' '.join(question.options)}".strip().lower()
  )
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _exam_text_fingerprint(text: str) -> str:
  normalized = re.sub(r"\s+", " ", text.strip().lower())
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _ensure_exam_session(session_id: str) -> None:
  if session_id in RECENT_EXAM_HASHES_BY_SESSION:
    if session_id not in RECENT_EXAM_HASHES_ALL_BY_SESSION:
      RECENT_EXAM_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=EXAM_HASHES_PER_SESSION_ALL)
    if session_id not in RECENT_EXAM_TEXT_HASHES_ALL_BY_SESSION:
      RECENT_EXAM_TEXT_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=EXAM_HASHES_PER_SESSION_ALL)
    return

  RECENT_EXAM_HASHES_BY_SESSION[session_id] = {}
  RECENT_EXAM_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=EXAM_HASHES_PER_SESSION_ALL)
  RECENT_EXAM_TEXT_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=EXAM_HASHES_PER_SESSION_ALL)
  RECENT_EXAM_SESSIONS.append(session_id)
  if len(RECENT_EXAM_SESSIONS) > MAX_EXAM_SESSIONS:
    oldest = RECENT_EXAM_SESSIONS.popleft()
    RECENT_EXAM_HASHES_BY_SESSION.pop(oldest, None)
    RECENT_EXAM_HASHES_ALL_BY_SESSION.pop(oldest, None)
    RECENT_EXAM_TEXT_HASHES_ALL_BY_SESSION.pop(oldest, None)


def _get_exam_cache(session_id: str | None, question_type: str) -> deque[str]:
  if not session_id:
    return RECENT_EXAM_HASHES_GLOBAL.setdefault(
      question_type,
      deque(maxlen=EXAM_HASHES_PER_SESSION)
    )

  _ensure_exam_session(session_id)
  session_cache = RECENT_EXAM_HASHES_BY_SESSION[session_id]
  if question_type not in session_cache:
    session_cache[question_type] = deque(maxlen=EXAM_HASHES_PER_SESSION)

  return session_cache[question_type]


def _get_exam_cache_all(session_id: str | None) -> deque[str]:
  if not session_id:
    return RECENT_EXAM_HASHES_ALL_GLOBAL

  _ensure_exam_session(session_id)
  return RECENT_EXAM_HASHES_ALL_BY_SESSION[session_id]



def _get_exam_text_cache_all(session_id: str | None) -> deque[str]:
  if not session_id:
    return RECENT_EXAM_TEXT_HASHES_ALL_GLOBAL

  _ensure_exam_session(session_id)
  return RECENT_EXAM_TEXT_HASHES_ALL_BY_SESSION[session_id]




def _listening_fingerprint(script: str, question: str, options: list[str]) -> str:
  normalized = re.sub(r"\s+", " ", f"{script} {question} {' '.join(options)}".strip().lower())
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _listening_script_fingerprint(script: str) -> str:
  normalized = re.sub(r"\s+", " ", script.strip().lower())
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _ensure_listening_session(session_id: str) -> None:
  if session_id in RECENT_LISTENING_HASHES_BY_SESSION:
    if session_id not in RECENT_LISTENING_HASHES_ALL_BY_SESSION:
      RECENT_LISTENING_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)
    if session_id not in RECENT_LISTENING_SCRIPT_HASHES_ALL_BY_SESSION:
      RECENT_LISTENING_SCRIPT_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)
    return

  RECENT_LISTENING_HASHES_BY_SESSION[session_id] = deque(maxlen=LISTENING_HASHES_PER_SESSION)
  RECENT_LISTENING_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)
  RECENT_LISTENING_SCRIPT_HASHES_ALL_BY_SESSION[session_id] = deque(maxlen=LISTENING_HASHES_PER_SESSION_ALL)
  RECENT_LISTENING_SESSIONS.append(session_id)
  if len(RECENT_LISTENING_SESSIONS) > MAX_EXAM_SESSIONS:
    oldest = RECENT_LISTENING_SESSIONS.popleft()
    RECENT_LISTENING_HASHES_BY_SESSION.pop(oldest, None)
    RECENT_LISTENING_HASHES_ALL_BY_SESSION.pop(oldest, None)
    RECENT_LISTENING_SCRIPT_HASHES_ALL_BY_SESSION.pop(oldest, None)


def _get_listening_cache(session_id: str | None) -> deque[str]:
  if not session_id:
    return RECENT_LISTENING_HASHES_GLOBAL

  _ensure_listening_session(session_id)
  return RECENT_LISTENING_HASHES_BY_SESSION.setdefault(session_id, deque(maxlen=LISTENING_HASHES_PER_SESSION))


def _get_listening_cache_all(session_id: str | None) -> deque[str]:
  if not session_id:
    return RECENT_LISTENING_HASHES_ALL_GLOBAL

  _ensure_listening_session(session_id)
  return RECENT_LISTENING_HASHES_ALL_BY_SESSION[session_id]


def _get_listening_script_cache_all(session_id: str | None) -> deque[str]:
  if not session_id:
    return RECENT_LISTENING_SCRIPT_HASHES_ALL_GLOBAL

  _ensure_listening_session(session_id)
  return RECENT_LISTENING_SCRIPT_HASHES_ALL_BY_SESSION[session_id]


def _normalize_listening_question(payload: Dict[str, Any]) -> Dict[str, Any]:
  options_raw = payload.get("options", [])
  options = [str(item) for item in options_raw][:4]
  while len(options) < 4:
    options.append("Option manquante")
  options = [_normalize_option(option, index) for index, option in enumerate(options)]

  raw_answer = str(payload.get("correct_answer", "")).strip().upper()
  answer_match = re.match(r"([A-D])", raw_answer)
  normalized_answer = answer_match.group(1) if answer_match else "A"

  return {
    "script": str(payload.get("script", "")).strip(),
    "question": str(payload.get("question", "")).strip(),
    "options": options,
    "correct_answer": normalized_answer,
    "explanation": str(payload.get("explanation", "")).strip()
  }


def _generate_tts_audio(script: str) -> str:
  _ensure_api_key()
  genai.configure(api_key=API_KEY)
  model = genai.GenerativeModel(MODEL_NAME)
  try:
    response = model.generate_content(
      [script],
      generation_config=genai.types.GenerationConfig(response_mime_type="audio/mp3")
    )
  except Exception as error:
    raise RuntimeError(f"Gemini TTS failed with model '{MODEL_NAME}': {error}") from error

  inline_part = None
  for part in getattr(response, "parts", []) or []:
    inline = getattr(part, "inline_data", None)
    if inline:
      inline_part = inline
      break
  if inline_part is None:
    inline_part = getattr(response, "inline_data", None)

  if inline_part is None or not getattr(inline_part, "data", None):
    raise RuntimeError("Gemini TTS returned no audio data.")

  data = inline_part.data
  if isinstance(data, bytes):
    audio_bytes = data
  else:
    audio_bytes = base64.b64decode(data)
  return base64.b64encode(audio_bytes).decode("utf-8")


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


def generate_exam_question(question_number: int, session_id: str | None = None) -> ExamQuestion:
  question_type, label = _question_profile(question_number)
  freshness_token = _freshness_token()
  place, context = _scenario_from_seed(freshness_token)

  guidance = {
    "everyday_life": "Use a mix of formats (short email, SMS, poster, timetable, instruction, chat message, memo, ad). Avoid always using Avis headings.",
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
- The text must be unique within this session; do not reuse any previous situation, wording, or setting.
- Scenario anchor: The text must take place in {place} and involve {context}.
- Freshness seed: {freshness_token}. Use it to create a new scenario. Do not include the seed in the output.
- Ensure the setting, names, and situation differ from previous questions of this type.
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
  for _ in range(8):
    try:
      payload = _generate_json(prompt, temperature=1.0)
      normalized = _normalize_exam_question(payload, question_type)
      question = ExamQuestion.model_validate(normalized)
      if question_type == "everyday_life" and _starts_with_avis(question.text):
        last_error = RuntimeError("Everyday-life text started with 'Avis'; retrying.")
        continue
      fingerprint = _exam_fingerprint(question)
      text_fingerprint = _exam_text_fingerprint(question.text)
      cache = _get_exam_cache(session_id, question_type)
      cache_all = _get_exam_cache_all(session_id)
      text_cache_all = _get_exam_text_cache_all(session_id)
      global_cache = _get_exam_cache(None, question_type)
      global_cache_all = _get_exam_cache_all(None)
      global_text_cache_all = _get_exam_text_cache_all(None)
      if (
        fingerprint in cache
        or fingerprint in cache_all
        or text_fingerprint in text_cache_all
        or fingerprint in global_cache
        or fingerprint in global_cache_all
        or text_fingerprint in global_text_cache_all
      ):
        last_error = RuntimeError("Duplicate question generated; retrying.")
        continue
      cache.append(fingerprint)
      cache_all.append(fingerprint)
      text_cache_all.append(text_fingerprint)
      global_cache.append(fingerprint)
      global_cache_all.append(fingerprint)
      global_text_cache_all.append(text_fingerprint)
      return question
    except Exception as error:
      last_error = error
      continue

  raise RuntimeError(f"Gemini response validation failed after retries: {last_error}") from last_error


def generate_listening_question(question_number: int, session_id: str | None = None) -> ListeningQuestionResponse:
  domain = _pick_domain()
  freshness_token = _freshness_token()
  place, context = _scenario_from_seed(freshness_token)
  prompt = f"""
Generate one TEF Canada listening question in French.

Return JSON with:
script
question
options (array of 4)
correct_answer
explanation

Rules:
- Language: French only.
- Script length: 20 to 40 seconds when spoken (roughly 90 to 140 words).
- Style: natural spoken French; can be an announcement, interview, news brief, or dialogue.
- Topic: {domain}; set in {place} involving {context}.
- Include one clear MCQ question based on the script.
- Options: exactly 4. correct_answer must be one of A, B, C, D.
- Output valid JSON only (no markdown, no commentary).
- Use this exact JSON shape:
{{
  "script": "string",
  "question": "string",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct_answer": "A",
  "explanation": "string"
}}
"""

  last_error: Exception | None = None
  for _ in range(6):
    try:
      payload = _generate_json(prompt, temperature=0.95)
      normalized = _normalize_listening_question(payload)
      fingerprint = _listening_fingerprint(
        normalized["script"],
        normalized["question"],
        normalized["options"]
      )
      script_fingerprint = _listening_script_fingerprint(normalized["script"])
      cache = _get_listening_cache(session_id)
      cache_all = _get_listening_cache_all(session_id)
      script_cache_all = _get_listening_script_cache_all(session_id)
      if fingerprint in cache or fingerprint in cache_all or script_fingerprint in script_cache_all:
        last_error = RuntimeError("Duplicate listening question generated; retrying.")
        continue
      audio_b64 = _generate_tts_audio(normalized["script"])
      cache.append(fingerprint)
      cache_all.append(fingerprint)
      script_cache_all.append(script_fingerprint)
      RECENT_LISTENING_HASHES_GLOBAL.append(fingerprint)
      RECENT_LISTENING_HASHES_ALL_GLOBAL.append(fingerprint)
      RECENT_LISTENING_SCRIPT_HASHES_ALL_GLOBAL.append(script_fingerprint)
      normalized["audio"] = audio_b64
      return ListeningQuestionResponse.model_validate(normalized)
    except Exception as error:
      last_error = error
      continue

  raise RuntimeError(
    f"Gemini response validation failed for listening question after retries: {last_error}"
  ) from last_error


def generate_passage() -> PassageResponse:
  last_error: Exception | None = None
  for _ in range(4):
    domain = _pick_domain()
    freshness_token = _freshness_token()
    place, context = _scenario_from_seed(freshness_token)
    prompt = f"""
Generate a TEF Canada B2 reading passage in French.

Return JSON with:
title
passage

Rules:
- Passage length: 250 to 350 words.
- Domain: {domain}. Keep the topic focused on this domain.
- Scenario anchor: The passage must take place in {place} and involve {context}.
- The passage must start with a full sentence (not a heading like "Avis"). Use the title field for any heading.
- Freshness seed: {freshness_token}. Use it to create a new scenario. Do not include the seed in the output.
- Ensure the setting, names, and situation differ from previous passages.
- Output valid JSON only (no markdown, no commentary).
- Use this exact JSON shape:
{{
  "title": "string",
  "passage": "string"
}}
"""

    try:
      payload = _generate_json(prompt, temperature=0.85)
      passage = PassageResponse.model_validate(payload)
      if _starts_with_avis(passage.passage):
        last_error = RuntimeError("Passage started with 'Avis'; retrying.")
        continue
      fingerprint = _passage_fingerprint(passage.title, passage.passage)
      if fingerprint in RECENT_PASSAGE_HASHES:
        last_error = RuntimeError("Duplicate passage generated; retrying.")
        continue
      RECENT_PASSAGE_HASHES.append(fingerprint)
      return passage
    except ValidationError as validation_error:
      last_error = validation_error
    except Exception as error:
      last_error = error

  raise RuntimeError(
    f"Gemini response validation failed for passage generation after retries: {last_error}"
  ) from last_error


def generate_passage_quiz() -> PassageQuizResponse:
  last_error: Exception | None = None
  for _ in range(5):
    domain = _pick_domain()
    freshness_token = _freshness_token()
    place, context = _scenario_from_seed(freshness_token)
    prompt = f"""
Generate a TEF Canada B2 reading passage in French with 10 comprehension questions.

Return JSON with:
title
passage
questions (array of 10)

Each question must include:
question
4 options
correct_answer
explanation

Rules:
- Passage length: 250 to 350 words.
- Domain: {domain}. Keep the topic focused on this domain.
- Scenario anchor: The passage must take place in {place} and involve {context}.
- The passage must start with a full sentence (not a heading like "Avis"). Use the title field for any heading.
- Freshness seed: {freshness_token}. Use it to create a new scenario. Do not include the seed in the output.
- Ensure the setting, names, and situation differ from previous passages.
- Questions must be based on the passage content.
- correct_answer must be one of A, B, C, D.
- Output valid JSON only (no markdown, no commentary).
- Use this exact JSON shape:
{{
  "title": "string",
  "passage": "string",
  "questions": [
    {{
      "question": "string",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A",
      "explanation": "string"
    }}
  ]
}}
"""

    try:
      payload = _generate_json(prompt, temperature=0.85)
      payload["questions"] = [
        _normalize_passage_question(question)
        for question in payload.get("questions", [])
      ]
      quiz = PassageQuizResponse.model_validate(payload)
      if _starts_with_avis(quiz.passage):
        last_error = RuntimeError("Passage started with 'Avis'; retrying.")
        continue
      fingerprint = _passage_fingerprint(quiz.title, quiz.passage)
      if fingerprint in RECENT_PASSAGE_HASHES:
        last_error = RuntimeError("Duplicate passage generated; retrying.")
        continue
      RECENT_PASSAGE_HASHES.append(fingerprint)
      return quiz
    except Exception as error:
      last_error = error
      continue

  raise RuntimeError(
    f"Gemini response validation failed for passage quiz after retries: {last_error}"
  ) from last_error


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
