"use client";

import type { AnswerOption } from "@/types/exam";

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentQuestion: number;
  answers: Record<number, AnswerOption | "">;
  onSelect: (questionNumber: number) => void;
}

export default function QuestionNavigator({
  totalQuestions,
  currentQuestion,
  answers,
  onSelect
}: QuestionNavigatorProps) {
  const items = Array.from({ length: totalQuestions }, (_, index) => index + 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Question Navigator</h4>
      <div className="mt-3 grid grid-cols-5 gap-2 text-sm md:grid-cols-10">
        {items.map((number) => {
          const isCurrent = number === currentQuestion;
          const answered = answers[number];
          return (
            <button
              type="button"
              key={`nav-${number}`}
              onClick={() => onSelect(number)}
              className={`rounded-xl border px-0 py-2 text-center transition ${
                isCurrent
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : answered
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {number}
            </button>
          );
        })}
      </div>
    </div>
  );
}
