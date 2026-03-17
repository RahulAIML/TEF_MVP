import type { WordMeaningRequest, WordMeaningResponse } from "@/types/dictionary";
import type {
  ExamQuestion,
  GenerateQuestionRequest,
  SubmitExamRequest,
  SubmitExamResponse
} from "@/types/exam";
import type { DashboardSummaryResponse } from "@/types/dashboard";
import type { PassageQuizResponse, PassageResponse } from "@/types/passage";
import type { GenerateListeningQuestionRequest, ListeningQuestion } from "@/types/listening";
import type { AuthResponse, LoginRequest, SignupRequest } from "@/types/user";
import { getAuthToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function signupUser(payload: SignupRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<AuthResponse>(res);
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<AuthResponse>(res);
}


export async function generateListeningQuestion(
  payload: GenerateListeningQuestionRequest
): Promise<ListeningQuestion> {
  const res = await fetch(`${API_BASE_URL}/generate-listening-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<ListeningQuestion>(res);
}

export async function generateQuestion(
  payload: GenerateQuestionRequest
): Promise<ExamQuestion> {
  const res = await fetch(`${API_BASE_URL}/generate-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<ExamQuestion>(res);
}

export async function submitExam(payload: SubmitExamRequest): Promise<SubmitExamResponse> {
  const res = await fetch(`${API_BASE_URL}/submit-exam`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<SubmitExamResponse>(res);
}

export async function generatePassage(): Promise<PassageResponse> {
  const res = await fetch(`${API_BASE_URL}/generate-passage`, {
    method: "POST",
    headers: { ...authHeaders() },
    cache: "no-store"
  });
  return parseResponse<PassageResponse>(res);
}

export async function generatePassageQuiz(): Promise<PassageQuizResponse> {
  const res = await fetch(`${API_BASE_URL}/generate-passage-quiz`, {
    method: "POST",
    headers: { ...authHeaders() },
    cache: "no-store"
  });
  return parseResponse<PassageQuizResponse>(res);
}

export async function explainWord(
  payload: WordMeaningRequest
): Promise<WordMeaningResponse> {
  const res = await fetch(`${API_BASE_URL}/word-meaning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<WordMeaningResponse>(res);
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/dashboard/summary`, {
    method: "GET",
    headers: { ...authHeaders() },
    cache: "no-store"
  });
  return parseResponse<DashboardSummaryResponse>(res);
}
