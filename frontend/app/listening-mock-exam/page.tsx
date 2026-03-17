"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ExamContainer from "@/components/ExamContainer";
import ListeningQuestionCard from "@/components/ListeningQuestionCard";
import ListeningResults from "@/components/ListeningResults";
import QuestionNavigator from "@/components/QuestionNavigator";
import TimerClock from "@/components/TimerClock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateListeningQuestion } from "@/services/api";
import type { AnswerOption } from "@/types/exam";
import type { ListeningQuestion, ListeningSubmitResult } from "@/types/listening";

const TOTAL_QUESTIONS = 40;
const EXAM_DURATION_SECONDS = 60 * 60;
const PREFETCH_AHEAD = 2;
const MAX_PLAYS = 2;

export default function ListeningMockExamPage() {
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questions, setQuestions] = useState<Record<number, ListeningQuestion>>({});
  const [answers, setAnswers] = useState<Record<number, AnswerOption | "">>({});
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({});
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState("");
  const [submitNote, setSubmitNote] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ListeningSubmitResult | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  const questionsRef = useRef<Record<number, ListeningQuestion>>({});
  const inFlightRef = useRef<Partial<Record<number, Promise<ListeningQuestion>>>>({});
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
      if (showLoader) setLoadingQuestion(true);
      const shouldResumeTimer = showLoader && timerActive;
      if (shouldResumeTimer) setTimerActive(false);
      try {
        return await inFlight;
      } finally {
        if (showLoader) setLoadingQuestion(false);
        if (shouldResumeTimer && !timeUp && !results) setTimerActive(true);
      }
    }

    if (showLoader) setLoadingQuestion(true);
    const shouldResumeTimer = showLoader && timerActive;
    if (shouldResumeTimer) setTimerActive(false);
    try {
      const request = generateListeningQuestion({
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
      if (shouldResumeTimer && !timeUp && !results) setTimerActive(true);
    }
  };

  const prefetchQuestions = (fromQuestion: number) => {
    if (!isExamStarted || timeUp || results) return;
    for (let offset = 1; offset <= PREFETCH_AHEAD; offset += 1) {
      const questionNumber = fromQuestion + offset;
      if (questionNumber > TOTAL_QUESTIONS) break;
      if (questionsRef.current[questionNumber]) continue;
      if (inFlightRef.current[questionNumber]) continue;
      void ensureQuestion(questionNumber, false).catch(() => undefined);
    }
  };

  const handleStartExam = async () => {
    if (isExamStarted) return;
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

  const handleTimerExpire = () => {
    if (timeUp || results) return;
    setTimeUp(true);
    void handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    if (isSubmitting || results) return;
    if (!startedAt) {
      setError("Exam has not started.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSubmitNote("");
    setTimerActive(false);

    try {
      const questionList = Object.entries(questionsRef.current)
        .map(([num, question]) => ({ number: Number(num), question }))
        .sort((a, b) => a.number - b.number);

      if (questionList.length < TOTAL_QUESTIONS) {
        setSubmitNote(
          `Partial submission: ${questionList.length} of ${TOTAL_QUESTIONS} questions generated. ` +
            "Score is based only on generated questions."
        );
      }

      let correct = 0;
      const detailed = questionList.map(({ number, question }) => {
        const userAnswer = answers[number] ?? "";
        const isCorrect = userAnswer === question.correct_answer;
        if (isCorrect) correct += 1;
        return {
          question_number: number,
          question: question.question,
          correct_answer: question.correct_answer,
          user_answer: userAnswer,
          is_correct: isCorrect,
          explanation: question.explanation
        };
      });

      const total = questionList.length;
      const accuracy = total ? (correct / total) * 100 : 0;

      const payload: ListeningSubmitResult = {
        score: correct,
        total,
        accuracy,
        results: detailed
      };
      setResults(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlay = (questionNumber: number) => {
    setPlayCounts((prev) => {
      const current = prev[questionNumber] ?? 0;
      if (current >= MAX_PLAYS) return prev;
      return { ...prev, [questionNumber]: current + 1 };
    });
  };

  const currentQuestionData = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion] ?? "";
  const currentPlays = playCounts[currentQuestion] ?? 0;

  const questionNavigatorAnswers = useMemo(() => answers, [answers]);

  return (
    <div className="min-h-screen">
      <Header subtitle="Complete the full 40-question listening mock exam" />
      <main className="container space-y-6 py-8">
        {!isExamStarted ? (
          <Card className="border-slate-200 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Listening Mock Exam</h2>
              <p className="mt-2 text-sm text-slate-600">
                This mock exam includes 40 questions and a 60-minute timer. Questions are generated as you move
                through the exam. Each audio can be played up to two times.
              </p>
              <Button className="mt-4" onClick={handleStartExam}>
                Start Listening Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <ExamContainer
              currentQuestion={currentQuestion}
              totalQuestions={TOTAL_QUESTIONS}
              title="TEF Listening Mock Exam"
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
                <ListeningQuestionCard
                  question={currentQuestionData}
                  questionNumber={currentQuestion}
                  selectedAnswer={currentAnswer}
                  playCount={currentPlays}
                  onPlay={() => handlePlay(currentQuestion)}
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
              answers={questionNavigatorAnswers}
              onSelect={handleSelectQuestion}
            />
          </div>
        )}

        {results && (
          <ListeningResults
            score={results.score}
            total={results.total}
            accuracy={results.accuracy}
            results={results.results}
          />
        )}
      </main>
    </div>
  );
}
