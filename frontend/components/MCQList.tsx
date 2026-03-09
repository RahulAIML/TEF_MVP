"use client";

import type { AnswerOption, ReadingQuestion } from "@/types/reading";
import { Button } from "@/components/ui/button";
import MCQQuestion from "@/components/MCQQuestion";

interface MCQListProps {
  questions: ReadingQuestion[];
  answers: Array<AnswerOption | "">;
  onAnswerChange: (index: number, value: AnswerOption) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function MCQList({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting
}: MCQListProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Questions</h2>
      {questions.map((question, index) => (
        <MCQQuestion
          key={`mcq-${index}`}
          index={index}
          question={question}
          selectedAnswer={answers[index] ?? ""}
          onAnswerChange={(value) => onAnswerChange(index, value)}
        />
      ))}
      <div className="pt-2">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Checking..." : "Check Answers"}
        </Button>
      </div>
    </section>
  );
}
