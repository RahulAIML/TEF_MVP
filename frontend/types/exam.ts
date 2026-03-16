export type AnswerOption = "A" | "B" | "C" | "D";

export type ExamQuestionType =
  | "everyday_life"
  | "gap_fill"
  | "rapid_reading"
  | "administrative"
  | "press";

export interface GenerateQuestionRequest {
  question_number: number;
  session_id?: string;
}

export interface ExamQuestion {
  question_number: number;
  text: string;
  question: string;
  options: string[];
  correct_answer: AnswerOption;
  explanation: string;
  question_type: ExamQuestionType;
}

export interface SubmitExamQuestion {
  question_number: number;
  correct_answer: AnswerOption;
  question_type: ExamQuestionType;
  explanation: string;
}

export interface SubmitExamRequest {
  started_at: string;
  completed_at: string;
  answers: Record<number, AnswerOption | "">;
  questions: SubmitExamQuestion[];
}

export interface ExamResultItem {
  question_number: number;
  correct_answer: AnswerOption;
  user_answer: AnswerOption | "";
  is_correct: boolean;
  explanation: string;
  question_type: ExamQuestionType;
}

export interface SubmitExamResponse {
  score: number;
  total: number;
  accuracy: number;
  completion_time: number;
  results: ExamResultItem[];
}
