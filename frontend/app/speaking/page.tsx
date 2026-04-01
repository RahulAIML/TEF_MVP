"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AppShell from "@/components/AppShell";
import SpeakingChat from "@/components/SpeakingChat";
import SpeakingRecorder, { SpeakingRecorderHandle } from "@/components/SpeakingRecorder";
import TimerClock from "@/components/TimerClock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendConversation, evaluateSpeaking } from "@/services/api";
import type {
  ConversationMessage,
  SpeakingEvaluationResponse,
  SpeakingMode,
  SpeakingTaskType
} from "@/types/speaking";

const EXAM_DURATION_SECONDS = 15 * 60;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const initialHints = [
  "Answer in 1–2 sentences.",
  "Use simple connectors (par exemple: d'abord, ensuite).",
  "Stay polite and natural.",
  "Ask a short follow-up question back."
];

export default function SpeakingPage() {
  const [mode, setMode] = useState<SpeakingMode>("practice");
  const [taskType, setTaskType] = useState<SpeakingTaskType>("role_play");
  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<SpeakingEvaluationResponse | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const historyRef = useRef<ConversationMessage[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<SpeakingRecorderHandle | null>(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const buildSessionId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsAudioPlaying(false);
  }, []);

  const resetSession = useCallback(() => {
    recorderRef.current?.stop();
    stopAudio();
    setHistory([]);
    setTranscript("");
    setEvaluation(null);
    setError("");
    setIsThinking(false);
    setTimerActive(false);
    setIsExamStarted(false);
    sessionIdRef.current = null;
  }, [stopAudio]);

  const startListening = useCallback(() => {
    if (isThinking) return;
    if (mode === "exam" && !isExamStarted) return;
    if (isListening) return;
    if (isAudioPlaying) {
      stopAudio();
    }
    recorderRef.current?.start();
  }, [isThinking, mode, isExamStarted, isListening, isAudioPlaying, stopAudio]);

  const startSession = () => {
    resetSession();
    sessionIdRef.current = buildSessionId();
    if (mode === "exam") {
      setTimerKey((prev) => prev + 1);
      setTimerActive(true);
      setIsExamStarted(true);
    }
    if (handsFreeEnabled) {
      window.setTimeout(() => startListening(), 400);
    }
  };

  const buildAudioUrl = (audioUrl?: string | null) => {
    if (!audioUrl) return null;
    if (audioUrl.startsWith("http")) return audioUrl;
    return `${API_BASE_URL}${audioUrl}`;
  };

  const handleTranscript = async (text: string) => {
    if (!text) return;
    if (mode === "exam" && !isExamStarted) {
      setError("Please start the exam first.");
      return;
    }

    setError("");
    setTranscript(text);
    setEvaluation(null);

    const previousHistory = historyRef.current;
    const nextHistory: ConversationMessage[] = [...previousHistory, { role: "user", content: text }];
    setHistory(nextHistory);
    setIsThinking(true);

    try {
      const response = await sendConversation({
        message: text,
        history: previousHistory,
        task_type: taskType,
        mode,
        hints: mode === "practice" && hintsEnabled,
        session_id: sessionIdRef.current ?? undefined
      });

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: response.reply
      };
      setHistory((prev) => [...prev, assistantMessage]);
      const audio = buildAudioUrl(response.audio_url);
      if (audio && audioRef.current) {
        audioRef.current.src = audio;
        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch(() => undefined);
        }
      } else if (handsFreeEnabled) {
        window.setTimeout(() => startListening(), 400);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get examiner response.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleEvaluate = async () => {
    if (historyRef.current.length === 0) {
      setError("No conversation to evaluate yet.");
      return;
    }
    setError("");
    setIsThinking(true);
    recorderRef.current?.stop();
    stopAudio();
    try {
      const result = await evaluateSpeaking({
        history: historyRef.current,
        task_type: taskType,
        mode
      });
      setEvaluation(result);
      setTimerActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate speaking.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleTimerExpire = () => {
    if (!isExamStarted) return;
    void handleEvaluate();
  };

  const statusLabel = useMemo(() => {
    if (mode === "exam" && !isExamStarted) return "Start the exam to begin.";
    if (isThinking) return "Examiner is thinking...";
    if (isAudioPlaying) return "Examiner is speaking...";
    if (isListening) return "Listening...";
    return handsFreeEnabled ? "Hands-free active." : "Ready.";
  }, [isThinking, isAudioPlaying, isListening, handsFreeEnabled, mode, isExamStarted]);

  const taskLabel = useMemo(
    () => (taskType === "role_play" ? "Task 1: Role-play" : "Task 2: Opinion discussion"),
    [taskType]
  );

  return (
    <AppShell title="Speaking Module" subtitle="Real-time TEF Canada speaking practice">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={mode === "practice" ? "default" : "outline"}
            onClick={() => {
              setMode("practice");
              resetSession();
            }}
          >
            Practice Mode
          </Button>
          <Button
            variant={mode === "exam" ? "default" : "outline"}
            onClick={() => {
              setMode("exam");
              resetSession();
            }}
          >
            Exam Mode
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {mode === "exam" && (
              <TimerClock
                durationSeconds={EXAM_DURATION_SECONDS}
                isActive={timerActive}
                resetKey={timerKey}
                onExpire={handleTimerExpire}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={taskType === "role_play" ? "default" : "outline"}
            onClick={() => setTaskType("role_play")}
          >
            Role Play (Task 1)
          </Button>
          <Button
            variant={taskType === "opinion" ? "default" : "outline"}
            onClick={() => setTaskType("opinion")}
          >
            Opinion (Task 2)
          </Button>
          <Button variant="secondary" onClick={resetSession}>
            Reset Conversation
          </Button>
          <Button
            variant={handsFreeEnabled ? "default" : "outline"}
            onClick={() => setHandsFreeEnabled((prev) => !prev)}
          >
            Hands-Free {handsFreeEnabled ? "On" : "Off"}
          </Button>
        </div>

        {mode === "exam" && !isExamStarted && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Exam Mode</h3>
              <p className="text-sm text-slate-600">
                You have 15 minutes to complete a speaking conversation. Press start to begin.
              </p>
              <Button onClick={startSession}>Start Exam</Button>
            </CardContent>
          </Card>
        )}

        {mode === "practice" && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Practice Mode</h3>
              <p className="text-sm text-slate-600">
                Guided practice with optional hints. Speak and the examiner responds with follow-up questions.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={startSession}>Start Practice</Button>
                <Button
                  variant="secondary"
                  onClick={() => setHintsEnabled((prev) => !prev)}
                >
                  Hints: {hintsEnabled ? "On" : "Off"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Active Task</p>
                    <h2 className="text-lg font-semibold text-slate-900">{taskLabel}</h2>
                  </div>
                  <audio
                    ref={audioRef}
                    controls
                    className="w-44"
                    onPlay={() => setIsAudioPlaying(true)}
                    onPause={() => setIsAudioPlaying(false)}
                    onEnded={() => {
                      setIsAudioPlaying(false);
                      if (handsFreeEnabled) {
                        startListening();
                      }
                    }}
                  />
                </div>
                <SpeakingRecorder
                  ref={recorderRef}
                  onTranscript={handleTranscript}
                  onError={(message) => setError(message)}
                  onListeningChange={setIsListening}
                  isDisabled={isThinking || (mode === "exam" && !isExamStarted)}
                />
                <p className="text-sm text-slate-500">{statusLabel}</p>
              </CardContent>
            </Card>

            <SpeakingChat history={history} isThinking={isThinking} currentTranscript={transcript} />
          </div>

          <div className="space-y-4">
            {mode === "practice" && hintsEnabled && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Hints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  {initialHints.map((hint) => (
                    <p key={hint} className="rounded-lg bg-slate-50 px-3 py-2">
                      {hint}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-6">
                <Button onClick={handleEvaluate} disabled={isThinking}>
                  {isThinking ? "Evaluating..." : "End & Evaluate"}
                </Button>
                <p className="text-sm text-slate-500">
                  Use this after a few exchanges to get feedback on fluency, grammar, and interaction.
                </p>
              </CardContent>
            </Card>

            {evaluation && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-3 p-6 text-sm text-slate-700">
                  <h3 className="text-base font-semibold text-slate-900">Evaluation</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">Fluency</p>
                      <p className="text-lg font-semibold text-slate-900">{evaluation.fluency}/10</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">Grammar</p>
                      <p className="text-lg font-semibold text-slate-900">{evaluation.grammar}/10</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">Vocabulary</p>
                      <p className="text-lg font-semibold text-slate-900">{evaluation.vocabulary}/10</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">Interaction</p>
                      <p className="text-lg font-semibold text-slate-900">{evaluation.interaction}/10</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Feedback</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {evaluation.feedback.map((item, index) => (
                        <li key={`fb-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  {evaluation.improved_response && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">Improved Response</p>
                      <p className="mt-2 whitespace-pre-line">{evaluation.improved_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

