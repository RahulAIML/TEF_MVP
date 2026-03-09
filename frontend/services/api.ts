import type { WordMeaningRequest, WordMeaningResponse } from "@/types/dictionary";
import type { ReadingExercise } from "@/types/reading";
import type { SubmitReadingRequest, SubmissionResponse } from "@/types/submission";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function generateReadingExercise(): Promise<ReadingExercise> {
  const res = await fetch(`${API_BASE_URL}/generate-reading-exercise`, {
    method: "GET",
    cache: "no-store"
  });
  return parseResponse<ReadingExercise>(res);
}

export async function explainWord(
  payload: WordMeaningRequest
): Promise<WordMeaningResponse> {
  const res = await fetch(`${API_BASE_URL}/word-meaning`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<WordMeaningResponse>(res);
}

export async function submitReadingAnswers(
  payload: SubmitReadingRequest
): Promise<SubmissionResponse> {
  const res = await fetch(`${API_BASE_URL}/submit-reading`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<SubmissionResponse>(res);
}
