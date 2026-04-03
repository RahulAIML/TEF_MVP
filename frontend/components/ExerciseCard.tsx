"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearnExercise, LearnEvaluationResponse } from "@/types/learn";

interface ExerciseCardProps {
  exercise: LearnExercise;
  index: number;
  evaluation: LearnEvaluationResponse | null;
  isEvaluating: boolean;
  onSubmit: (answer: string) => void;
}

const EXERCISE_TITLES: Record<string, string> = {
  mcq: "Multiple Choice",
  fill_blank: "Fill in the Blank",
  sentence_correction: "Sentence Correction",
  writing_task: "Writing Task",
  speaking_prompt: "Speaking Exercise"
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
};

export default function ExerciseCard({
  exercise,
  index,
  evaluation,
  isEvaluating,
  onSubmit
}: ExerciseCardProps) {
  const [selected, setSelected] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const answer = exercise.type === "mcq" ? selected : textAnswer;
    if (!answer.trim()) return;
    setSubmitted(true);
    onSubmit(answer.trim());
  };

  const isLocked = submitted || isEvaluating || evaluation !== null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-slate-900">
            Exercise {index + 1} — {EXERCISE_TITLES[exercise.type] ?? exercise.type}
          </CardTitle>
          {evaluation && (
            <span className={`text-lg font-bold ${SCORE_COLOR(evaluation.score)}`}>
              {evaluation.score}/100
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question / Prompt */}
        <div>
          {exercise.type === "sentence_correction" ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Correct this sentence:</p>
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 line-through">
                {exercise.incorrect}
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-slate-800">
              {exercise.prompt ?? exercise.question}
            </p>
          )}
          {exercise.hint && !submitted && (
            <p className="mt-1 text-xs text-slate-500">Hint: {exercise.hint}</p>
          )}
          {exercise.hints && exercise.hints.length > 0 && !submitted && (
            <ul className="mt-2 space-y-1">
              {exercise.hints.map((h, i) => (
                <li key={i} className="text-xs text-slate-500">• {h}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Answer Input */}
        {!evaluation && (
          <>
            {exercise.type === "mcq" && exercise.options && (
              <div className="space-y-2">
                {exercise.options.map((opt) => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => setSelected(opt.charAt(0))}
                    className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors
                      ${selected === opt.charAt(0)
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }
                      ${isLocked ? "cursor-default opacity-70" : "cursor-pointer"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {(exercise.type === "fill_blank" || exercise.type === "sentence_correction") && (
              <input
                type="text"
                disabled={isLocked}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isLocked) handleSubmit(); }}
                placeholder={exercise.type === "fill_blank" ? "Type your answer..." : "Type the corrected sentence..."}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              />
            )}

            {(exercise.type === "writing_task" || exercise.type === "speaking_prompt") && (
              <textarea
                disabled={isLocked}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={4}
                placeholder={exercise.type === "writing_task"
                  ? "Write your response in French..."
                  : "Type what you would say in French..."}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60 resize-none"
              />
            )}

            <Button
              onClick={handleSubmit}
              disabled={isLocked || (exercise.type === "mcq" ? !selected : !textAnswer.trim())}
              className="w-full"
            >
              {isEvaluating ? "Evaluating..." : "Submit Answer"}
            </Button>
          </>
        )}

        {/* Evaluation Result */}
        {evaluation && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            {/* Score bars */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Grammar", val: evaluation.grammar },
                { label: "Vocabulary", val: evaluation.vocabulary },
                { label: "Structure", val: evaluation.structure },
                { label: "Fluency", val: evaluation.fluency }
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs uppercase text-slate-400">{label}</p>
                  <p className="text-lg font-semibold text-slate-900">{val}/10</p>
                </div>
              ))}
            </div>

            {/* is_correct badge */}
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium
              ${evaluation.is_correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {evaluation.is_correct ? "✓ Correct" : "✗ Needs improvement"}
            </div>

            {/* Feedback */}
            {evaluation.feedback.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Feedback</p>
                <ul className="mt-1.5 space-y-1">
                  {evaluation.feedback.map((f, i) => (
                    <li key={i} className="text-sm text-slate-700">• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improved answer */}
            {evaluation.improved_answer && (
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase text-emerald-600">Model Answer</p>
                <p className="mt-1.5 text-sm text-emerald-900">{evaluation.improved_answer}</p>
              </div>
            )}

            {/* Explanation */}
            {evaluation.explanation && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Explanation</p>
                <p className="mt-1.5 text-sm text-slate-700">{evaluation.explanation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
