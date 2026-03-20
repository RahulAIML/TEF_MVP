"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import TextExplanationCard from "@/components/TextExplanationCard";
import ReadingPanel from "@/components/ReadingPanel";
import TextHelperTool from "@/components/TextHelperTool";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { explainText, generatePassageQuiz } from "@/services/api";
import type { ExplainTextResponse } from "@/types/text-helper";
import type { PassageQuizQuestion, PassageQuizResponse } from "@/types/passage";
import type { AnswerOption } from "@/types/exam";

export default function PassageAnalyzerPage() {
  const [quiz, setQuiz] = useState<PassageQuizResponse | null>(null);
  const [lookupText, setLookupText] = useState("");
  const [explanationDetails, setExplanationDetails] = useState<ExplainTextResponse | null>(null);
  const [loadingPassage, setLoadingPassage] = useState(false);
  const [loadingHelper, setLoadingHelper] = useState(false);
  const [error, setError] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, AnswerOption | "">>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizResults, setQuizResults] = useState<
    Array<PassageQuizQuestion & { question_number: number; user_answer: AnswerOption | "" }>
  >([]);

  const unansweredCount = useMemo(() => {
    if (!quiz) {
      return 0;
    }
    return quiz.questions.filter((_, index) => !quizAnswers[index + 1]).length;
  }, [quiz, quizAnswers]);


  const handleGeneratePassage = async () => {
    setLoadingPassage(true);
    setError("");
    try {
      const result = await generatePassageQuiz();
      setQuiz(result);
      setLookupText("");
      setExplanationDetails(null);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(0);
      setQuizResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate passage.");
    } finally {
      setLoadingPassage(false);
    }
  };

  const handleExplainText = async () => {
    if (!lookupText.trim()) {
      return;
    }
    setLoadingHelper(true);
    setError("");
    try {
      const result = await explainText({ text: lookupText.trim() });
      setExplanationDetails(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to explain text.");
    } finally {
      setLoadingHelper(false);
    }
  };

  const handleAnswerSelect = (questionNumber: number, value: AnswerOption) => {
    if (quizSubmitted) {
      return;
    }
    setQuizAnswers((prev) => ({ ...prev, [questionNumber]: value }));
  };

  const handleSubmitQuiz = () => {
    if (!quiz) {
      return;
    }
    const results = quiz.questions
      .map((question, index) => ({
        ...question,
        question_number: index + 1,
        user_answer: quizAnswers[index + 1] ?? ""
      }))
      .filter((item) => item.user_answer);

    const score = results.reduce(
      (total, item) => total + (item.user_answer === item.correct_answer ? 1 : 0),
      0
    );

    setQuizSubmitted(true);
    setQuizScore(score);
    setQuizResults(results);
  };

  return (
    <AppShell title="Passage Analyzer" subtitle="Analyze passages and explain selected text">
      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Passage Analyzer</h2>
              <p className="text-sm text-slate-600">
                Generate a new passage with comprehension questions, then select text for the helper tool.
              </p>
            </div>
            <Button onClick={handleGeneratePassage} disabled={loadingPassage}>
              {loadingPassage ? "Generating..." : "Generate Passage + Questions"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {quiz && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ReadingPanel
              title={quiz.title}
              passage={quiz.passage}
              onTextHighlight={(text) => setLookupText(text)}
            />
            <aside className="space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <TextHelperTool
                    text={lookupText}
                    onTextChange={setLookupText}
                    onExplain={handleExplainText}
                    isLoading={loadingHelper}
                  />
                </CardContent>
              </Card>
              {explanationDetails && <TextExplanationCard entry={explanationDetails} />}
            </aside>
          </div>
        )}

        {quiz && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Comprehension Questions</h3>
                  <p className="text-sm text-slate-600">
                    {quiz.questions.length} questions generated. Unanswered: {unansweredCount}
                  </p>
                </div>
                <Button onClick={handleSubmitQuiz} disabled={quizSubmitted}>
                  {quizSubmitted ? "Submitted" : "Submit Answers"}
                </Button>
              </div>

              <div className="space-y-6">
                {quiz.questions.map((question, index) => {
                  const questionNumber = index + 1;
                  const selected = quizAnswers[questionNumber] ?? "";
                  return (
                    <div
                      key={`passage-question-${questionNumber}`}
                      className="rounded-md border border-slate-200 bg-white p-4"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        Question {questionNumber}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{question.question}</p>
                      <div className="mt-3 space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const value = (["A", "B", "C", "D"][optionIndex] as AnswerOption) ?? "A";
                          const isSelected = selected === value;
                          return (
                            <label
                              key={`passage-option-${questionNumber}-${optionIndex}`}
                              className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-2 text-sm transition ${
                                isSelected
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              } ${quizSubmitted ? "cursor-not-allowed opacity-80" : ""}`}
                            >
                              <input
                                type="radio"
                                name={`passage-question-${questionNumber}`}
                                className="mt-1"
                                value={value}
                                checked={isSelected}
                                disabled={quizSubmitted}
                                onChange={() => handleAnswerSelect(questionNumber, value)}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {quizSubmitted && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Answers submitted successfully.
              </div>
              <div className="text-sm text-slate-700">
                Score: <span className="font-semibold text-slate-900">{quizScore}</span> /{" "}
                {quizResults.length || quiz?.questions.length}
              </div>
              <div className="space-y-4">
                {quizResults.length === 0 && (
                  <p className="text-sm text-slate-600">No attempted questions to review.</p>
                )}
                {quizResults.map((result) => (
                  <div
                    key={`quiz-result-${result.question_number}`}
                    className="rounded-md border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Question {result.question_number}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{result.question}</p>
                    <div className="mt-2 text-sm text-slate-600">
                      Correct Answer:{" "}
                      <span className="font-semibold text-slate-900">{result.correct_answer}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      Your Answer:{" "}
                      <span className="font-semibold text-slate-900">{result.user_answer}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{result.explanation}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
