"use client";

import type { AnswerOption, ExamQuestion } from "@/types/exam";

interface QuestionCardProps {
  question: ExamQuestion;
  selectedAnswer: AnswerOption | "";
  onSelect: (value: AnswerOption) => void;
  disabled?: boolean;
}

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  disabled
}: QuestionCardProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-[1.02rem] leading-7 text-slate-800">
        {question.text}
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{question.question}</h3>
        <div className="mt-3 space-y-2">
          {question.options.map((option, index) => {
            const label = option.trim();
            const value = (["A", "B", "C", "D"][index] as AnswerOption) ?? "A";
            const isSelected = selectedAnswer === value;
            return (
              <label
                key={`${question.question_number}-option-${index}`}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <input
                  type="radio"
                  name={`question-${question.question_number}`}
                  className="mt-1"
                  value={value}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onSelect(value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
