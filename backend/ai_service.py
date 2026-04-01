from __future__ import annotations

import json
import logging
import requests
import io
import wave
from collections import deque
import hashlib
import os
import random
import re
import uuid
from typing import Any, Dict, Tuple

import google.generativeai as genai
from google import genai as genai_client
from google.genai import types
from dotenv import load_dotenv
from pydantic import ValidationError

from schemas import ExamQuestion, PassageQuizResponse, PassageResponse, WordMeaningResponse, ListeningQuestionResponse

load_dotenv()

logger = logging.getLogger('tef.tts')
ELEVENLABS_SESSION = requests.Session()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
SPEAKING_MODEL_NAME = os.getenv("GEMINI_SPEAKING_MODEL", MODEL_NAME)
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")
GEMINI_TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
ELEVENLABS_OUTPUT_FORMAT = os.getenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_22050_32")
ELEVENLABS_OPTIMIZE_LATENCY = int(os.getenv("ELEVENLABS_OPTIMIZE_LATENCY", "4"))
SPEAKING_MAX_CHARS = int(os.getenv("SPEAKING_MAX_CHARS", "280"))
AUDIO_STORAGE_PATH = os.getenv("AUDIO_STORAGE_PATH", os.path.join(os.path.dirname(__file__), "data", "audio"))

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
  model = genai.GenerativeModel(SPEAKING_MODEL_NAME)
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


def _generate_text(prompt: str, temperature: float = 0.4) -> str:
  _ensure_api_key()
  genai.configure(api_key=API_KEY)
  model = genai.GenerativeModel(SPEAKING_MODEL_NAME)
  try:
    response = model.generate_content(
      prompt,
      generation_config=genai.types.GenerationConfig(
        temperature=temperature,
        response_mime_type="text/plain"
      )
    )
  except Exception as error:
    raise RuntimeError(f"Gemini generate_content failed with model '{MODEL_NAME}': {error}") from error

  if not getattr(response, "text", None):
    raise RuntimeError("Gemini returned an empty response.")

  return str(response.text).strip()

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


def _ensure_elevenlabs_config() -> None:
  if not ELEVENLABS_API_KEY:
    raise RuntimeError("Missing ELEVENLABS_API_KEY for ElevenLabs TTS.")
  if not ELEVENLABS_VOICE_ID:
    raise RuntimeError("Missing ELEVENLABS_VOICE_ID for ElevenLabs TTS.")


def _generate_tts_audio(script: str, question_number: int, session_id: str | None) -> str:
  _ensure_elevenlabs_config()
  os.makedirs(AUDIO_STORAGE_PATH, exist_ok=True)
  url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
  payload = {
    "text": script,
    "model_id": "eleven_multilingual_v2",
    "optimize_streaming_latency": ELEVENLABS_OPTIMIZE_LATENCY,
    "output_format": ELEVENLABS_OUTPUT_FORMAT
  }
  headers = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}

  logger.info(
    "ElevenLabs TTS request: question=%s session=%s chars=%s",
    question_number,
    session_id or "global",
    len(script)
  )

  try:
    response = ELEVENLABS_SESSION.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
  except requests.RequestException as error:
    logger.warning("ElevenLabs TTS failed: %s. Falling back to Gemini TTS.", error)
    return _generate_gemini_tts_audio(script, question_number, session_id)

  file_name = f"listening_q{question_number}_{session_id or 'global'}_{uuid.uuid4().hex[:8]}.mp3"
  file_path = os.path.join(AUDIO_STORAGE_PATH, file_name)
  with open(file_path, "wb") as audio_file:
    audio_file.write(response.content)

  logger.info(
    "ElevenLabs TTS success: status=%s bytes=%s file=%s",
    response.status_code,
    len(response.content),
    file_name
  )

  return f"/audio/{file_name}"


