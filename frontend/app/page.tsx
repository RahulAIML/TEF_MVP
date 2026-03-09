"use client";

import { useMemo, useState } from "react";

import DictionaryCard from "@/components/DictionaryCard";
import Header from "@/components/Header";
import MCQList from "@/components/MCQList";
import ReadingPanel from "@/components/ReadingPanel";
import ScoreCard from "@/components/ScoreCard";
import WordLookup from "@/components/WordLookup";
import { Card, CardContent } from "@/components/ui/card";
import { explainWord, generateReadingExercise, submitReadingAnswers } from "@/services/api";
import type { WordMeaningResponse } from "@/types/dictionary";
import type { AnswerOption, ReadingExercise } from "@/types/reading";
import type { SubmissionResponse } from "@/types/submission";

export default function HomePage() {
  const [exercise, setExercise] = useState<ReadingExercise | null>(null);
  const [answers, setAnswers] = useState<Array<AnswerOption | "">>([]);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [lookupWord, setLookupWord] = useState("");
  const [wordDetails, setWordDetails] = useState<WordMeaningResponse | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [dictionaryError, setDictionaryError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExplainingWord, setIsExplainingWord] = useState(false);

  const unansweredCount = useMemo(
    () => answers.filter((item) => item === "").length,
    [answers]
  );

  const handleGenerateExercise = async () => {
    setIsGenerating(true);
    setGenerateError("");
    setSubmissionError("");
    setDictionaryError("");
    try {
      const data = await generateReadingExercise();
      setExercise(data);
      setAnswers(Array.from({ length: data.questions.length }, () => ""));
      setSubmission(null);
      setWordDetails(null);
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Failed to generate reading exercise."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (index: number, value: AnswerOption) => {
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handleSubmitAnswers = async () => {
    if (!exercise) {
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

  const handleExplainWord = async () => {
    if (!lookupWord.trim()) {
      return;
    }
    setIsExplainingWord(true);
    setDictionaryError("");
    try {
      const result = await explainWord({ word: lookupWord.trim() });
      setWordDetails(result);
    } catch (error) {
      setDictionaryError(
        error instanceof Error ? error.message : "Failed to fetch word meaning."
      );
    } finally {
      setIsExplainingWord(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header isGenerating={isGenerating} onGenerate={handleGenerateExercise} />
      <main className="container py-6">
        {!exercise ? (
          <Card className="border-dashed border-slate-300 bg-white/70">
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">
                Ready to practice reading comprehension?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Generate a fresh TEF B2 French passage with 8 MCQs, then check your score and
                explanations instantly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
            <section className="space-y-6">
              <div className="reading-serif">
                <ReadingPanel
                  title={exercise.title}
                  passage={exercise.passage}
                  onWordHighlight={(word) => setLookupWord(word)}
                />
              </div>
              <MCQList
                questions={exercise.questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onSubmit={handleSubmitAnswers}
                isSubmitting={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Unanswered questions: {unansweredCount}
              </p>
              {submission && <ScoreCard scoreData={submission} />}
            </section>

            <aside className="space-y-4">
              <Card className="border-slate-200 shadow-soft">
                <CardContent className="p-5">
                  <WordLookup
                    word={lookupWord}
                    onWordChange={setLookupWord}
                    onExplain={handleExplainWord}
                    isLoading={isExplainingWord}
                  />
                </CardContent>
              </Card>
              {wordDetails && <DictionaryCard entry={wordDetails} />}
            </aside>
          </div>
        )}

        <div className="mt-6 space-y-2 text-sm text-rose-700">
          {generateError && <p>{generateError}</p>}
          {submissionError && <p>{submissionError}</p>}
          {dictionaryError && <p>{dictionaryError}</p>}
        </div>
      </main>
    </div>
  );
}
