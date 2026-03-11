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
  isDisabled?: boolean;
  timeUpMessage?: string;
}

export default function MCQList({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  isDisabled,
  timeUpMessage
}: MCQListProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Questions</h2>
      {isDisabled && timeUpMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {timeUpMessage}
        </div>
      )}
      {questions.map((question, index) => (
        <MCQQuestion
          key={`mcq-${index}`}
          index={index}
          question={question}
          selectedAnswer={answers[index] ?? ""}
          onAnswerChange={(value) => onAnswerChange(index, value)}
          isDisabled={isDisabled}
        />
      ))}
      <div className="pt-2">
        <Button onClick={onSubmit} disabled={isSubmitting || isDisabled}>
          {isSubmitting ? "Checking..." : "Check Answers"}
        </Button>
      </div>
    </section>
  );
}
