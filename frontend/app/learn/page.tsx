"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import ExerciseCard from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  analyzeLearnContent,
  evaluateLearnAnswer,
  saveLearnSession,
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
  evaluation: LearnEvaluationResponse | null;
  isEvaluating: boolean;
}

export default function LearnPage() {
  const [tab, setTab] = useState<InputTab>("text");
  const [inputText, setInputText] = useState("");
  const [pageState, setPageState] = useState<PageState>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<LearnContentResponse | null>(null);
  const [sourceType, setSourceType] = useState<LearnSourceType>("text");
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [sessionSaved, setSessionSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    const text = inputText.trim();
    if (text.length < 10) {
      setError("Please enter at least 10 characters of text.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const result = await analyzeLearnContent({ text, source_type: sourceType });
      setContent(result);
      setExercises(result.exercises.map((ex) => ({ exercise: ex, evaluation: null, isEvaluating: false })));
      setActiveExerciseIdx(0);
      setPageState("content");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleStartExercises = () => {
    setPageState("exercises");
    setActiveExerciseIdx(0);
  };

  const handleEvaluateExercise = async (index: number, userAnswer: string) => {
    if (!content) return;
    const ex = exercises[index].exercise;
    const correctAnswer =
      ex.correct_answer ?? ex.correct ?? ex.hints?.join(", ") ?? "";

    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, isEvaluating: true } : e))
    );
    try {
      const result = await evaluateLearnAnswer({
        exercise_type: ex.type,
        question: ex.prompt ?? ex.question,
        correct_answer: correctAnswer,
        user_answer: userAnswer,
        context: content.summary
      });
      setExercises((prev) =>
        prev.map((e, i) =>
          i === index ? { ...e, evaluation: result, isEvaluating: false } : e
        )
      );
    } catch {
      setExercises((prev) =>
        prev.map((e, i) => (i === index ? { ...e, isEvaluating: false } : e))
      );
    }
  };

  const handleNextExercise = () => {
    if (activeExerciseIdx < exercises.length - 1) {
      setActiveExerciseIdx((i) => i + 1);
    } else {
      setPageState("complete");
      void saveSession();
    }
  };

  const saveSession = async () => {
    if (!content || sessionSaved) return;
    setSessionSaved(true);
    const evals = exercises.map((e) => e.evaluation).filter(Boolean) as LearnEvaluationResponse[];
    const avgScore = evals.length
      ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length)
      : undefined;
    const avgGrammar = evals.length ? evals.reduce((s, e) => s + e.grammar, 0) / evals.length : undefined;
    const avgVocab = evals.length ? evals.reduce((s, e) => s + e.vocabulary, 0) / evals.length : undefined;
    const avgStructure = evals.length ? evals.reduce((s, e) => s + e.structure, 0) / evals.length : undefined;

    try {
      await saveLearnSession({
        source_type: sourceType,
        topic: content.topic,
        level: content.level,
        score: avgScore,
        grammar: avgGrammar,
        vocabulary: avgVocab,
        structure: avgStructure,
        exercises_total: exercises.length,
        exercises_completed: evals.length
      });
    } catch {
      // non-critical, ignore
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
  };

  // Compute session score
  const completedEvals = exercises.map((e) => e.evaluation).filter(Boolean) as LearnEvaluationResponse[];
  const sessionScore =
    completedEvals.length > 0
      ? Math.round(completedEvals.reduce((s, e) => s + e.score, 0) / completedEvals.length)
      : null;

  return (
    <AppShell
      title="AI Learn"
      subtitle="Upload content — AI teaches, you practice, AI evaluates"
    >
      <div className="space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── INPUT STATE ─────────────────────────────────────────────────── */}
        {pageState === "input" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            {/* Left: Options */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Input Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={tab === "text" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTab("text")}
                  >
                    Paste Text
                  </Button>
                  <Button
                    variant={tab === "upload" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTab("upload")}
                  >
                    Upload File
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Paste any French text or upload a PDF / image. AI will analyze the content and build learning exercises.
                </p>
              </CardContent>
            </Card>

            {/* Right: Input area */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6">
                {tab === "text" ? (
                  <>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={10}
                      placeholder="Paste French text here... (article, passage, document, or any content)"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">{inputText.length} characters</span>
                      <Button onClick={handleAnalyze} disabled={isLoading || inputText.trim().length < 10}>
                        {isLoading ? "Analyzing..." : "Analyze & Learn"}
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
                      {isLoading && <p className="mt-2 text-xs text-slate-500">Extracting text...</p>}
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
                          {isLoading ? "Analyzing..." : "Analyze & Learn"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── CONTENT STATE ────────────────────────────────────────────────── */}
        {pageState === "content" && content && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white">
                {content.topic}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                Level: {content.level}
              </span>
              <Button variant="outline" className="ml-auto" onClick={handleReset}>
                Start Over
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Summary + Key Points */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
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

              {/* Vocabulary */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Key Vocabulary</CardTitle>
                </CardHeader>
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

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-semibold text-slate-900">{content.exercises.length} exercises ready</p>
                  <p className="text-sm text-slate-500">MCQ, fill-in-blank, correction, writing, and speaking</p>
                </div>
                <Button onClick={handleStartExercises}>Start Exercises</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── EXERCISES STATE ───────────────────────────────────────────────── */}
        {pageState === "exercises" && content && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Topic</p>
                <p className="font-semibold text-slate-900">{content.topic}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {exercises.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-6 rounded-full transition-colors ${
                          i < activeExerciseIdx
                            ? "bg-emerald-500"
                            : i === activeExerciseIdx
                            ? "bg-slate-800"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-500">
                    {activeExerciseIdx + 1}/{exercises.length}
                  </span>
                </div>
                {sessionScore !== null && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    Avg: {sessionScore}/100
                  </span>
                )}
              </div>
            </div>

            {/* Current exercise */}
            <ExerciseCard
              exercise={exercises[activeExerciseIdx].exercise}
              index={activeExerciseIdx}
              evaluation={exercises[activeExerciseIdx].evaluation}
              isEvaluating={exercises[activeExerciseIdx].isEvaluating}
              onSubmit={(answer) => void handleEvaluateExercise(activeExerciseIdx, answer)}
            />

            {/* Next button — visible once evaluated */}
            {exercises[activeExerciseIdx].evaluation && (
              <Button className="w-full" onClick={handleNextExercise}>
                {activeExerciseIdx < exercises.length - 1
                  ? "Next Exercise →"
                  : "Finish Session"}
              </Button>
            )}
          </div>
        )}

        {/* ── COMPLETE STATE ───────────────────────────────────────────────── */}
        {pageState === "complete" && content && (
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-6 p-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                  🎉
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Session Complete!</h2>
                  <p className="mt-1 text-slate-500">{content.topic} · Level {content.level}</p>
                </div>
                {sessionScore !== null && (
                  <div className="inline-block rounded-2xl bg-slate-800 px-8 py-4 text-white">
                    <p className="text-sm uppercase tracking-wide opacity-70">Overall Score</p>
                    <p className="mt-1 text-4xl font-bold">{sessionScore}/100</p>
                  </div>
                )}
                {completedEvals.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: "Grammar", val: Math.round(completedEvals.reduce((s, e) => s + e.grammar, 0) / completedEvals.length) },
                      { label: "Vocabulary", val: Math.round(completedEvals.reduce((s, e) => s + e.vocabulary, 0) / completedEvals.length) },
                      { label: "Structure", val: Math.round(completedEvals.reduce((s, e) => s + e.structure, 0) / completedEvals.length) }
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase text-slate-400">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{val}/10</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={handleReset}>New Session</Button>
                  <Button variant="outline" onClick={() => setPageState("exercises")}>
                    Review Exercises
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* All exercises with evaluations */}
            {exercises.some((e) => e.evaluation) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase text-slate-400">Exercise Review</h3>
                {exercises.map((ex, i) => (
                  <ExerciseCard
                    key={i}
                    exercise={ex.exercise}
                    index={i}
                    evaluation={ex.evaluation}
                    isEvaluating={false}
                    onSubmit={() => undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
