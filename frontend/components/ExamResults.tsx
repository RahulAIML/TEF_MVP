"use client";

import type { ExamQuestion, SubmitExamResponse } from "@/types/exam";

interface ExamResultsProps {
  results: SubmitExamResponse;
  questions: Record<number, ExamQuestion>;
}

export default function ExamResults({ results, questions }: ExamResultsProps) {
  const attemptedResults = results.results.filter((item) => item.user_answer);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Exam Results</h3>
        <p className="mt-2 text-sm text-slate-600">
          Score: <span className="font-semibold text-slate-900">{results.score}</span> / {results.total}
        </p>
        <p className="text-sm text-slate-600">
          Accuracy: <span className="font-semibold text-slate-900">{results.accuracy}%</span>
        </p>
        <p className="text-sm text-slate-600">
          Completion time: <span className="font-semibold text-slate-900">{results.completion_time}s</span>
        </p>
      </div>
      <div className="space-y-4">
        {attemptedResults.length === 0 && (
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
            No attempted questions to review yet.
          </div>
        )}
        {attemptedResults.map((item) => {
          const question = questions[item.question_number];
          return (
            <div key={`result-${item.question_number}`} className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Question {item.question_number}
              </p>
              {question && (
                <p className="mt-2 text-sm text-slate-700">{question.question}</p>
              )}
              <div className="mt-2 text-sm text-slate-600">
                Correct Answer:{" "}
                <span className="font-semibold text-slate-900">{item.correct_answer}</span>
              </div>
              <div className="text-sm text-slate-600">
                Your Answer:{" "}
                <span className="font-semibold text-slate-900">
                  {item.user_answer || "No answer"}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-700">{item.explanation}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
