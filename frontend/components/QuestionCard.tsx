"use client";

import { Volume2 } from "lucide-react";
import type { AnswerOption, ExamQuestion } from "@/types/exam";

interface QuestionCardProps {
  question: ExamQuestion;
  selectedAnswer: AnswerOption | "";
  onSelect: (value: AnswerOption) => void;
  disabled?: boolean;
}

function speakText(text: string) {
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
  return (
    <div className="space-y-4">
      {/* Passage */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-[1.02rem] leading-7 text-slate-800">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Passage
          </span>
          <button
            onClick={() => speakText(question.text)}
            title="Listen to passage in French"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Listen
          </button>
        </div>
        {question.text}
      </div>

      {/* Question + options */}
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
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-150 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <input
                  type="radio"
                  name={`question-${question.question_number}`}
                  className="mt-1 shrink-0"
                  value={value}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onSelect(value)}
                />
                <span className="font-medium mr-1 shrink-0">{value}.</span>
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
