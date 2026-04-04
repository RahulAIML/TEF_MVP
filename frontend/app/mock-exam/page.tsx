"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import ExamContainer from "@/components/ExamContainer";
import ExamResults from "@/components/ExamResults";
import QuestionCard from "@/components/QuestionCard";
import QuestionNavigator from "@/components/QuestionNavigator";
import TextHelperTool from "@/components/TextHelperTool";
import TextExplanationCard from "@/components/TextExplanationCard";
import TimerClock from "@/components/TimerClock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { explainText, generateQuestion, submitExam } from "@/services/api";
import type { AnswerOption, ExamQuestion, SubmitExamResponse } from "@/types/exam";
import type { ExplainTextResponse } from "@/types/text-helper";
import { Loader2, BookOpen, Clock, CheckSquare } from "lucide-react";

const TOTAL_QUESTIONS = 40;
const EXAM_DURATION_SECONDS = 60 * 60;
const PREFETCH_AHEAD = 5;

// Auto-save answers to localStorage
const AUTOSAVE_KEY = "tef_mock_exam_answers";
function loadSavedAnswers(): Record<number, AnswerOption | ""> {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, AnswerOption | "">) : {};
  } catch {
    return {};
  }
}
function saveAnswers(answers: Record<number, AnswerOption | "">) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(answers));
  } catch { /* ignore */ }
}
function clearSavedAnswers() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch { /* ignore */ }
}

