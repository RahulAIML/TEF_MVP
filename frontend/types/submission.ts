import type { AnswerOption } from "@/types/reading";

export interface SubmitReadingRequest {
  answers: Array<AnswerOption | "">;
}

export interface SubmissionResultItem {
  question_index: number;
  correct_answer: AnswerOption;
  user_answer: AnswerOption | "";
  is_correct: boolean;
  explanation: string;
}

export interface SubmissionResponse {
  score: number;
  total: number;
  results: SubmissionResultItem[];
}
