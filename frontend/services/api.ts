import type { WordMeaningRequest, WordMeaningResponse } from "@/types/dictionary";
import type {
  ExamQuestion,
  GenerateQuestionRequest,
  SubmitExamRequest,
  SubmitExamResponse
} from "@/types/exam";
import type { DashboardSummaryResponse } from "@/types/dashboard";
import type { PassageQuizResponse, PassageResponse } from "@/types/passage";
import type {
  GenerateListeningQuestionRequest,
  ListeningQuestion,
  GenerateListeningAudioRequest,
  GenerateListeningAudioResponse,
  SubmitListeningExamRequest,
  SubmitListeningExamResponse
} from "@/types/listening";
import type { ExplainTextRequest, ExplainTextResponse } from "@/types/text-helper";
import type { ConversationRequest, ConversationResponse, SpeakingEvaluationRequest, SpeakingEvaluationResponse } from "@/types/speaking";
import type {
  LearnAnalyzeRequest,
  LearnContentResponse,
  LearnEvaluateRequest,
  LearnEvaluationResponse,
  LearnExercise,
  LearnMoreExercisesRequest,
  LearnSaveSessionRequest,
  LearnSessionSummary
} from "@/types/learn";
import type {
  GenerateWritingTasksRequest,
  GenerateWritingTasksResponse,
  WritingEvaluationRequest,
  WritingEvaluationResponse,
  WritingStepFeedbackRequest,
  WritingStepFeedbackResponse,
  WritingProgressRequest,
  WritingProgressResponse,
  WritingSubmitRequest,
  WritingSubmitResponse
} from "@/types/writing";
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


export async function generateListeningAudio(
  payload: GenerateListeningAudioRequest
): Promise<GenerateListeningAudioResponse> {
  const res = await fetch(`${API_BASE_URL}/generate-listening-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<GenerateListeningAudioResponse>(res);
}

export async function submitListeningExam(
  payload: SubmitListeningExamRequest
): Promise<SubmitListeningExamResponse> {
  const res = await fetch(`${API_BASE_URL}/submit-listening-exam`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<SubmitListeningExamResponse>(res);
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


export async function explainText(
  payload: ExplainTextRequest
): Promise<ExplainTextResponse> {
  const res = await fetch(`${API_BASE_URL}/explain-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<ExplainTextResponse>(res);
}

export async function translatePassage(text: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text }),
    cache: "no-store"
  });
  const data = await parseResponse<{ translation: string }>(res);
  return data.translation;
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

export async function generateWritingTasks(
  payload: GenerateWritingTasksRequest
): Promise<GenerateWritingTasksResponse> {
  const res = await fetch(`${API_BASE_URL}/generate-writing-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<GenerateWritingTasksResponse>(res);
}

export async function evaluateWritingTask(
  payload: WritingEvaluationRequest
): Promise<WritingEvaluationResponse> {
  const res = await fetch(`${API_BASE_URL}/evaluate-writing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<WritingEvaluationResponse>(res);
}

export async function evaluateWritingStep(
  payload: WritingStepFeedbackRequest
): Promise<WritingStepFeedbackResponse> {
  const res = await fetch(`${API_BASE_URL}/evaluate-writing-step`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<WritingStepFeedbackResponse>(res);
}

export async function saveWritingProgress(
  payload: WritingProgressRequest
): Promise<WritingProgressResponse> {
  const res = await fetch(`${API_BASE_URL}/writing/save-progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<WritingProgressResponse>(res);
}

export async function submitWriting(
  payload: WritingSubmitRequest
): Promise<WritingSubmitResponse> {
  const res = await fetch(`${API_BASE_URL}/writing/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<WritingSubmitResponse>(res);
}


export async function sendConversation(
  payload: ConversationRequest
): Promise<ConversationResponse> {
  const res = await fetch(`${API_BASE_URL}/conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<ConversationResponse>(res);
}

export async function evaluateSpeaking(
  payload: SpeakingEvaluationRequest
): Promise<SpeakingEvaluationResponse> {
  const res = await fetch(`${API_BASE_URL}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<SpeakingEvaluationResponse>(res);
}

export async function analyzeLearnContent(
  payload: LearnAnalyzeRequest
): Promise<LearnContentResponse> {
  const res = await fetch(`${API_BASE_URL}/learn/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<LearnContentResponse>(res);
}

export async function uploadLearnFile(file: File): Promise<{ text: string; source_type: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/learn/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
    cache: "no-store"
  });
  return parseResponse<{ text: string; source_type: string }>(res);
}

export async function evaluateLearnAnswer(
  payload: LearnEvaluateRequest
): Promise<LearnEvaluationResponse> {
  const res = await fetch(`${API_BASE_URL}/learn/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<LearnEvaluationResponse>(res);
}

export async function generateMoreExercises(
  payload: LearnMoreExercisesRequest
): Promise<LearnExercise[]> {
  const res = await fetch(`${API_BASE_URL}/learn/more-exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<LearnExercise[]>(res);
}

export async function saveLearnSession(
  payload: LearnSaveSessionRequest
): Promise<LearnSessionSummary> {
  const res = await fetch(`${API_BASE_URL}/learn/session/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  return parseResponse<LearnSessionSummary>(res);
}