def _generate_gemini_tts_audio(script: str, question_number: int, session_id: str | None) -> str:
  _ensure_api_key()
  os.makedirs(AUDIO_STORAGE_PATH, exist_ok=True)
  client = genai_client.Client(api_key=API_KEY)
  try:
    response = client.models.generate_content(
      model=GEMINI_TTS_MODEL,
      contents=script,
      config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
          voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
              voice_name="Kore"
            )
          )
        )
      )
    )
  except Exception as error:
    logger.error("Gemini TTS request failed: %s", error)
    raise RuntimeError(f"Gemini TTS failed with model '{GEMINI_TTS_MODEL}': {error}") from error

  try:
    inline_data = response.candidates[0].content.parts[0].inline_data
    audio_bytes = inline_data.data
  except Exception as error:
    logger.error("Gemini TTS returned no audio data: %s", error)
    raise RuntimeError("Gemini TTS returned no audio data.") from error

  buffer = io.BytesIO()
  with wave.open(buffer, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(24000)
    wf.writeframes(audio_bytes)
  wav_bytes = buffer.getvalue()

  file_name = f"listening_q{question_number}_{session_id or 'global'}_{uuid.uuid4().hex[:8]}.wav"
  file_path = os.path.join(AUDIO_STORAGE_PATH, file_name)
  with open(file_path, "wb") as audio_file:
    audio_file.write(wav_bytes)

  logger.info("Gemini TTS success: bytes=%s file=%s", len(wav_bytes), file_name)

  return f"/audio/{file_name}"


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
- Text length: 60 to 100 words.
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


def generate_listening_question(question_number: int, session_id: str | None = None, defer_audio: bool = False) -> ListeningQuestionResponse:
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
- Script length: 8 to 20 seconds when spoken (roughly 35 to 70 words).
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
  for _ in range(3):
    try:
      payload = _generate_json(prompt, temperature=0.7)
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
      audio_url = None
      if not defer_audio:
        audio_url = _generate_tts_audio(normalized["script"], question_number, session_id)
      cache.append(fingerprint)
      cache_all.append(fingerprint)
      script_cache_all.append(script_fingerprint)
      RECENT_LISTENING_HASHES_GLOBAL.append(fingerprint)
      RECENT_LISTENING_HASHES_ALL_GLOBAL.append(fingerprint)
      RECENT_LISTENING_SCRIPT_HASHES_ALL_GLOBAL.append(script_fingerprint)
      normalized["audio_url"] = audio_url
      return ListeningQuestionResponse.model_validate(normalized)
    except Exception as error:
      last_error = error
      continue

  raise RuntimeError(
    f"Gemini response validation failed for listening question after retries: {last_error}"
  ) from last_error



def generate_listening_audio(script: str, question_number: int, session_id: str | None = None) -> str:
  return _generate_tts_audio(script, question_number, session_id)

def generate_passage() -> PassageResponse:
  last_error: Exception | None = None
  for _ in range(3):
    domain = _pick_domain()
    freshness_token = _freshness_token()
    place, context = _scenario_from_seed(freshness_token)
    prompt = f"""
Generate a TEF Canada B2 reading passage in French.

Return JSON with:
title
passage

Rules:
- Passage length: 100 to 150 words.
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
- Passage length: 200 to 250 words.
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


def explain_text(text: str) -> Dict[str, str]:
  clean_text = text.strip()
  prompt = f"""
Explain this French text clearly for a TEF learner.

Return JSON with:
meaning
translation
explanation
example

Text: {clean_text}

Rules:
- meaning: 1 to 2 simple sentences in French.
- explanation: short French explanation, easy B2 vocabulary.
- translation: short English translation.
- example: a simple French example sentence.
- Output valid JSON only.
"""

  payload = _generate_json(prompt, temperature=0.4)
  return {
    "meaning": str(payload.get("meaning", "")).strip(),
    "explanation": str(payload.get("explanation", "")).strip(),
    "translation": str(payload.get("translation", "")).strip(),
    "example": str(payload.get("example", "")).strip()
  }


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












def generate_writing_tasks() -> dict[str, str]:
  prompt = """
Generate TEF Canada writing Task 1 and Task 2 prompts in French.

Task 1: Informative message (60-120 words), formal or semi-formal tone.
Task 2: Argumentative text (120-200 words) with a clear opinion prompt.

Return JSON with:
{
  "task1_prompt": "...",
  "task2_prompt": "..."
}

Rules:
- Output valid JSON only.
- Prompts must be concise and exam-like.
"""

  payload = _generate_json(prompt, temperature=0.7)
  return {
    "task1_prompt": str(payload.get("task1_prompt", "")).strip(),
    "task2_prompt": str(payload.get("task2_prompt", "")).strip()
  }


def evaluate_writing_task(task_type: str, prompt_text: str, response_text: str) -> dict[str, object]:
  if task_type == "task1":
    criteria = "Task completion, clarity, tone, grammar, coherence."
    word_range = "60-120 words"
  else:
    criteria = "Argument quality, structure, connectors, vocabulary, grammar."
    word_range = "120-200 words"

  prompt = f"""
You are a TEF Canada writing evaluator.

Task type: {task_type}
Word range: {word_range}
Evaluation criteria: {criteria}

Prompt:
{prompt_text}

Candidate response:
{response_text}

Return JSON with:
{{
  "level": "B1/B2",
  "scores": {{
    "structure": 0-10,
    "grammar": 0-10,
    "coherence": 0-10,
    "vocab": 0-10
  }},
  "feedback": ["..."],
  "improved_version": "..."
}}

Rules:
- Use integers 0-10 for scores.
- Provide 3-6 feedback points.
- improved_version should stay within the word range and be better French.
- Output valid JSON only.
"""

  payload = _generate_json(prompt, temperature=0.3)
  scores = payload.get("scores", {}) if isinstance(payload.get("scores", {}), dict) else {}

  def _clamp_score(value: object) -> int:
    try:
      score = int(float(value))
    except (TypeError, ValueError):
      return 0
    return max(0, min(10, score))

  normalized_scores = {
    "structure": _clamp_score(scores.get("structure")),
    "grammar": _clamp_score(scores.get("grammar")),
    "coherence": _clamp_score(scores.get("coherence")),
    "vocab": _clamp_score(scores.get("vocab"))
  }

  feedback = payload.get("feedback", [])
  if isinstance(feedback, str):
    feedback = [item.strip() for item in feedback.split("-") if item.strip()]
  feedback = [str(item).strip() for item in feedback if str(item).strip()]

  return {
    "level": str(payload.get("level", "B1/B2")).strip(),
    "scores": normalized_scores,
    "feedback": feedback,
    "improved_version": str(payload.get("improved_version", "")).strip()
  }


def evaluate_writing_step(task_type: str, step: str, prompt_text: str, text: str) -> dict[str, object]:
  prompt = f"""
You are a TEF writing coach. Provide feedback for a single step of a writing task.

Task type: {task_type}
Step: {step}
Prompt:
{prompt_text}

Student draft for this step:
{text}

Return JSON with:
{{
  "feedback": ["..."],
  "improved_version": "..."
}}

Rules:
- Feedback should be concise and actionable (2-4 points).
- improved_version should be a better version of the step only.
- Output valid JSON only.
"""

  payload = _generate_json(prompt, temperature=0.4)
  feedback = payload.get("feedback", [])
  if isinstance(feedback, str):
    feedback = [item.strip() for item in feedback.split("-") if item.strip()]
  feedback = [str(item).strip() for item in feedback if str(item).strip()]

  return {
    "feedback": feedback,
    "improved_version": str(payload.get("improved_version", "")).strip()
  }




def _format_conversation_history(history: list[dict[str, str]]) -> str:
  if not history:
    return "Aucun."
  lines: list[str] = []
  for item in history:
    role = str(item.get("role", "user")).strip().lower()
    content = str(item.get("content", "")).strip()
    if not content:
      continue
    label = "Utilisateur" if role == "user" else "Examinateur"
    lines.append(f"{label}: {content}")
  return "\n".join(lines) if lines else "Aucun."


def _generate_gemini_tts_audio_for_speaking(script: str, file_stub: str) -> str:
  _ensure_api_key()
  os.makedirs(AUDIO_STORAGE_PATH, exist_ok=True)
  client = genai_client.Client(api_key=API_KEY)
  try:
    response = client.models.generate_content(
      model=GEMINI_TTS_MODEL,
      contents=script,
      config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
          voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
              voice_name="Kore"
            )
          )
        )
      )
    )
  except Exception as error:
    logger.error("Gemini TTS (speaking) request failed: %s", error)
    raise RuntimeError(f"Gemini TTS failed with model '{GEMINI_TTS_MODEL}': {error}") from error

  try:
    inline_data = response.candidates[0].content.parts[0].inline_data
    audio_bytes = inline_data.data
  except Exception as error:
    logger.error("Gemini TTS (speaking) returned no audio data: %s", error)
    raise RuntimeError("Gemini TTS returned no audio data.") from error

  buffer = io.BytesIO()
  with wave.open(buffer, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(24000)
    wf.writeframes(audio_bytes)
  wav_bytes = buffer.getvalue()

  file_name = f"{file_stub}.wav"
  file_path = os.path.join(AUDIO_STORAGE_PATH, file_name)
  with open(file_path, "wb") as audio_file:
    audio_file.write(wav_bytes)

  logger.info("Gemini TTS (speaking) success: bytes=%s file=%s", len(wav_bytes), file_name)

  return f"/audio/{file_name}"


def generate_speaking_audio(script: str, session_id: str | None = None) -> str:
  if not script.strip():
    raise RuntimeError("Cannot generate audio for empty script.")

  os.makedirs(AUDIO_STORAGE_PATH, exist_ok=True)
  file_stub = f"speaking_{session_id or 'global'}_{uuid.uuid4().hex[:8]}"

  if ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    payload = {
      "text": script,
      "model_id": "eleven_multilingual_v2",
      "optimize_streaming_latency": 2
    }
    headers = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}

    logger.info(
      "ElevenLabs TTS (speaking) request: session=%s chars=%s",
      session_id or "global",
      len(script)
    )

    try:
      response = ELEVENLABS_SESSION.post(url, headers=headers, json=payload, timeout=30)
      response.raise_for_status()
      file_name = f"{file_stub}.mp3"
      file_path = os.path.join(AUDIO_STORAGE_PATH, file_name)
      with open(file_path, "wb") as audio_file:
        audio_file.write(response.content)

      logger.info(
        "ElevenLabs TTS (speaking) success: status=%s bytes=%s file=%s",
        response.status_code,
        len(response.content),
        file_name
      )

      return f"/audio/{file_name}"
    except requests.RequestException as error:
      logger.warning("ElevenLabs TTS (speaking) failed: %s. Falling back to Gemini TTS.", error)

  return _generate_gemini_tts_audio_for_speaking(script, file_stub)


def generate_speaking_reply(
  message: str,
  history: list[dict[str, str]],
  task_type: str,
  session_id: str | None = None
) -> dict[str, str]:
  history_text = _format_conversation_history(history)
  prompt = f"""
You are a TEF Canada speaking examiner.

Rules:

- Respond in French
- Keep responses SHORT (1–2 sentences)
- Always ask a follow-up question
- Be natural and conversational
- Use B1–B2 level French
- Do not explain grammar

Task type: {task_type}

Conversation history:
{history_text}

User said:
{message}

Respond like a real examiner.
"""

  reply = _generate_text(prompt, temperature=0.4)
  if len(reply) > SPEAKING_MAX_CHARS:
    truncated = reply[:SPEAKING_MAX_CHARS]
    sentence_end = max(truncated.rfind('.'), truncated.rfind('?'), truncated.rfind('!'))
    if sentence_end >= max(40, SPEAKING_MAX_CHARS // 2):
      reply = truncated[:sentence_end + 1]
    else:
      reply = truncated.rsplit(' ', 1)[0] or truncated
  audio_url = generate_speaking_audio(reply, session_id)
  return {
    "reply": reply,
    "audio_url": audio_url
  }


def evaluate_speaking_conversation(history: list[dict[str, str]], task_type: str) -> dict[str, object]:
  history_text = _format_conversation_history(history)
  prompt = f"""
You are a TEF Canada speaking examiner.

Evaluate the candidate's spoken performance for task type: {task_type}.

Conversation history:
{history_text}

Return JSON with:
{{
  "fluency": 0-10,
  "grammar": 0-10,
  "vocabulary": 0-10,
  "interaction": 0-10,
  "feedback": ["..."],
  "improved_response": "..."
}}

Rules:
- Use integers 0-10.
- Provide 3-6 feedback points.
- improved_response should be a better short response in French.
- Output valid JSON only.
"""

  payload = _generate_json(prompt, temperature=0.3)

  def _score(value: object) -> int:
    try:
      score = int(float(value))
    except (TypeError, ValueError):
      return 0
    return max(0, min(10, score))

  feedback = payload.get("feedback", [])
  if isinstance(feedback, str):
    feedback = [item.strip() for item in feedback.split("-") if item.strip()]
  feedback = [str(item).strip() for item in feedback if str(item).strip()]

  return {
    "fluency": _score(payload.get("fluency")),
    "grammar": _score(payload.get("grammar")),
    "vocabulary": _score(payload.get("vocabulary")),
    "interaction": _score(payload.get("interaction")),
    "feedback": feedback,
    "improved_response": str(payload.get("improved_response", "")).strip()
  }


