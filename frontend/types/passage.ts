export interface PassageResponse {
  title: string;
  passage: string;
}

export interface PassageQuizQuestion {
  question: string;
  options: string[];
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface PassageQuizResponse {
  title: string;
  passage: string;
  questions: PassageQuizQuestion[];
}
