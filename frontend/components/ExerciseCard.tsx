"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearnExercise, LearnEvaluationResponse } from "@/types/learn";

interface ExerciseCardProps {
  exercise: LearnExercise;
  index: number;
  answer: string;
  onAnswerChange: (answer: string) => void;
  evaluation: LearnEvaluationResponse | null;
  isEvaluating: boolean;
}

const EXERCISE_TITLES: Record<string, string> = {
  mcq: "Multiple Choice",
  fill_blank: "Fill in the Blank",
  sentence_correction: "Sentence Correction",
  writing_task: "Writing Task",
  speaking_prompt: "Speaking Exercise"
};

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return "text-emerald-600";
  if (score >= 6) return "text-amber-600";
  return "text-rose-600";
};

// ── Inline mic hook ────────────────────────────────────────────────────────
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function useMic(onTranscript: (t: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const lastResultIndexRef = useRef(0);

  const toggle = useCallback(() => {
    if (isListening) {
      recRef.current?.stop();
      return;
    }
    setMicError("");
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) {
      setMicError("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = false;
    lastResultIndexRef.current = 0;
    rec.onresult = (e) => {
      // Only process new results since last callback
      const texts: string[] = [];
      for (let i = lastResultIndexRef.current; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (t) texts.push(t);
      }
      lastResultIndexRef.current = e.results.length;
      const combined = texts.join(" ").trim();
      if (combined) onTranscript(combined);
    };
    rec.onerror = (e) => {
      const code = e.error ?? "";
      if (code !== "no-speech" && code !== "aborted") {
        setMicError(code === "not-allowed" ? "Microphone access denied." : `Error: ${code}`);
      }
    };
    rec.onend = () => {
      setIsListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setIsListening(true);
    rec.start();
  }, [isListening, onTranscript]);

  return { isListening, micError, toggle };
}

// ── MicButton ──────────────────────────────────────────────────────────────
function MicButton({ disabled, onTranscript, onAppend }: {
  disabled: boolean;
  onTranscript: (t: string) => void;
  onAppend: (t: string) => void;
}) {
  const { isListening, micError, toggle } = useMic((text) => {
    onTranscript(text);
    onAppend(text);
  });

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        title={isListening ? "Stop recording" : "Speak your answer"}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all
          ${isListening
            ? "border-rose-400 bg-rose-500 text-white shadow-md"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }
          ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
      >
        {isListening ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            Stop Recording
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm7 8a1 1 0 0 1 1 1 8 8 0 0 1-7 7.938V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-1.062A8 8 0 0 1 4 12a1 1 0 1 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
            </svg>
            Speak Answer
          </>
        )}
      </button>
      {isListening && (
        <p className="text-xs text-slate-500 animate-pulse">Listening in French... speak now</p>
      )}
      {micError && <p className="text-xs text-rose-500">{micError}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ExerciseCard({
  exercise,
  index,
  answer,
  onAnswerChange,
  evaluation,
  isEvaluating
}: ExerciseCardProps) {
  const isLocked = isEvaluating || evaluation !== null;

  // Append spoken text to existing textarea content
  const handleSpokenAppend = useCallback((text: string) => {
    onAnswerChange(answer ? `${answer} ${text}` : text);
  }, [answer, onAnswerChange]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-slate-900">
            Exercise {index + 1} — {EXERCISE_TITLES[exercise.type] ?? exercise.type}
          </CardTitle>
          {isEvaluating && (
            <span className="text-xs text-slate-400 animate-pulse">Evaluating...</span>
          )}
          {evaluation && (
            <span className={`text-lg font-bold ${SCORE_COLOR(evaluation.score)}`}>
              {evaluation.score}/10
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
          {exercise.hint && !isLocked && (
            <p className="mt-1 text-xs text-slate-500">Hint: {exercise.hint}</p>
          )}
          {exercise.hints && exercise.hints.length > 0 && !isLocked && (
            <ul className="mt-2 space-y-1">
              {exercise.hints.map((h, i) => (
                <li key={i} className="text-xs text-slate-500">• {h}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Answer Input */}
        {exercise.type === "mcq" && exercise.options && (
          <div className="space-y-2">
            {exercise.options.map((opt) => {
              const letter = opt.charAt(0);
              return (
                <button
                  key={opt}
                  disabled={isLocked}
                  onClick={() => onAnswerChange(letter)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors
                    ${answer === letter
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }
                    ${isLocked ? "cursor-default opacity-70" : "cursor-pointer"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {(exercise.type === "fill_blank" || exercise.type === "sentence_correction") && (
          <input
            type="text"
            disabled={isLocked}
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder={
              exercise.type === "fill_blank"
                ? "Type your answer..."
                : "Type the corrected sentence..."
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
          />
        )}

        {exercise.type === "writing_task" && (
          <textarea
            disabled={isLocked}
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={4}
            placeholder="Write your response in French..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60 resize-none"
          />
        )}

        {/* Speaking exercise: textarea + mic button */}
        {exercise.type === "speaking_prompt" && (
          <div className="space-y-3">
            <textarea
              disabled={isLocked}
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              rows={4}
              placeholder="Speak using the mic below, or type what you would say in French..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60 resize-none"
            />
            {!isLocked && (
              <MicButton
                disabled={isLocked}
                onTranscript={() => undefined}
                onAppend={handleSpokenAppend}
              />
            )}
            {answer && !isLocked && (
              <button
                onClick={() => onAnswerChange("")}
                className="text-xs text-slate-400 underline hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Evaluation Result */}
        {evaluation && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Grammar", val: evaluation.grammar },
                { label: "Vocabulary", val: evaluation.vocabulary },
                { label: "Structure", val: evaluation.structure },
                { label: "Fluency", val: evaluation.fluency },
                ...(evaluation.tone != null
                  ? [{ label: "Tone", val: evaluation.tone }]
                  : []),
                ...(evaluation.pronunciation != null
                  ? [{ label: "Pronunciation", val: evaluation.pronunciation }]
                  : [])
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs uppercase text-slate-400">{label}</p>
                  <p className="text-lg font-semibold text-slate-900">{val}/10</p>
                </div>
              ))}
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium
              ${evaluation.is_correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {evaluation.is_correct ? "✓ Correct" : "✗ Needs improvement"}
            </div>

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

            {evaluation.improved_answer && (
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase text-emerald-600">Model Answer</p>
                <p className="mt-1.5 text-sm text-emerald-900">{evaluation.improved_answer}</p>
              </div>
            )}

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
