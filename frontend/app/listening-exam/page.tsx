"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import ExamContainer from "@/components/ExamContainer";
import ListeningQuestionCard from "@/components/ListeningQuestionCard";
import ListeningResults from "@/components/ListeningResults";
import QuestionNavigator from "@/components/QuestionNavigator";
import TextHelperTool from "@/components/TextHelperTool";
import TextExplanationCard from "@/components/TextExplanationCard";
import TimerClock from "@/components/TimerClock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateListeningQuestion, generateListeningAudio, submitListeningExam } from "@/services/api";
import type { AnswerOption } from "@/types/exam";
import type { ExplainTextResponse } from "@/types/text-helper";
import type { ListeningQuestion, ListeningSubmitResult } from "@/types/listening";
import { explainText } from "@/services/api";

const TOTAL_QUESTIONS = 40;
const EXAM_DURATION_SECONDS = 60 * 60;
const PREFETCH_AHEAD = 1;

export default function ListeningExamPage() {
  const [mode, setMode] = useState<"practice" | "exam">("exam");
  const [showTranscript, setShowTranscript] = useState(false);

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
  const [confirmPartial, setConfirmPartial] = useState(false);

  const [practiceQuestion, setPracticeQuestion] = useState<ListeningQuestion | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<AnswerOption | "">("");
  const [practiceCount, setPracticeCount] = useState(1);
  const [practicePlayCount, setPracticePlayCount] = useState(0);

  const [helperText, setHelperText] = useState("");
  const [helperResult, setHelperResult] = useState<ExplainTextResponse | null>(null);
  const [helperLoading, setHelperLoading] = useState(false);

  const questionsRef = useRef<Record<number, ListeningQuestion>>({});
  const inFlightRef = useRef<Partial<Record<number, Promise<ListeningQuestion>>>>({});
  const audioInFlightRef = useRef<Partial<Record<number, Promise<string | undefined>>>>({});
  const examSessionIdRef = useRef<string | null>(null);
  const practiceSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    if (mode === "practice") {
      setShowTranscript(true);
    } else {
      setShowTranscript(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "practice") {
      setIsExamStarted(false);
      setResults(null);
      setTimeUp(false);
      setTimerActive(false);
      setSubmitNote("");
      setError("");
    } else {
      setPracticeQuestion(null);
      setPracticeAnswer("");
    }
  }, [mode]);

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
        session_id: examSessionIdRef.current ?? undefined,
        defer_audio: true
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

  const ensureListeningAudio = async (questionNumber: number, sessionId?: string | null): Promise<string | undefined> => {
    const existing = questionsRef.current[questionNumber];
    if (!existing || existing.audio_url) {
      return existing?.audio_url ?? undefined;
    }
    const inFlight = audioInFlightRef.current[questionNumber];
    if (inFlight) {
      return inFlight;
    }
    const request = generateListeningAudio({
      script: existing.script,
      question_number: questionNumber,
      session_id: sessionId ?? undefined
    })
      .then((response) => {
        const updatedQuestion: ListeningQuestion = { ...existing, audio_url: response.audio_url };
        const updated = { ...questionsRef.current, [questionNumber]: updatedQuestion };
        questionsRef.current = updated;
        setQuestions(updated);
        return response.audio_url;
      })
      .finally(() => {
        delete audioInFlightRef.current[questionNumber];
      });
    audioInFlightRef.current[questionNumber] = request;
    return request;
  };
  const prefetchQuestions = (fromQuestion: number) => {
    if (!isExamStarted || timeUp || results) return;
    for (let offset = 1; offset <= PREFETCH_AHEAD; offset += 1) {
      const questionNumber = fromQuestion + offset;
      if (questionNumber > TOTAL_QUESTIONS) break;
      if (questionsRef.current[questionNumber]) continue;
      if (inFlightRef.current[questionNumber]) continue;
      void ensureQuestion(questionNumber, false)
        .then(() => ensureListeningAudio(questionNumber, examSessionIdRef.current).catch(() => undefined))
        .catch(() => undefined);
    }
  };

  const requestExamAudio = async (question: ListeningQuestion, questionNumber: number) => {
    if (question.audio_url) return question.audio_url;
    return ensureListeningAudio(questionNumber, examSessionIdRef.current);
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
      void ensureListeningAudio(1, examSessionIdRef.current).catch(() => undefined);
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
        void ensureListeningAudio(questionNumber, examSessionIdRef.current).catch(() => undefined);
        prefetchQuestions(questionNumber);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load question.");
      }
      return;
    }
    prefetchQuestions(questionNumber);
    void ensureListeningAudio(questionNumber, examSessionIdRef.current).catch(() => undefined);
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

  const submitExamNow = async () => {
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
      const completedAt = new Date().toISOString();
      void submitListeningExam({
        started_at: startedAt,
        completed_at: completedAt,
        score: correct,
        total,
        accuracy
      }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitExam = async () => {
    if (isSubmitting || results) return;
    if (!startedAt) {
      setError("Exam has not started.");
      return;
    }

    const questionList = Object.entries(questionsRef.current)
      .map(([num, question]) => ({ number: Number(num), question }))
      .sort((a, b) => a.number - b.number);

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

  const handlePlay = (questionNumber: number) => {
    setPlayCounts((prev) => {
      const current = prev[questionNumber] ?? 0;
      if (current >= 2) return prev;
      return { ...prev, [questionNumber]: current + 1 };
    });
  };

  const requestPracticeAudio = async (question: ListeningQuestion, questionNumber: number) => {
    if (question.audio_url) return question.audio_url;
    const response = await generateListeningAudio({
      script: question.script,
      question_number: questionNumber,
      session_id: practiceSessionIdRef.current ?? undefined
    });
    const updatedQuestion: ListeningQuestion = { ...question, audio_url: response.audio_url };
    setPracticeQuestion(updatedQuestion);
    return response.audio_url;
  };
  const loadPracticeQuestion = async () => {
    const sessionId = practiceSessionIdRef.current
      ?? (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    practiceSessionIdRef.current = sessionId;

    setError("");
    setLoadingQuestion(true);
    try {
      const question = await generateListeningQuestion({
        question_number: practiceCount,
        session_id: sessionId ?? undefined,
        defer_audio: true
      });
      setPracticeQuestion(question);
      setPracticeAnswer("");
      setPracticePlayCount(0);
      setPracticeCount((prev) => prev + 1);
      void requestPracticeAudio(question, practiceCount).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load practice question.");
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handlePracticePlay = () => {
    setPracticePlayCount((prev) => (prev >= 2 ? prev : prev + 1));
  };

  const handlePracticeAnswer = (value: AnswerOption) => {
    setPracticeAnswer(value);
  };

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

  const handleTranscriptSelection = (text: string) => {
    setHelperText(text);
  };

  const currentQuestionData = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion] ?? "";
  const currentPlays = playCounts[currentQuestion] ?? 0;

  const questionNavigatorAnswers = useMemo(() => answers, [answers]);

  return (
    <AppShell title="Listening Module" subtitle="Practice or take a full mock listening exam">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button
            variant={mode === "practice" ? "default" : "outline"}
            onClick={() => setMode("practice")}
          >
            Practice Mode
          </Button>
          <Button
            variant={mode === "exam" ? "default" : "outline"}
            onClick={() => setMode("exam")}
          >
            Mock Exam Mode
          </Button>
        </div>

        {mode === "practice" && (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              {!practiceQuestion ? (
                <Card className="border-slate-200 shadow-sm rounded-2xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900">Listening Practice</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Practice one question at a time. Transcript is enabled by default and explanations
                      appear as soon as you answer.
                    </p>
                    <Button className="mt-4" onClick={loadPracticeQuestion} disabled={loadingQuestion}>
                      {loadingQuestion ? "Preparing audio..." : "Start Practice"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {loadingQuestion && (
                    <p className="text-sm text-slate-500">Preparing practice audio...</p>
                  )}
                  <ListeningQuestionCard
                    question={practiceQuestion}
                    questionNumber={practiceCount - 1}
                    selectedAnswer={practiceAnswer}
                    onSelect={handlePracticeAnswer}
                    maxPlays={2}
                    playCount={practicePlayCount}
                    onPlay={handlePracticePlay}
                    onRequestAudio={(question) => requestPracticeAudio(question, practiceCount - 1)}
                    showTranscript={showTranscript}
                    onToggleTranscript={() => setShowTranscript((prev) => !prev)}
                    onTranscriptSelect={handleTranscriptSelection}
                  />
                  {practiceAnswer && (
                    <Card className="border-slate-200 shadow-sm rounded-2xl">
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-900">Explanation</p>
                        <p className="mt-2 text-sm text-slate-700">{practiceQuestion.explanation}</p>
                        <div className="mt-3 text-sm text-slate-600">
                          Correct Answer: <span className="font-semibold text-slate-900">{practiceQuestion.correct_answer}</span>
                        </div>
                        <Button className="mt-4" onClick={loadPracticeQuestion}>
                          Next Practice Question
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-900">Practice Mode</p>
                  <p className="mt-2 text-sm text-slate-600">One question at a time with transcript enabled.</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm rounded-2xl">
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

        {mode === "exam" && (
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
              {!isExamStarted ? (
                <Card className="border-slate-200 shadow-sm rounded-2xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900">Listening Mock Exam</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      40 questions ? 60 minutes ? Transcript is off by default.
                    </p>
                    <Button className="mt-4" onClick={handleStartExam}>
                      Start Exam
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {timeUp && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      Time is up. Your exam has been submitted.
                    </div>
                  )}
                  {submitNote && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {submitNote}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
                      onSelect={handleAnswerSelect}
                      disabled={Boolean(results) || timeUp}
                      maxPlays={2}
                      playCount={currentPlays}
                      onPlay={() => handlePlay(currentQuestion)}
                      onRequestAudio={(question) => requestExamAudio(question, currentQuestion)}
                      showTranscript={showTranscript}
                      onToggleTranscript={() => setShowTranscript((prev) => !prev)}
                      onTranscriptSelect={handleTranscriptSelection}
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
                </div>
              )}
            </ExamContainer>

            <div className="space-y-4">
              <QuestionNavigator
                totalQuestions={TOTAL_QUESTIONS}
                currentQuestion={currentQuestion}
                answers={questionNavigatorAnswers}
                onSelect={handleSelectQuestion}
              />
              <Card className="border-slate-200 shadow-sm rounded-2xl">
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
          <ListeningResults
            score={results.score}
            total={results.total}
            accuracy={results.accuracy}
            results={results.results}
          />
        )}
      </div>
    </AppShell>
  );
}





























