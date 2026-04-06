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

const TOTAL_QUESTIONS = 40;
const EXAM_DURATION_SECONDS = 60 * 60;
const PREFETCH_AHEAD = 5;

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


  const ensureQuestion = async (questionNumber: number, showLoader = true) => {
    const existing = questionsRef.current[questionNumber];
    if (existing) {
      return existing;
    }
    const inFlight = inFlightRef.current[questionNumber];
    if (inFlight) {
      if (showLoader) {
        setLoadingQuestion(true);
      }
      const shouldResumeTimer = showLoader && timerActive;
      if (shouldResumeTimer) {
        setTimerActive(false);
      }
      try {
        return await inFlight;
      } finally {
        if (showLoader) {
          setLoadingQuestion(false);
        }
        if (shouldResumeTimer && !timeUp && !results) {
          setTimerActive(true);
        }
      }
    }

    if (showLoader) {
      setLoadingQuestion(true);
    }
    const shouldResumeTimer = showLoader && timerActive;
    if (shouldResumeTimer) {
      setTimerActive(false);
    }
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
      if (showLoader) {
        setLoadingQuestion(false);
      }
      if (shouldResumeTimer && !timeUp && !results) {
        setTimerActive(true);
      }
    }
  };

  const prefetchQuestions = (fromQuestion: number) => {
    if (!isExamStarted || timeUp || results) {
      return;
    }
    for (let offset = 1; offset <= PREFETCH_AHEAD; offset += 1) {
      const questionNumber = fromQuestion + offset;
      if (questionNumber > TOTAL_QUESTIONS) {
        break;
      }
      if (questionsRef.current[questionNumber]) {
        continue;
      }
      if (inFlightRef.current[questionNumber]) {
        continue;
      }
      void ensureQuestion(questionNumber, false).catch(() => undefined);
    }
  };

  const handleStartExam = async () => {
    if (isExamStarted) {
      return;
    }
    setIsExamStarted(true);
    const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    examSessionIdRef.current = sessionId;
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
    if (results || timeUp) {
      return;
    }
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
    if (results || timeUp) {
      return;
    }
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));
  };


  const normalizeSelection = (rawSelection: string) => rawSelection.replace(/\s+/g, " ").trim();

  const handleExplainText = async () => {
    if (!helperText.trim()) {
      return;
    }
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
    const chosenText = normalizeSelection(selection);
    if (chosenText) {
      setHelperText(chosenText);
    }
  };

  const handleTimerExpire = () => {
    if (timeUp || results) {
      return;
    }
    setTimeUp(true);
    void handleSubmitExam();
  };

  const submitExamNow = async () => {
    if (isSubmitting || results) {
      return;
    }
    if (!startedAt) {
      setError("Exam has not started.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSubmitNote("");
    setTimerActive(false);
    try {
      const completedAt = new Date().toISOString();
      const questionList = Object.values(questionsRef.current)
        .sort((a, b) => a.question_number - b.question_number)
        .map((question) => ({
          question_number: question.question_number,
          correct_answer: question.correct_answer,
          question_type: question.question_type,
          explanation: question.explanation
        }));

      const response = await submitExam({
        started_at: startedAt,
        completed_at: completedAt,
        answers,
        questions: questionList
      });
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitExam = async () => {
    if (isSubmitting || results) {
      return;
    }
    if (!startedAt) {
      setError("Exam has not started.");
      return;
    }

    const questionList = Object.values(questionsRef.current)
      .sort((a, b) => a.question_number - b.question_number)
      .map((question) => ({
        question_number: question.question_number,
        correct_answer: question.correct_answer,
        question_type: question.question_type,
        explanation: question.explanation
      }));

    if (questionList.length < TOTAL_QUESTIONS) {
      const note =
        `Partial submission: ${questionList.length} of ${TOTAL_QUESTIONS} questions generated. ` +
        "Score is based only on generated questions.";
      setSubmitNote(note);
      setConfirmPartial(true);
      return;
    }

    await submitExamNow();
  };

  const currentQuestionData = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion] ?? "";

  return (
    <AppShell title="Reading Mock Exam" subtitle="Complete the full 40-question reading mock exam">
      <div className="space-y-6">
        {!isExamStarted ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Reading Mock Exam</h2>
              <p className="mt-2 text-sm text-slate-600">
                This mock exam includes 40 questions and a 60-minute timer. Questions are generated
                as you move through the exam.
              </p>
              <Button className="mt-4" onClick={handleStartExam}>
                Start Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Time is up. Your exam has been submitted.
                </div>
              )}
              {submitNote && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {submitNote}
                </div>
              )}
              {error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {loadingQuestion && (
                <p className="text-sm text-slate-500">Generating question...</p>
              )}
              {currentQuestionData && (
                <div onMouseUp={handleTextSelection} className="mx-auto w-full max-w-3xl">
                  <QuestionCard
                    question={currentQuestionData}
                    selectedAnswer={currentAnswer}
                    onSelect={handleAnswerSelect}
                    disabled={Boolean(results) || timeUp}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handleSelectQuestion(Math.max(1, currentQuestion - 1))}
                  disabled={currentQuestion === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSelectQuestion(Math.min(TOTAL_QUESTIONS, currentQuestion + 1))}
                  disabled={currentQuestion === TOTAL_QUESTIONS}
                >
                  Next
                </Button>
                <Button onClick={handleSubmitExam} disabled={isSubmitting || Boolean(results)}>
                  {isSubmitting ? "Submitting..." : "Submit Exam"}
                </Button>
              </div>
            </ExamContainer>

            <div className="space-y-4">
              <QuestionNavigator
                totalQuestions={TOTAL_QUESTIONS}
                currentQuestion={currentQuestion}
                answers={answers}
                onSelect={handleSelectQuestion}
              />
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <TextHelperTool
                    text={helperText}
                    onTextChange={setHelperText}
                    onExplain={handleExplainText}
                    isLoading={helperLoading}
                  />
                </CardContent>
              </Card>
              {helperResult && <TextExplanationCard entry={helperResult} />}
            </div>
          </div>
        )}

        {confirmPartial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Partial submission confirmation</h3>
              <p className="mt-2 text-sm text-slate-600">{submitNote}</p>
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setConfirmPartial(false)}>Cancel</Button>
                <Button onClick={() => { setConfirmPartial(false); void submitExamNow(); }}>Submit anyway</Button>
              </div>
            </div>
          </div>
        )}

{results && (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Exam submitted successfully.
            </div>
            <ExamResults results={results} questions={questions} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
