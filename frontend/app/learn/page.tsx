"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import ExerciseCard from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  analyzeLearnContent,
  evaluateLearnAnswer,
  generateMoreExercises,
  saveLearnSession,
  translatePassage,
  uploadLearnFile
} from "@/services/api";
import type {
  LearnContentResponse,
  LearnEvaluationResponse,
  LearnExercise,
  LearnSourceType
} from "@/types/learn";

type InputTab = "text" | "upload";
type PageState = "input" | "content" | "exercises" | "complete";

interface ExerciseState {
  exercise: LearnExercise;
  answer: string;
  evaluation: LearnEvaluationResponse | null;
  isEvaluating: boolean;
}

export default function LearnPage() {
  const [tab, setTab] = useState<InputTab>("text");
  const [inputText, setInputText] = useState("");
  const [pageState, setPageState] = useState<PageState>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [round, setRound] = useState(1);
  const [error, setError] = useState("");
  const [content, setContent] = useState<LearnContentResponse | null>(null);
  const [sourceType, setSourceType] = useState<LearnSourceType>("text");
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [passageOpen, setPassageOpen] = useState(true);
  const [translation, setTranslation] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const text = inputText.trim();
    if (text.length < 10) { setError("Please enter at least 10 characters."); return; }
    setError("");
    setIsLoading(true);
    try {
      const result = await analyzeLearnContent({ text, source_type: sourceType });
      setContent(result);
      setExercises(result.exercises.map((ex) => ({
        exercise: ex,
        answer: "",
        evaluation: null,
        isEvaluating: false
      })));
      setTranslation("");
      setShowTranslation(false);
      setPassageOpen(true);
      setPageState("content");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setError("");
    setIsLoading(true);
    try {
      const { text, source_type } = await uploadLearnFile(file);
      setInputText(text);
      setSourceType(source_type as LearnSourceType);
      setTab("text");
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Answer tracking ───────────────────────────────────────────────────────
  const handleAnswerChange = (index: number, answer: string) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, answer } : e))
    );
  };

  // ── Evaluate all at once (parallel) ──────────────────────────────────────
  const handleEvaluateAll = async () => {
    if (!content) return;

    // Mark all as evaluating
    setIsEvaluatingAll(true);
    setExercises((prev) => prev.map((e) => ({ ...e, isEvaluating: true })));

    const results = await Promise.allSettled(
      exercises.map(async (state, index) => {
        const ex = state.exercise;
        const userAnswer = state.answer.trim() || "(no answer)";
        const correctAnswer = ex.correct_answer ?? ex.correct ?? ex.hints?.join(", ") ?? "";
        const result = await evaluateLearnAnswer({
          exercise_type: ex.type,
          question: ex.prompt ?? ex.question,
          correct_answer: correctAnswer,
          user_answer: userAnswer,
          context: content.summary
        });
        return { index, result };
      })
    );

    // Apply results
    setExercises((prev) =>
      prev.map((e, i) => {
        const settled = results[i];
        if (settled.status === "fulfilled") {
          return { ...e, evaluation: settled.value.result, isEvaluating: false };
        }
        return { ...e, isEvaluating: false };
      })
    );

    setIsEvaluatingAll(false);
    setPageState("complete");
    void saveSession();
  };

  // ── Save session ──────────────────────────────────────────────────────────
  const saveSession = async () => {
    if (!content || sessionSaved) return;
    setSessionSaved(true);
    const evals = exercises.map((e) => e.evaluation).filter(Boolean) as LearnEvaluationResponse[];
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    try {
      await saveLearnSession({
        source_type: sourceType,
        topic: content.topic,
        level: content.level,
        score: avg(evals.map((e) => e.score)),
        grammar: avg(evals.map((e) => e.grammar)),
        vocabulary: avg(evals.map((e) => e.vocabulary)),
        structure: avg(evals.map((e) => e.structure)),
        exercises_total: exercises.length,
        exercises_completed: evals.length
      });
    } catch {
      // non-critical
    }
  };

  const handleGenerateMore = async () => {
    if (!content) return;
    setIsGeneratingMore(true);
    setError("");
    try {
      const newExercises = await generateMoreExercises({
        topic: content.topic,
        level: content.level,
        summary: content.summary
      });
      setExercises(newExercises.map((ex) => ({ exercise: ex, answer: "", evaluation: null, isEvaluating: false })));
      setSessionSaved(false);
      setRound((r) => r + 1);
      setPageState("exercises");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate more exercises.");
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleTranslate = async () => {
    if (translation) {
      // Already translated — just toggle visibility
      setShowTranslation((p) => !p);
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translatePassage(inputText);
      setTranslation(result);
      setShowTranslation(true);
    } catch {
      setError("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReset = () => {
    setPageState("input");
    setContent(null);
    setExercises([]);
    setInputText("");
    setError("");
    setSessionSaved(false);
    setSourceType("text");
    setTab("text");
    setTranslation("");
    setShowTranslation(false);
    setPassageOpen(true);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const completedEvals = exercises.map((e) => e.evaluation).filter(Boolean) as LearnEvaluationResponse[];
  const sessionScore =
    completedEvals.length > 0
      ? (completedEvals.reduce((s, e) => s + e.score, 0) / completedEvals.length).toFixed(1)
      : null;

  const allAnswered = exercises.length > 0 && exercises.every((e) => e.answer.trim() !== "");
  const anyAnswered = exercises.some((e) => e.answer.trim() !== "");

  return (
    <AppShell title="AI Learn" subtitle="Upload content — AI teaches, you practice, AI evaluates">
      <div className="space-y-6">

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── INPUT ─────────────────────────────────────────────────────────── */}
        {pageState === "input" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader><CardTitle className="text-base">Input Method</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button variant={tab === "text" ? "default" : "outline"} className="flex-1"
                    onClick={() => setTab("text")}>Paste Text</Button>
                  <Button variant={tab === "upload" ? "default" : "outline"} className="flex-1"
                    onClick={() => setTab("upload")}>Upload File</Button>
                </div>
                <p className="text-xs text-slate-500">
                  Paste any French text or upload a PDF / image. AI analyzes it and builds 5 exercises for you to answer all at once.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6">
                {tab === "text" ? (
                  <>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={10}
                      placeholder="Paste French text here... (article, passage, document)"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">{inputText.length} characters</span>
                      <Button onClick={handleAnalyze} disabled={isLoading || inputText.trim().length < 10}>
                        {isLoading ? "Analyzing..." : "Analyze & Build Exercises"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-700">Click to upload PDF or image</p>
                      <p className="mt-1 text-xs text-slate-400">PDF, PNG, JPG, WEBP supported</p>
                      {isLoading && <p className="mt-2 text-xs text-slate-500 animate-pulse">Extracting text...</p>}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileUpload(file);
                      }}
                    />
                    {inputText && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500">Extracted text preview:</p>
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-700 line-clamp-4">
                          {inputText.slice(0, 300)}...
                        </p>
                        <Button onClick={handleAnalyze} disabled={isLoading}>
                          {isLoading ? "Analyzing..." : "Analyze & Build Exercises"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── CONTENT (summary + vocab) ─────────────────────────────────────── */}
        {(pageState === "content" || pageState === "exercises" || pageState === "complete") && content && (
          <div className="space-y-6">
            {/* Topic + level bar */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white">
                {content.topic}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                Level: {content.level}
              </span>
              <Button variant="outline" className="ml-auto" onClick={handleReset}>Start Over</Button>
            </div>

            {/* Summary + Vocabulary — collapsed once exercises are shown */}
            {pageState === "content" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-700">{content.summary}</p>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Key Points</p>
                      <ul className="space-y-2">
                        {content.key_points.map((point, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center">{i + 1}</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader><CardTitle className="text-base">Key Vocabulary</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {content.vocabulary.map((item, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-900">{item.word}</span>
                          <span className="text-xs text-slate-500">{item.definition}</span>
                        </div>
                        <p className="mt-1 text-xs italic text-slate-600">{item.example}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Start exercises CTA */}
            {pageState === "content" && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex items-center justify-between gap-4 p-6">
                  <div>
                    <p className="font-semibold text-slate-900">{exercises.length} exercises ready</p>
                    <p className="text-sm text-slate-500">
                      Answer all of them, then click <strong>Evaluate All</strong> to get instant feedback.
                    </p>
                  </div>
                  <Button onClick={() => setPageState("exercises")}>Start Exercises</Button>
                </CardContent>
              </Card>
            )}

            {/* ── ALL EXERCISES (shown at once) ───────────────────────────────── */}
            {(pageState === "exercises" || pageState === "complete") && (
              <div className="space-y-6">

                {/* ── Original passage (collapsible, with translate toggle) ── */}
                <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 shadow-sm">
                  <div className="flex w-full items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                        Original Passage
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        Reference
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleTranslate()}
                        disabled={isTranslating}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 transition disabled:opacity-50"
                      >
                        🌐 {isTranslating ? "Translating…" : showTranslation ? "Hide Translation" : "Translate"}
                      </button>
                      <button
                        onClick={() => setPassageOpen((p) => !p)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition"
                      >
                        {passageOpen ? "▲ Hide" : "▼ Show"}
                      </button>
                    </div>
                  </div>
                  {passageOpen && (
                    <div className="border-t border-indigo-100 px-5 py-4 space-y-3">
                      <p className="text-sm leading-7 text-slate-800 whitespace-pre-wrap">{inputText}</p>
                      {showTranslation && translation && (
                        <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase text-indigo-400">English Translation</p>
                          <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{translation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 gap-1">
                    {exercises.map((ex, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          ex.evaluation
                            ? "bg-emerald-500"
                            : ex.answer.trim()
                            ? "bg-slate-600"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-500">
                    Round {round} · {exercises.filter((e) => e.answer.trim()).length}/{exercises.length} answered
                  </span>
                  {sessionScore && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      Avg: {sessionScore}/10
                    </span>
                  )}
                </div>

                {/* All exercise cards */}
                {exercises.map((state, i) => (
                  <ExerciseCard
                    key={i}
                    exercise={state.exercise}
                    index={i}
                    answer={state.answer}
                    onAnswerChange={(ans) => handleAnswerChange(i, ans)}
                    evaluation={state.evaluation}
                    isEvaluating={state.isEvaluating}
                  />
                ))}

                {/* Evaluate All button */}
                {pageState === "exercises" && (
                  <div className="sticky bottom-4 flex justify-center">
                    <Button
                      className="px-10 py-3 text-base shadow-lg"
                      disabled={isEvaluatingAll || !anyAnswered}
                      onClick={() => void handleEvaluateAll()}
                    >
                      {isEvaluatingAll
                        ? "Evaluating all exercises..."
                        : allAnswered
                        ? "Evaluate All →"
                        : `Evaluate All (${exercises.filter((e) => e.answer.trim()).length} answered)`}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── COMPLETE SUMMARY ─────────────────────────────────────────────── */}
            {pageState === "complete" && sessionScore && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-6 p-8 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                    🎉
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Session Complete!</h2>
                    <p className="mt-1 text-slate-500">
                      {content.topic} · Level {content.level} · Round {round}
                    </p>
                  </div>
                  <div className="inline-block rounded-2xl bg-slate-800 px-8 py-4 text-white">
                    <p className="text-sm uppercase tracking-wide opacity-70">Overall Score</p>
                    <p className="mt-1 text-4xl font-bold">{sessionScore}/10</p>
                  </div>
                  {completedEvals.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        { label: "Grammar", val: (completedEvals.reduce((s, e) => s + e.grammar, 0) / completedEvals.length).toFixed(1) },
                        { label: "Vocabulary", val: (completedEvals.reduce((s, e) => s + e.vocabulary, 0) / completedEvals.length).toFixed(1) },
                        { label: "Structure", val: (completedEvals.reduce((s, e) => s + e.structure, 0) / completedEvals.length).toFixed(1) }
                      ].map(({ label, val }) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs uppercase text-slate-400">{label}</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">{val}/10</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      onClick={() => void handleGenerateMore()}
                      disabled={isGeneratingMore}
                      className="px-6"
                    >
                      {isGeneratingMore ? "Generating..." : "Practice More Questions →"}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>New Topic</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
