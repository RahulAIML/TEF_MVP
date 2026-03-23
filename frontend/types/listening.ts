import type { AnswerOption } from "@/types/exam";

export interface GenerateListeningQuestionRequest {
  question_number: number;
  session_id?: string;
  defer_audio?: boolean;
}

export interface GenerateListeningAudioRequest {
  script: string;
  question_number: number;
  session_id?: string;
}

export interface GenerateListeningAudioResponse {
  audio_url: string;
}

export interface ListeningQuestion {
  script: string;
  audio_url?: string | null;
  question: string;
  options: string[];
  correct_answer: AnswerOption;
  explanation: string;
}

export interface ListeningResultItem {
  question_number: number;
  question: string;
  correct_answer: AnswerOption;
  user_answer: AnswerOption | "";
  is_correct: boolean;
  explanation: string;
}

export interface ListeningSubmitResult {
  score: number;
  total: number;
  accuracy: number;
  results: ListeningResultItem[];
}

export interface SubmitListeningExamRequest {
  started_at: string;
  completed_at: string;
  score: number;
  total: number;
  accuracy: number;
}

export interface SubmitListeningExamResponse {
  score: number;
  total: number;
  accuracy: number;
  completion_time: number;
}

