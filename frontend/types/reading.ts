export type AnswerOption = "A" | "B" | "C" | "D";

export interface ReadingQuestion {
  question: string;
  options: string[];
  correct_answer: AnswerOption;
  explanation: string;
  question_type: "main_idea" | "detail" | "inference" | "vocabulary";
}

export interface ReadingExercise {
  title: string;
  passage: string;
  questions: ReadingQuestion[];
}

export type ReadingMode = "exam" | "practice";
export type ReadingPart = 1 | 2 | 3;

export interface GenerateReadingRequest {
  mode: ReadingMode;
  part: ReadingPart;
}
