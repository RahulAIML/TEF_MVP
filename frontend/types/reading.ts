export type AnswerOption = "A" | "B" | "C" | "D";

export interface ReadingQuestion {
  question: string;
  options: string[];
  correct_answer: AnswerOption;
  explanation: string;
}

export interface ReadingExercise {
  title: string;
  passage: string;
  questions: ReadingQuestion[];
}