export default function MockExamPage() {
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questions, setQuestions] = useState<Record<number, ExamQuestion>>({});
  const [answers, setAnswers] = useState<Record<number, AnswerOption | "">>({});
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState("");
  const [submitNote, setSubmitNote] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<SubmitExamResponse | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [helperText, setHelperText] = useState("");
  const [helperResult, setHelperResult] = useState<ExplainTextResponse | null>(null);
  const [helperLoading, setHelperLoading] = useState(false);
  const [confirmPartial, setConfirmPartial] = useState(false);

  const questionsRef = useRef<Record<number, ExamQuestion>>({});
  const inFlightRef = useRef<Partial<Record<number, Promise<ExamQuestion>>>>({});
  const examSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Auto-save answers on change
  useEffect(() => {
    if (isExamStarted && !results) {
      saveAnswers(answers);
    }
  }, [answers, isExamStarted, results]);

  const ensureQuestion = async (questionNumber: number, showLoader = true) => {
    const existing = questionsRef.current[questionNumber];
    if (existing) return existing;

    const inFlight = inFlightRef.current[questionNumber];
    if (inFlight) {
      if (showLoader) setLoadingQuestion(true);
      const shouldPause = showLoader && timerActive;
      if (shouldPause) setTimerActive(false);
      try {
        return await inFlight;
      } finally {
        if (showLoader) setLoadingQuestion(false);
        if (shouldPause && !timeUp && !results) setTimerActive(true);
      }
    }

    if (showLoader) setLoadingQuestion(true);
    const shouldPause = showLoader && timerActive;
    if (shouldPause) setTimerActive(false);
    try {
      const request = generateQuestion({
        question_number: questionNumber,
        session_id: examSessionIdRef.current ?? undefined
      }).then((question) => {
        const updated = { ...questionsRef.current, [questionNumber]: question };
        questionsRef.current = updated;
        setQuestions(updated);
        return question;
      });
      inFlightRef.current[questionNumber] = request;
      return await request;
    } finally {
      delete inFlightRef.current[questionNumber];
      if (showLoader) setLoadingQuestion(false);
      if (shouldPause && !timeUp && !results) setTimerActive(true);
    }
  };

  const prefetchQuestions = (fromQuestion: number) => {
    if (!isExamStarted || timeUp || results) return;
    for (let offset = 1; offset <= PREFETCH_AHEAD; offset++) {
      const qn = fromQuestion + offset;
      if (qn > TOTAL_QUESTIONS) break;
      if (questionsRef.current[qn] || inFlightRef.current[qn]) continue;
      void ensureQuestion(qn, false).catch(() => undefined);
    }
  };

  const handleStartExam = async () => {
    if (isExamStarted) return;
    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    examSessionIdRef.current = sessionId;

    // Restore auto-saved answers if any
    const saved = loadSavedAnswers();
    setAnswers(saved);
    setIsExamStarted(true);
    setTimeUp(false);
    setError("");
    setSubmitNote("");

    try {
      await ensureQuestion(1);
      prefetchQuestions(1);
      setStartedAt(new Date().toISOString());
      setTimerKey((prev) => prev + 1);
      setTimerActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate question.");
      setIsExamStarted(false);
    }
  };

  const handleSelectQuestion = async (questionNumber: number) => {
    if (results || timeUp) return;
    setCurrentQuestion(questionNumber);
    if (!questionsRef.current[questionNumber]) {
      try {
        await ensureQuestion(questionNumber);
        prefetchQuestions(questionNumber);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load question.");
      }
      return;
    }
    prefetchQuestions(questionNumber);
  };

  const handleAnswerSelect = (value: AnswerOption) => {
    if (results || timeUp) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));
  };

  const normalizeSelection = (raw: string) => raw.replace(/\s+/g, " ").trim();

  const handleExplainText = async () => {
    if (!helperText.trim()) return;
    setHelperLoading(true);
    setError("");
    try {
      const result = await explainText({ text: helperText.trim() });
      setHelperResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to explain text.");
    } finally {
      setHelperLoading(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection()?.toString() ?? "";
    const chosen = normalizeSelection(selection);
    if (chosen) setHelperText(chosen);
  };

  const handleTimerExpire = () => {
    if (timeUp || results) return;
    setTimeUp(true);
    void submitExamNow();
  };

  const submitExamNow = async () => {
    if (isSubmitting || results) return;
    if (!startedAt) { setError("Exam has not started."); return; }

    setIsSubmitting(true);
    setError("");
    setSubmitNote("");
    setTimerActive(false);

    try {
      const completedAt = new Date().toISOString();
      const questionList = Object.values(questionsRef.current)
        .sort((a, b) => a.question_number - b.question_number)
        .map((q) => ({
          question_number: q.question_number,
          correct_answer: q.correct_answer,
          question_type: q.question_type,
          explanation: q.explanation
        }));

      const response = await submitExam({
        started_at: startedAt,
        completed_at: completedAt,
        answers,
        questions: questionList
      });

      clearSavedAnswers();
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit exam. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitExam = async () => {
    if (isSubmitting || results) return;
    if (!startedAt) { setError("Exam has not started."); return; }

    const questionList = Object.values(questionsRef.current)
      .sort((a, b) => a.question_number - b.question_number);

    if (questionList.length < TOTAL_QUESTIONS) {
      const note =
        `Only ${questionList.length} of ${TOTAL_QUESTIONS} questions were generated. ` +
        "Score will be based on these questions only.";
      setSubmitNote(note);
      setConfirmPartial(true);
      return;
    }

    await submitExamNow();
  };

  const currentQuestionData = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion] ?? "";
  const answeredCount = Object.values(answers).filter(Boolean).length;

  // ── Evaluating loading screen ──────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <AppShell title="Reading Mock Exam" subtitle="Evaluating your answers..." backHref="/reading">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900">Evaluating your answers…</h2>
            <p className="mt-2 text-sm text-slate-500">
              Calculating your score, section breakdown, and personalized feedback.
            </p>
          </div>
          <div className="w-64 overflow-hidden rounded-full bg-slate-200">
            <div className="h-2 animate-pulse rounded-full bg-indigo-500" style={{ width: "75%" }} />
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Results screen (replaces exam entirely) ────────────────────────────────
  if (results) {
    return (
      <AppShell title="Reading Module — Results" subtitle="Your performance breakdown" backHref="/reading">
        <div className="mx-auto max-w-4xl space-y-6">
          {timeUp && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Time expired — your exam was submitted automatically.
            </div>
          )}
          <ExamResults results={results} questions={questions} />
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => {
                setResults(null);
                setIsExamStarted(false);
                setCurrentQuestion(1);
                setQuestions({});
                setAnswers({});
                setTimeUp(false);
                questionsRef.current = {};
              }}
            >
              Try Another Exam
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!isExamStarted) {
    return (
      <AppShell title="Reading Mock Exam" subtitle="Full 40-question TEF Canada reading simulation" backHref="/reading">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                <BookOpen className="h-7 w-7 text-violet-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Reading Mock Exam</h2>
                <p className="mt-2 text-slate-500">
                  40 questions across 5 TEF Canada reading sections. Timer: 60 minutes.
                </p>
              </div>

              {/* Sections overview */}
              <div className="space-y-2">
                {[
                  { label: "Section 1", desc: "Everyday Documents (Q1–10)" },
                  { label: "Section 2", desc: "Gap-Fill Sentences (Q11–20)" },
                  { label: "Section 3", desc: "Rapid Reading (Q21–30)" },
                  { label: "Section 4", desc: "Administrative Texts (Q31–35)" },
                  { label: "Section 5", desc: "Press Articles (Q36–40)" }
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                    <CheckSquare className="h-4 w-4 shrink-0 text-violet-500" />
                    <span className="text-sm font-medium text-slate-700">{s.label}:</span>
                    <span className="text-sm text-slate-500">{s.desc}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Clock className="h-4 w-4 shrink-0" />
                60-minute timer starts when you click Start. Your answers are auto-saved.
              </div>

              <Button className="w-full sm:w-auto" onClick={handleStartExam}>
                Start Exam
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  // ── Exam in progress ──────────────────────────────────────────────────────
  return (
    <AppShell title="Reading Mock Exam" subtitle={`Question ${currentQuestion} of ${TOTAL_QUESTIONS}`} backHref="/reading">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ExamContainer
            currentQuestion={currentQuestion}
            totalQuestions={TOTAL_QUESTIONS}
            timer={
              <TimerClock
                durationSeconds={EXAM_DURATION_SECONDS}
                isActive={timerActive}
                resetKey={timerKey}
                onExpire={handleTimerExpire}
              />
            }
          >
            {timeUp && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Time is up. Submitting your exam…
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            {loadingQuestion && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating question…
              </div>
            )}
            {currentQuestionData && (
              <div onMouseUp={handleTextSelection} className="mx-auto w-full max-w-3xl">
                <QuestionCard
                  question={currentQuestionData}
                  selectedAnswer={currentAnswer}
                  onSelect={handleAnswerSelect}
                  disabled={false}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => void handleSelectQuestion(Math.max(1, currentQuestion - 1))}
                disabled={currentQuestion === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleSelectQuestion(Math.min(TOTAL_QUESTIONS, currentQuestion + 1))}
                disabled={currentQuestion === TOTAL_QUESTIONS}
              >
                Next
              </Button>
              <Button onClick={() => void handleSubmitExam()} disabled={isSubmitting}>
                Submit Exam ({answeredCount}/{TOTAL_QUESTIONS} answered)
              </Button>
            </div>
          </ExamContainer>

          <div className="space-y-4">
            <QuestionNavigator
              totalQuestions={TOTAL_QUESTIONS}
              currentQuestion={currentQuestion}
              answers={answers}
              onSelect={(n) => void handleSelectQuestion(n)}
            />
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <TextHelperTool
                  text={helperText}
                  onTextChange={setHelperText}
                  onExplain={() => void handleExplainText()}
                  isLoading={helperLoading}
                />
              </CardContent>
            </Card>
            {helperResult && <TextExplanationCard entry={helperResult} />}
          </div>
        </div>

        {/* Partial-submit confirmation dialog */}
        {confirmPartial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Submit with partial questions?</h3>
              <p className="mt-2 text-sm text-slate-600">{submitNote}</p>
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setConfirmPartial(false)}>Cancel</Button>
                <Button onClick={() => { setConfirmPartial(false); void submitExamNow(); }}>Submit anyway</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
