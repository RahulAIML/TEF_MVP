"use client";

import { useState } from "react";
import { Volume2, Languages, Loader2 } from "lucide-react";
import type { AnswerOption, ExamQuestion } from "@/types/exam";
import { chatWithAI } from "@/services/api";

interface QuestionCardProps {
  question: ExamQuestion;
  selectedAnswer: AnswerOption | "";
  onSelect: (value: AnswerOption) => void;
  disabled?: boolean;
}

function speakFrench(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frVoice) utt.voice = frVoice;
  utt.rate = 0.88;
  window.speechSynthesis.speak(utt);
}

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  disabled
}: QuestionCardProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const fetchTranslation = async () => {
    if (translation || translating) return;
    setTranslating(true);
    try {
      const { reply } = await chatWithAI({
        message: `Translate the following French text to English. Return only the translation, no commentary:\n\n${question.text}`
      });
      setTranslation(reply);
    } catch {
      setTranslation("Translation unavailable. Try the Study Assistant for help.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Passage panel: French (left) | Translation (right) ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Passage toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Passage — Q{question.question_number}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => speakFrench(question.text)}
              title="Listen to passage in French"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200 hover:text-indigo-600"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Listen
            </button>
            <button
              onClick={() => void fetchTranslation()}
              title="Show English translation"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200 hover:text-indigo-600 disabled:opacity-50"
              disabled={translating}
            >
              {translating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Languages className="h-3.5 w-3.5" />
              }
              {translation ? "Hide" : "Translate"}
            </button>
          </div>
        </div>

        {/* Passage body — side-by-side when translation available */}
        <div className={`grid ${translation ? "grid-cols-2 divide-x divide-slate-100" : "grid-cols-1"}`}>
          {/* French (always shown) */}
          <div className="p-5 text-[1.02rem] leading-7 text-slate-800">
            {question.text}
          </div>

          {/* English translation (shown when available) */}
          {translation && (
            <div className="bg-sky-50/60 p-5 text-[0.97rem] leading-7 text-slate-700">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-sky-500">
                English Translation
              </p>
              {translation}
            </div>
          )}
        </div>
      </div>

      {/* ── Question + options ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">{question.question}</h3>
        <div className="mt-3 space-y-2">
          {question.options.map((option, index) => {
            const label = option.trim();
            const value = (["A", "B", "C", "D"][index] as AnswerOption) ?? "A";
            const isSelected = selectedAnswer === value;
            return (
              <label
                key={`${question.question_number}-opt-${index}`}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-150 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${question.question_number}`}
                  className="mt-1 shrink-0"
                  value={value}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onSelect(value)}
                />
                <span className={`mr-1 shrink-0 font-semibold ${isSelected ? "text-white" : "text-indigo-600"}`}>
                  {value}.
                </span>
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
