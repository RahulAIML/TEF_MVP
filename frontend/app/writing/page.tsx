"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AppShell from "@/components/AppShell";
import WritingStepper, { WritingStep } from "@/components/WritingStepper";
import WritingEvaluationCard from "@/components/WritingEvaluationCard";
import TimerClock from "@/components/TimerClock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  evaluateWritingStep,
  evaluateWritingTask,
  generateWritingTasks,
  saveWritingProgress,
  submitWriting
} from "@/services/api";
import type {
  WritingEvaluationResponse,
  WritingMode,
  WritingStepFeedbackResponse,
  WritingSubmitResponse,
  WritingTaskType
} from "@/types/writing";

const EXAM_DURATION_SECONDS = 60 * 60;

const TASK1_STEPS: WritingStep[] = [
  {
    key: "situation",
    title: "Identify the situation",
    description: "What is the problem? Where and when did it happen?",
    placeholder: "Expliquez la situation en une ou deux phrases."
  },
  {
    key: "details",
    title: "Describe the issue",
    description: "Add clear details to help the reader understand the issue.",
    placeholder: "Ajoutez des details concrets pour clarifier."
  },
  {
    key: "request",
    title: "State your request",
    description: "What do you want the reader to do?",
    placeholder: "Indiquez clairement votre demande."
  },
  {
    key: "tone",
    title: "Tone guidance",
    description: "Use polite expressions to keep a formal or semi-formal tone.",
    helperPhrases: [
      "Je vous écris pour...",
      "Je souhaiterais...",
      "Pourriez-vous...",
      "Je vous serais reconnaissant(e) de..."
    ],
    placeholder: "Insérez une phrase polie ici."
  },
  {
    key: "closing",
    title: "Closing",
    description: "Finish with a polite ending.",
    helperPhrases: [
      "Je vous prie d’agréer, Madame, Monsieur, mes salutations distinguées.",
      "Cordialement,",
      "Merci d’avance pour votre aide."
    ],
    placeholder: "Ajoutez votre formule de politesse finale."
  }
];

const TASK2_STEPS: WritingStep[] = [
  {
    key: "opinion",
    title: "Choose your opinion",
    description: "Do you agree or disagree with the statement?",
    placeholder: "Indiquez clairement votre position."
  },
  {
    key: "introduction",
    title: "Introduction",
    description: "Restate the topic and give your opinion.",
    placeholder: "Rappeler le sujet et donner votre opinion."
  },
  {
    key: "argument1",
    title: "Argument 1",
    description: "Provide an idea, explanation, and example.",
    placeholder: "Argument 1 : idee + explication + exemple."
  },
  {
    key: "argument2",
    title: "Argument 2",
    description: "Provide another idea with explanation and example.",
    placeholder: "Argument 2 : idee + explication + exemple."
  },
  {
    key: "connectors",
    title: "Connectors",
    description: "Use linking words to structure your ideas.",
    helperPhrases: [
      "Tout d’abord,",
      "Ensuite,",
      "Cependant,",
      "Donc,"
    ],
    placeholder: "Ajoutez des connecteurs pour lier vos phrases."
  },
  {
    key: "conclusion",
    title: "Conclusion",
    description: "Summarize your opinion and close the text.",
    placeholder: "Resumer votre opinion et conclure."
  }
];

const buildSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const wordCount = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
};

const buildCombinedText = (steps: WritingStep[], values: Record<string, string>) =>
  steps
    .map((step) => values[step.key]?.trim())
    .filter(Boolean)
    .join("\n\n");

