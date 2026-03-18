import type { AnswerOption } from "@/types/exam";

export interface GenerateListeningQuestionRequest {
  question_number: number;
  session_id?: string;
}

export interface ListeningQuestion {
  script: string;
  audio: string;
  audio_mime?: string;
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
