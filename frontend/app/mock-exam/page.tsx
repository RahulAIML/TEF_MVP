"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import ExamContainer from "@/components/ExamContainer";
import ExamResults from "@/components/ExamResults";
import QuestionCard from "@/components/QuestionCard";
import QuestionNavigator from "@/components/QuestionNavigator";
import TimerClock from "@/components/TimerClock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateQuestionStream, submitExam } from "@/services/api";
import type { AnswerOption, ExamQuestion, SubmitExamResponse } from "@/types/exam";

const TOTAL_QUESTIONS = 40;
const EXAM_DURATION_SECONDS = 60 * 60;
const PREFETCH_AHEAD = 2;

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
  const [streamingPreview, setStreamingPreview] = useState("");

  const questionsRef = useRef<Record<number, ExamQuestion>>({});
  const inFlightRef = useRef<Partial<Record<number, Promise<ExamQuestion>>>>({});

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
        setStreamingPreview("");
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
        setStreamingPreview("");
        }
        if (shouldResumeTimer && !timeUp && !results) {
          setTimerActive(true);
        }
      }
    }

    if (showLoader) {
      setLoadingQuestion(true);
      setStreamingPreview("");
    }
    const shouldResumeTimer = showLoader && timerActive;
    if (shouldResumeTimer) {
      setTimerActive(false);
    }
    try {
      const request = generateQuestionStream(
        { question_number: questionNumber },
        showLoader
          ? (text) => {
              setStreamingPreview((prev) => {
                const next = prev + text;
                return next.length > 800 ? next.slice(-800) : next;
              });
            }
          : undefined
      ).then((question) => {
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
        setStreamingPreview("");
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

  const handleTimerExpire = () => {
    if (timeUp || results) {
      return;
    }
    setTimeUp(true);
    void handleSubmitExam();
  };

  const handleSubmitExam = async () => {
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

      if (questionList.length < TOTAL_QUESTIONS) {
        setSubmitNote(
          `Partial submission: ${questionList.length} of ${TOTAL_QUESTIONS} questions generated. ` +
            "Score is based only on generated questions."
        );
      }

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

  const currentQuestionData = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion] ?? "";

  return (
    <div className="min-h-screen">
      <Header subtitle="Complete the full 40-question reading mock exam" />
      <main className="container space-y-6 py-8">
        {!isExamStarted ? (
          <Card className="border-slate-200 shadow-soft">
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
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Generating question...</p>
                  {streamingPreview && (
                    <p className="max-h-24 overflow-hidden whitespace-pre-wrap text-xs text-slate-400">
                      {streamingPreview}
                    </p>
                  )}
                </div>
              )}
              {currentQuestionData && (
                <QuestionCard
                  question={currentQuestionData}
                  selectedAnswer={currentAnswer}
                  onSelect={handleAnswerSelect}
                  disabled={Boolean(results) || timeUp}
                />
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

            <QuestionNavigator
              totalQuestions={TOTAL_QUESTIONS}
              currentQuestion={currentQuestion}
              answers={answers}
              onSelect={handleSelectQuestion}
            />
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
      </main>
    </div>
  );
}