export default function WritingPage() {
  const [mode, setMode] = useState<WritingMode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState("");
  const [task1Prompt, setTask1Prompt] = useState("");
  const [task2Prompt, setTask2Prompt] = useState("");
  const [task1StepIndex, setTask1StepIndex] = useState(0);
  const [task2StepIndex, setTask2StepIndex] = useState(0);
  const [task1Values, setTask1Values] = useState<Record<string, string>>({});
  const [task2Values, setTask2Values] = useState<Record<string, string>>({});
  const [task1Draft, setTask1Draft] = useState("");
  const [task2Draft, setTask2Draft] = useState("");
  const [task1Evaluation, setTask1Evaluation] = useState<WritingEvaluationResponse | null>(null);
  const [task2Evaluation, setTask2Evaluation] = useState<WritingEvaluationResponse | null>(null);
  const [finalEvaluation, setFinalEvaluation] = useState<WritingSubmitResponse | null>(null);
  const [task1Feedback, setTask1Feedback] = useState<Record<string, WritingStepFeedbackResponse>>({});
  const [task2Feedback, setTask2Feedback] = useState<Record<string, WritingStepFeedbackResponse>>({});
  const [task1FeedbackLoading, setTask1FeedbackLoading] = useState(false);
  const [task2FeedbackLoading, setTask2FeedbackLoading] = useState(false);
  const [task1EvalLoading, setTask1EvalLoading] = useState(false);
  const [task2EvalLoading, setTask2EvalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [examTask, setExamTask] = useState<WritingTaskType>("task1");
  const [decompositionMode, setDecompositionMode] = useState(true);

  const sessionIdRef = useRef<string | null>(null);

  const task1Combined = useMemo(() => buildCombinedText(TASK1_STEPS, task1Values), [task1Values]);
  const task2Combined = useMemo(() => buildCombinedText(TASK2_STEPS, task2Values), [task2Values]);

  const resetState = useCallback(() => {
    setTask1Prompt("");
    setTask2Prompt("");
    setTask1StepIndex(0);
    setTask2StepIndex(0);
    setTask1Values({});
    setTask2Values({});
    setTask1Draft("");
    setTask2Draft("");
    setTask1Evaluation(null);
    setTask2Evaluation(null);
    setFinalEvaluation(null);
    setTask1Feedback({});
    setTask2Feedback({});
    setError("");
    setExamTask("task1");
    setTimerActive(false);
  }, []);

  const startMode = async (targetMode: WritingMode) => {
    setMode(targetMode);
    setIsStarted(true);
    resetState();
    setLoadingPrompts(true);
    setError("");
    sessionIdRef.current = buildSessionId();

    try {
      const prompts = await generateWritingTasks({ session_id: sessionIdRef.current ?? undefined });
      setTask1Prompt(prompts.task1_prompt);
      setTask2Prompt(prompts.task2_prompt);
      if (targetMode === "exam") {
        setTimerKey((prev) => prev + 1);
        setTimerActive(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate writing prompts.");
      setIsStarted(false);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleReset = () => {
    setMode(null);
    setIsStarted(false);
    resetState();
  };

  const requestStepFeedback = async (
    taskType: WritingTaskType,
    step: WritingStep,
    text: string
  ) => {
    if (!text.trim()) {
      return;
    }
    setError("");
    if (taskType === "task1") {
      setTask1FeedbackLoading(true);
    } else {
      setTask2FeedbackLoading(true);
    }

    try {
      const prompt = taskType === "task1" ? task1Prompt : task2Prompt;
      const result = await evaluateWritingStep({
        task_type: taskType,
        step: step.title,
        prompt,
        text
      });
      if (taskType === "task1") {
        setTask1Feedback((prev) => ({ ...prev, [step.key]: result }));
      } else {
        setTask2Feedback((prev) => ({ ...prev, [step.key]: result }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get step feedback.");
    } finally {
      if (taskType === "task1") {
        setTask1FeedbackLoading(false);
      } else {
        setTask2FeedbackLoading(false);
      }
    }
  };

  const handleTaskStepChange = async (
    taskType: WritingTaskType,
    nextIndex: number
  ) => {
    const steps = taskType === "task1" ? TASK1_STEPS : TASK2_STEPS;
    const currentIndex = taskType === "task1" ? task1StepIndex : task2StepIndex;
    if (nextIndex <= currentIndex) {
      if (taskType === "task1") {
        setTask1StepIndex(nextIndex);
      } else {
        setTask2StepIndex(nextIndex);
      }
      return;
    }

    if (!decompositionMode) {
      if (taskType === "task1") {
        setTask1StepIndex(nextIndex);
      } else {
        setTask2StepIndex(nextIndex);
      }
      return;
    }

    const currentStep = steps[currentIndex];
    const values = taskType === "task1" ? task1Values : task2Values;
    const feedback = taskType === "task1" ? task1Feedback : task2Feedback;
    const currentText = values[currentStep.key] ?? "";
    if (!currentText.trim()) {
      setError("Please write something for the current step before moving on.");
      return;
    }
    if (!feedback[currentStep.key]) {
      await requestStepFeedback(taskType, currentStep, currentText);
    }

    if (taskType === "task1") {
      setTask1StepIndex(nextIndex);
    } else {
      setTask2StepIndex(nextIndex);
    }
  };

  const handleEvaluateTask = async (taskType: WritingTaskType) => {
    const prompt = taskType === "task1" ? task1Prompt : task2Prompt;
    const responseText = taskType === "task1" ? task1Combined : task2Combined;
    if (!responseText.trim()) {
      return;
    }
    setError("");
    if (taskType === "task1") {
      setTask1EvalLoading(true);
    } else {
      setTask2EvalLoading(true);
    }

    try {
      const evaluation = await evaluateWritingTask({
        task_type: taskType,
        prompt,
        response_text: responseText
      });
      if (taskType === "task1") {
        setTask1Evaluation(evaluation);
      } else {
        setTask2Evaluation(evaluation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate writing task.");
    } finally {
      if (taskType === "task1") {
        setTask1EvalLoading(false);
      } else {
        setTask2EvalLoading(false);
      }
    }
  };

  const handleTimerExpire = () => {
    if (finalEvaluation || isSubmitting) {
      return;
    }
    void handleSubmitWriting();
  };

  const handleSubmitWriting = async () => {
    if (!mode || !isStarted || isSubmitting) {
      return;
    }
    if (!task1Prompt || !task2Prompt) {
      setError("Writing prompts are not ready yet.");
      return;
    }
    const task1Text = mode === "exam" ? task1Draft : task1Combined;
    const task2Text = mode === "exam" ? task2Draft : task2Combined;
    if (!task1Text.trim() || !task2Text.trim()) {
      setError("Please complete both tasks before submitting.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setTimerActive(false);

    try {
      const response = await submitWriting({
        session_id: sessionIdRef.current ?? buildSessionId(),
        mode,
        task1_prompt: task1Prompt,
        task2_prompt: task2Prompt,
        task1_text: task1Text,
        task2_text: task2Text,
        task1_steps: mode === "practice" ? task1Values : undefined,
        task2_steps: mode === "practice" ? task2Values : undefined
      });
      setFinalEvaluation(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit writing tasks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isStarted || !mode || !sessionIdRef.current || !task1Prompt) {
      return;
    }
    if (mode !== "practice") {
      return;
    }
    const timeout = window.setTimeout(() => {
      void saveWritingProgress({
        session_id: sessionIdRef.current as string,
        mode,
        task_type: "task1",
        steps: task1Values,
        task_prompt: task1Prompt
      }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [task1Values, task1Prompt, mode, isStarted]);

  useEffect(() => {
    if (!isStarted || !mode || !sessionIdRef.current || !task2Prompt) {
      return;
    }
    if (mode !== "practice") {
      return;
    }
    const timeout = window.setTimeout(() => {
      void saveWritingProgress({
        session_id: sessionIdRef.current as string,
        mode,
        task_type: "task2",
        steps: task2Values,
        task_prompt: task2Prompt
      }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [task2Values, task2Prompt, mode, isStarted]);

  useEffect(() => {
    if (!isStarted || !mode || mode !== "exam" || !sessionIdRef.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (task1Prompt) {
        void saveWritingProgress({
          session_id: sessionIdRef.current as string,
          mode,
          task_type: "task1",
          steps: { draft: task1Draft },
          task_prompt: task1Prompt
        }).catch(() => undefined);
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [task1Draft, task1Prompt, mode, isStarted]);

  useEffect(() => {
    if (!isStarted || !mode || mode !== "exam" || !sessionIdRef.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (task2Prompt) {
        void saveWritingProgress({
          session_id: sessionIdRef.current as string,
          mode,
          task_type: "task2",
          steps: { draft: task2Draft },
          task_prompt: task2Prompt
        }).catch(() => undefined);
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [task2Draft, task2Prompt, mode, isStarted]);

  const practiceHeader = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Practice Mode</h2>
        <p className="text-sm text-slate-500">
          Guided step-by-step writing with feedback after each part.
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => setDecompositionMode((prev) => !prev)}
      >
        Task Decomposition: {decompositionMode ? "On" : "Off"}
      </Button>
    </div>
  );

  return (
    <AppShell title="Writing Module" subtitle="Guided learning and exam simulation for TEF writing">
      <div className="space-y-6">
        {!mode || !isStarted ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Practice Mode</h2>
                <p className="text-sm text-slate-600">
                  Work through structured steps with guidance and optional feedback after each part.
                </p>
                <Button onClick={() => startMode("practice")}>Start Practice</Button>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Exam Mode</h2>
                <p className="text-sm text-slate-600">
                  Simulate the full writing exam with Task 1 and Task 2 in a 60-minute timer.
                </p>
                <Button onClick={() => startMode("exam")}>Start Exam</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">TEF Writing Tasks</h2>
                <p className="text-sm text-slate-500">
                  Task 1: Informative message (60–120 words). Task 2: Argumentative text (120–200 words).
                </p>
              </div>
              {mode === "exam" ? (
                <TimerClock
                  durationSeconds={EXAM_DURATION_SECONDS}
                  isActive={timerActive}
                  resetKey={timerKey}
                  onExpire={handleTimerExpire}
                />
              ) : (
                <Button variant="secondary" onClick={handleReset}>
                  Change Mode
                </Button>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loadingPrompts && (
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                Generating writing prompts...
              </div>
            )}

            {!loadingPrompts && mode === "practice" && (
              <div className="space-y-8">
                {practiceHeader}

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>Task 1 — Informative Message</CardTitle>
                    <p className="text-sm text-slate-500">Prompt: {task1Prompt || "Loading..."}</p>
                  </CardHeader>
                </Card>

                <WritingStepper
                  title="Task 1 Step-by-step"
                  steps={TASK1_STEPS}
                  currentStep={task1StepIndex}
                  values={task1Values}
                  onStepChange={(index) => void handleTaskStepChange("task1", index)}
                  onValueChange={(key, value) => setTask1Values((prev) => ({ ...prev, [key]: value }))}
                  onRequestFeedback={(step, text) => requestStepFeedback("task1", step, text)}
                  feedback={task1Feedback}
                  isFeedbackLoading={task1FeedbackLoading}
                />

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">Task 1 Combined Draft</h3>
                      <span className="text-sm text-slate-500">Words: {wordCount(task1Combined)}</span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-slate-700">
                      {task1Combined || "Your combined draft will appear here."}
                    </p>
                    <Button
                      onClick={() => handleEvaluateTask("task1")}
                      disabled={task1EvalLoading || !task1Combined.trim()}
                    >
                      {task1EvalLoading ? "Evaluating..." : "Evaluate Task 1"}
                    </Button>
                  </CardContent>
                </Card>

                {task1Evaluation && (
                  <WritingEvaluationCard title="Task 1 Evaluation" evaluation={task1Evaluation} />
                )}

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>Task 2 — Argumentative Text</CardTitle>
                    <p className="text-sm text-slate-500">Prompt: {task2Prompt || "Loading..."}</p>
                  </CardHeader>
                </Card>

                <WritingStepper
                  title="Task 2 Step-by-step"
                  steps={TASK2_STEPS}
                  currentStep={task2StepIndex}
                  values={task2Values}
                  onStepChange={(index) => void handleTaskStepChange("task2", index)}
                  onValueChange={(key, value) => setTask2Values((prev) => ({ ...prev, [key]: value }))}
                  onRequestFeedback={(step, text) => requestStepFeedback("task2", step, text)}
                  feedback={task2Feedback}
                  isFeedbackLoading={task2FeedbackLoading}
                />

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">Task 2 Combined Draft</h3>
                      <span className="text-sm text-slate-500">Words: {wordCount(task2Combined)}</span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-slate-700">
                      {task2Combined || "Your combined draft will appear here."}
                    </p>
                    <Button
                      onClick={() => handleEvaluateTask("task2")}
                      disabled={task2EvalLoading || !task2Combined.trim()}
                    >
                      {task2EvalLoading ? "Evaluating..." : "Evaluate Task 2"}
                    </Button>
                  </CardContent>
                </Card>

                {task2Evaluation && (
                  <WritingEvaluationCard title="Task 2 Evaluation" evaluation={task2Evaluation} />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleSubmitWriting} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Both Tasks"}
                  </Button>
                  <Button variant="secondary" onClick={handleReset}>
                    Back to Mode Selection
                  </Button>
                </div>

                {finalEvaluation && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <WritingEvaluationCard title="Task 1 Final" evaluation={finalEvaluation.task1} />
                    <WritingEvaluationCard title="Task 2 Final" evaluation={finalEvaluation.task2} />
                  </div>
                )}
              </div>
            )}

            {!loadingPrompts && mode === "exam" && (
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {examTask === "task1" ? "Task 1 — Informative Message" : "Task 2 — Argumentative Text"}
                      </h3>
                      <span className="text-sm text-slate-500">
                        {examTask === "task1" ? "60–120 words" : "120–200 words"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {examTask === "task1" ? task1Prompt : task2Prompt}
                    </p>
                    <textarea
                      className="min-h-[220px] w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                      placeholder="Write your response here..."
                      value={examTask === "task1" ? task1Draft : task2Draft}
                      onChange={(event) =>
                        examTask === "task1"
                          ? setTask1Draft(event.target.value)
                          : setTask2Draft(event.target.value)
                      }
                      disabled={Boolean(finalEvaluation)}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                      <span>
                        Words: {examTask === "task1" ? wordCount(task1Draft) : wordCount(task2Draft)}
                      </span>
                      <div className="flex gap-3">
                        {examTask === "task2" && (
                          <Button
                            variant="secondary"
                            onClick={() => setExamTask("task1")}
                            disabled={Boolean(finalEvaluation)}
                          >
                            Back to Task 1
                          </Button>
                        )}
                        {examTask === "task1" ? (
                          <Button onClick={() => setExamTask("task2")} disabled={Boolean(finalEvaluation)}>
                            Continue to Task 2
                          </Button>
                        ) : (
                          <Button onClick={handleSubmitWriting} disabled={isSubmitting || Boolean(finalEvaluation)}>
                            {isSubmitting ? "Submitting..." : "Submit Exam"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {finalEvaluation && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Exam submitted successfully.
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <WritingEvaluationCard title="Task 1 Evaluation" evaluation={finalEvaluation.task1} />
                      <WritingEvaluationCard title="Task 2 Evaluation" evaluation={finalEvaluation.task2} />
                    </div>
                    <Button variant="secondary" onClick={handleReset}>
                      Back to Mode Selection
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

