"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Volume2 } from "lucide-react";
import type { ExamQuestion, ExamResultItem, ExamQuestionType, SubmitExamResponse } from "@/types/exam";

interface ExamResultsProps {
  results: SubmitExamResponse;
  questions: Record<number, ExamQuestion>;
}

const SECTION_LABELS: Record<ExamQuestionType, string> = {
  everyday_life:  "Section 1 — Everyday Documents",
  gap_fill:       "Section 2 — Gap-Fill Sentences",
  rapid_reading:  "Section 3 — Rapid Reading",
  administrative: "Section 4 — Administrative Texts",
  press:          "Section 5 — Press Articles"
};

const SECTION_ORDER: ExamQuestionType[] = [
  "everyday_life",
  "gap_fill",
  "rapid_reading",
  "administrative",
  "press"
];

function estimateLevel(accuracy: number): { level: string; color: string; description: string } {
  if (accuracy >= 85) return { level: "C1",  color: "text-emerald-700 bg-emerald-50 border-emerald-200", description: "Advanced — Excellent performance!" };
  if (accuracy >= 75) return { level: "B2",  color: "text-blue-700 bg-blue-50 border-blue-200",         description: "Upper-Intermediate — Strong reading skills." };
  if (accuracy >= 60) return { level: "B1+", color: "text-indigo-700 bg-indigo-50 border-indigo-200",   description: "Intermediate — Good foundation, room to grow." };
  if (accuracy >= 40) return { level: "B1",  color: "text-amber-700 bg-amber-50 border-amber-200",      description: "Intermediate — Keep practising regularly." };
  return                     { level: "A2",  color: "text-rose-700 bg-rose-50 border-rose-200",          description: "Elementary — Focus on core vocabulary and grammar." };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
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

export default function ExamResults({ results, questions }: ExamResultsProps) {
  const [expandedSection, setExpandedSection] = useState<ExamQuestionType | null>(null);

  const levelInfo = estimateLevel(results.accuracy);

  // Group results by section
  const bySection: Record<ExamQuestionType, ExamResultItem[]> = {
    everyday_life: [],
    gap_fill: [],
    rapid_reading: [],
    administrative: [],
    press: []
  };
  for (const item of results.results) {
    const type = item.question_type as ExamQuestionType;
    if (bySection[type]) bySection[type].push(item);
  }

  // Section scores
  const sectionStats = SECTION_ORDER.map((type) => {
    const items = bySection[type];
    const correct = items.filter((i) => i.is_correct).length;
    const total = items.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return { type, correct, total, pct };
  }).filter((s) => s.total > 0);

  const strengths = sectionStats.filter((s) => s.pct >= 65);
  const weaknesses = sectionStats.filter((s) => s.pct < 65);

  const tips: Record<ExamQuestionType, string> = {
    everyday_life:  "Practice reading notices, schedules, and advertisements. Focus on skimming for key details.",
    gap_fill:       "Review connector words (cependant, néanmoins, en revanche) and verb conjugation patterns.",
    rapid_reading:  "Train timed reading: read a passage in 90 seconds and immediately answer questions without re-reading.",
    administrative: "Study formal letter structures, official vocabulary, and administrative document formats.",
    press:          "Read French news articles daily (Le Monde, Radio-Canada). Focus on tone and implicit meaning."
  };

  return (
    <div className="space-y-6">
      {/* ── Score hero ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Score */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl font-bold text-slate-900">{results.score}<span className="text-xl text-slate-400">/{results.total}</span></p>
          <p className="mt-1 text-sm text-slate-500">Score</p>
        </div>
        {/* Accuracy */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl font-bold text-slate-900">{results.accuracy}<span className="text-xl text-slate-400">%</span></p>
          <p className="mt-1 text-sm text-slate-500">Accuracy</p>
        </div>
        {/* Time */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{formatTime(results.completion_time)}</p>
          <p className="mt-1 text-sm text-slate-500">Time taken</p>
        </div>
      </div>

      {/* ── Estimated level ────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border px-5 py-4 ${levelInfo.color}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold">{levelInfo.level}</span>
          <div>
            <p className="font-semibold">Estimated Level</p>
            <p className="text-sm opacity-80">{levelInfo.description}</p>
          </div>
        </div>
      </div>

      {/* ── Section breakdown ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Section-wise Performance</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {sectionStats.map(({ type, correct, total, pct }) => (
            <div key={type} className="px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">{SECTION_LABELS[type]}</span>
                <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                  {correct}/{total} ({pct}%)
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Strengths + Weaknesses ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
          {strengths.length === 0 ? (
            <p className="text-sm text-emerald-700">Keep practising to build strengths.</p>
          ) : (
            <ul className="space-y-1">
              {strengths.map((s) => (
                <li key={s.type} className="flex items-center gap-2 text-sm text-emerald-800">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {SECTION_LABELS[s.type].split("—")[1]?.trim()} ({s.pct}%)
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Weaknesses */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">Needs Improvement</p>
          {weaknesses.length === 0 ? (
            <p className="text-sm text-rose-700">No critical weaknesses — great job!</p>
          ) : (
            <ul className="space-y-1">
              {weaknesses.map((s) => (
                <li key={s.type} className="flex items-center gap-2 text-sm text-rose-800">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {SECTION_LABELS[s.type].split("—")[1]?.trim()} ({s.pct}%)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Improvement tips ───────────────────────────────────────────────── */}
      {weaknesses.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">Actionable Improvement Tips</p>
          <ul className="space-y-2">
            {weaknesses.map((s) => (
              <li key={s.type} className="text-sm text-amber-900">
                <span className="font-semibold">{SECTION_LABELS[s.type].split("—")[1]?.trim()}:</span>{" "}
                {tips[s.type]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Question-by-question review ────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Question Review by Section</h3>
        {SECTION_ORDER.map((type) => {
          const items = bySection[type].filter((i) => i.user_answer);
          if (items.length === 0) return null;
          const isExpanded = expandedSection === type;
          return (
            <div key={type} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : type)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
              >
                <span className="font-medium text-slate-800">{SECTION_LABELS[type]}</span>
                <span className="flex items-center gap-2 text-sm text-slate-500">
                  {items.filter((i) => i.is_correct).length}/{items.length} correct
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {isExpanded && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {items.map((item) => {
                    const q = questions[item.question_number];
                    return (
                      <div key={item.question_number} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {item.is_correct
                            ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-400">Question {item.question_number}</p>
                            {q && (
                              <>
                                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{q.text}</p>
                                <p className="mt-1 text-sm font-medium text-slate-800">{q.question}</p>
                                {q.text && (
                                  <button
                                    onClick={() => speakText(q.text)}
                                    className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600"
                                  >
                                    <Volume2 className="h-3 w-3" /> Listen to passage
                                  </button>
                                )}
                              </>
                            )}
                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                              <span className={`font-semibold ${item.is_correct ? "text-emerald-700" : "text-rose-700"}`}>
                                Your answer: {item.user_answer || "—"}
                              </span>
                              {!item.is_correct && (
                                <span className="font-semibold text-emerald-700">
                                  Correct: {item.correct_answer}
                                </span>
                              )}
                            </div>
                            {item.explanation && (
                              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{item.explanation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
