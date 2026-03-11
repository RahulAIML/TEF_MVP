"use client";

import { useMemo, useState } from "react";

import DictionaryCard from "@/components/DictionaryCard";
import Header from "@/components/Header";
import MCQList from "@/components/MCQList";
import ModeSelector from "@/components/ModeSelector";
import PracticePartSelector from "@/components/PracticePartSelector";
import ReadingExamContainer from "@/components/ReadingExamContainer";
import ReadingPanel from "@/components/ReadingPanel";
import ScoreCard from "@/components/ScoreCard";
import TextHelperTool from "@/components/TextHelperTool";
import TimerClock from "@/components/TimerClock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { explainWord, generateReadingExercise, submitReadingAnswers } from "@/services/api";
import type { WordMeaningResponse } from "@/types/dictionary";
import type { AnswerOption, GenerateReadingRequest, ReadingExercise, ReadingMode, ReadingPart } from "@/types/reading";
import type { SubmissionResponse } from "@/types/submission";

const EXAM_DURATION_SECONDS = 60 * 60;
const PRACTICE_DURATION_SECONDS = 15 * 60;
const TOTAL_PARTS = 3;

export default function HomePage() {
  const [mode, setMode] = useState<ReadingMode>("exam");
  const [practicePart, setPracticePart] = useState<ReadingPart>(1);
  const [currentPart, setCurrentPart] = useState<ReadingPart>(1);
  const [exercise, setExercise] = useState<ReadingExercise | null>(null);
  const [answers, setAnswers] = useState<Array<AnswerOption | "">>([]);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [lookupText, setLookupText] = useState("");
  const [wordDetails, setWordDetails] = useState<WordMeaningResponse | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [dictionaryError, setDictionaryError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExplainingWord, setIsExplainingWord] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const unansweredCount = useMemo(
    () => answers.filter((item) => item === "").length,
    [answers]
  );

  const resetSessionState = () => {
    setExercise(null);
    setAnswers([]);
    setSubmission(null);
    setGenerateError("");
    setSubmissionError("");
    setDictionaryError("");
    setTimeUp(false);
    setTimerRunning(false);
    setTimerKey((value) => value + 1);
  };

  const handleModeChange = (nextMode: ReadingMode) => {
    setMode(nextMode);
    setCurrentPart(1);
    resetSessionState();
  };

  const startTimer = (durationSeconds: number, reset: boolean) => {
    if (reset) {
      setTimerKey((value) => value + 1);
    }
    setTimerRunning(true);
    setTimeUp(false);
  };

  const handleGenerateExercise = async (payload: GenerateReadingRequest, resetTimer: boolean) => {
    setIsGenerating(true);
    setGenerateError("");
    setSubmissionError("");
    setDictionaryError("");
    setSubmission(null);
    setWordDetails(null);
    setTimeUp(false);
    try {
      const data = await generateReadingExercise(payload);
      setExercise(data);
      setAnswers(Array.from({ length: data.questions.length }, () => ""));
      if (payload.mode === "exam") {
        startTimer(EXAM_DURATION_SECONDS, resetTimer);
      } else {
        startTimer(PRACTICE_DURATION_SECONDS, resetTimer);
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Failed to generate reading exercise."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartSession = async () => {
    if (mode === "exam") {
      const payload: GenerateReadingRequest = { mode: "exam", part: currentPart };
      await handleGenerateExercise(payload, !timerRunning);
      return;
    }

    const payload: GenerateReadingRequest = { mode: "practice", part: practicePart };
    await handleGenerateExercise(payload, true);
  };

  const handleAnswerChange = (index: number, value: AnswerOption) => {
    if (timeUp) {
      return;
    }
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handleSubmitAnswers = async () => {
    if (!exercise || timeUp) {
      return;
    }
    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const result = await submitReadingAnswers({ answers });
      setSubmission(result);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Failed to submit answers."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExplainText = async () => {
    if (!lookupText.trim()) {
      return;
    }
    setIsExplainingWord(true);
    setDictionaryError("");
    try {
      const result = await explainWord({ word: lookupText.trim() });
      setWordDetails(result);
    } catch (error) {
      setDictionaryError(
        error instanceof Error ? error.message : "Failed to fetch text explanation."
      );
    } finally {
      setIsExplainingWord(false);
    }
  };

  const handleTimerExpire = () => {
    setTimeUp(true);
    setTimerRunning(false);
  };

  const handleNextExamPart = async () => {
    if (currentPart >= TOTAL_PARTS) {
      return;
    }
    const nextPart = (currentPart + 1) as ReadingPart;
    setCurrentPart(nextPart);
    await handleGenerateExercise({ mode: "exam", part: nextPart }, false);
  };

  const actionLabel =
    mode === "exam"
      ? currentPart === 1 && !timerRunning
        ? "Start Full Exam"
        : `Generate Part ${currentPart}`
      : "Generate Practice Exercise";

  const timerDuration = mode === "exam" ? EXAM_DURATION_SECONDS : PRACTICE_DURATION_SECONDS;

  return (
    <div className="min-h-screen">
      <Header isGenerating={isGenerating} onGenerate={handleStartSession} actionLabel={actionLabel} />
      <main className="container space-y-6 py-6">
        <ModeSelector mode={mode} onChange={handleModeChange} />

        {mode === "practice" && (
          <PracticePartSelector part={practicePart} onChange={setPracticePart} />
        )}

        {!exercise ? (
          <Card className="border-dashed border-slate-300 bg-white/70">
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">
                Ready to practice reading comprehension?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Choose a mode, then generate a TEF B2 passage and MCQs to start your session.
              </p>
            </CardContent>
          </Card>
        ) : mode === "exam" ? (
          <ReadingExamContainer
            part={currentPart}
            totalParts={TOTAL_PARTS}
            timer={
              <TimerClock
                durationSeconds={timerDuration}
                isActive={timerRunning}
                resetKey={timerKey}
                onExpire={handleTimerExpire}
              />
            }
          >
            <div className="reading-serif">
              <ReadingPanel
                title={exercise.title}
                passage={exercise.passage}
                onTextHighlight={(text) => setLookupText(text)}
              />
            </div>
            <MCQList
              questions={exercise.questions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleSubmitAnswers}
              isSubmitting={isSubmitting}
              isDisabled={timeUp}
              timeUpMessage="Time is up."
            />
            <p className="text-sm text-muted-foreground">
              Unanswered questions: {unansweredCount}
            </p>
            {submission && <ScoreCard scoreData={submission} />}
            {submission && currentPart < TOTAL_PARTS && (
              <Button variant="secondary" onClick={handleNextExamPart}>
                Start Part {currentPart + 1}
              </Button>
            )}
          </ReadingExamContainer>
        ) : (
          <Card className="border-slate-200 shadow-soft">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Practice Reading Section</p>
                  <h2 className="text-xl font-semibold text-slate-900">Part {practicePart}</h2>
                </div>
                <TimerClock
                  durationSeconds={timerDuration}
                  isActive={timerRunning}
                  resetKey={timerKey}
                  onExpire={handleTimerExpire}
                />
              </div>
              <div className="reading-serif">
                <ReadingPanel
                  title={exercise.title}
                  passage={exercise.passage}
                  onTextHighlight={(text) => setLookupText(text)}
                />
              </div>
              <MCQList
                questions={exercise.questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onSubmit={handleSubmitAnswers}
                isSubmitting={isSubmitting}
                isDisabled={timeUp}
                timeUpMessage="Time is up."
              />
              <p className="text-sm text-muted-foreground">
                Unanswered questions: {unansweredCount}
              </p>
              {submission && <ScoreCard scoreData={submission} />}
            </CardContent>
          </Card>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {generateError && <p className="text-sm text-rose-700">{generateError}</p>}
            {submissionError && <p className="text-sm text-rose-700">{submissionError}</p>}
          </div>
          <aside className="space-y-4">
            <Card className="border-slate-200 shadow-soft">
              <CardContent className="p-5">
                <TextHelperTool
                  text={lookupText}
                  onTextChange={setLookupText}
                  onExplain={handleExplainText}
                  isLoading={isExplainingWord}
                />
              </CardContent>
            </Card>
            {dictionaryError && <p className="text-sm text-rose-700">{dictionaryError}</p>}
            {wordDetails && <DictionaryCard entry={wordDetails} />}
          </aside>
        </section>
      </main>
    </div>
  );
}
