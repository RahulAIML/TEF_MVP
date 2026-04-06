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
const MAX_EXCHANGES = 5;

type ConvState = "idle" | "listening" | "processing" | "speaking";

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
  const [convState, setConvState] = useState<ConvState>("idle");
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<SpeakingEvaluationResponse | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(false);
  const [userTurnCount, setUserTurnCount] = useState(0);

  // Refs
  const historyRef = useRef<ConversationMessage[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<SpeakingRecorderHandle | null>(null);
  const pendingEvaluateRef = useRef(false);
  const convStateRef = useRef<ConvState>("idle");

  // Keep refs in sync
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { convStateRef.current = convState; }, [convState]);

  const isSessionActive = history.length > 0 || convState !== "idle";

  // ── Audio controls ────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    if (convStateRef.current === "speaking") setConvState("idle");
  }, []);

  // ── Listening controls ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (convStateRef.current === "processing") return;
    if (convStateRef.current === "speaking") return;   // never overlap with examiner
    if (mode === "exam" && !isExamStarted) return;
    if (convStateRef.current === "listening") return;
    setConvState("listening");
    recorderRef.current?.start();
  }, [mode, isExamStarted]);

  const stopListening = useCallback(() => {
    recorderRef.current?.stop();
    // onTranscript fires → handleTranscript takes over state
    // If no speech was captured, state resets below
  }, []);

  // ── Session management ────────────────────────────────────────────────────
  const buildSessionId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const resetSession = useCallback(() => {
    recorderRef.current?.cancel();
    stopAudio();
    pendingEvaluateRef.current = false;
    setHistory([]);
    setTranscript("");
    setEvaluation(null);
    setError("");
    setConvState("idle");
    setTimerActive(false);
    setIsExamStarted(false);
    setUserTurnCount(0);
    sessionIdRef.current = null;
  }, [stopAudio]);

  // ── Build audio URL ───────────────────────────────────────────────────────
  const buildAudioUrl = (audioUrl?: string | null) => {
    if (!audioUrl) return null;
    if (audioUrl.startsWith("http")) return audioUrl;
    return `${API_BASE_URL}${audioUrl}`;
  };

  // ── Evaluate ──────────────────────────────────────────────────────────────
  const handleEvaluate = useCallback(async () => {
    if (historyRef.current.length === 0) {
      setError("No conversation to evaluate yet.");
      return;
    }
    setError("");
    setConvState("processing");
    recorderRef.current?.cancel();
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
      setConvState("idle");
    }
  }, [taskType, mode, stopAudio]);

  // ── Play examiner audio ───────────────────────────────────────────────────
  const playAudio = useCallback((audioUrl: string, onEnded?: () => void) => {
    if (!audioRef.current) return;
    setConvState("speaking");
    audioRef.current.src = audioUrl;
    audioRef.current.onended = () => {
      setConvState("idle");
      onEnded?.();
    };
    audioRef.current.onerror = () => {
      setConvState("idle");
      onEnded?.();
    };
    audioRef.current.play().catch(() => {
      setConvState("idle");
      onEnded?.();
    });
  }, []);

  // ── Examiner start ────────────────────────────────────────────────────────
  const startExaminer = useCallback(async () => {
    setError("");
    setEvaluation(null);
    setTranscript("");
    setConvState("processing");
    try {
      const response = await sendConversation({
        message: "__START__",
        history: [],
        task_type: taskType,
        mode,
        hints: mode === "practice" && hintsEnabled,
        session_id: sessionIdRef.current ?? undefined
      });
      const assistantMessage: ConversationMessage = { role: "assistant", content: response.reply };
      setHistory([assistantMessage]);

      const audioUrl = buildAudioUrl(response.audio_url);
      if (audioUrl) {
        playAudio(audioUrl, () => {
          // After examiner finishes: auto-listen only in hands-free mode
          if (handsFreeEnabled) {
            window.setTimeout(() => startListening(), 800);
          }
        });
      } else {
        setConvState("idle");
        if (handsFreeEnabled) {
          window.setTimeout(() => startListening(), 800);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation.");
      setConvState("idle");
    }
  }, [taskType, mode, hintsEnabled, handsFreeEnabled, playAudio, startListening]);

  const startSession = () => {
    resetSession();
    sessionIdRef.current = buildSessionId();
    if (mode === "exam") {
      setTimerKey((prev) => prev + 1);
      setTimerActive(true);
      setIsExamStarted(true);
    }
    window.setTimeout(() => void startExaminer(), 400);
  };

  // ── Transcript handler ────────────────────────────────────────────────────
  const handleTranscript = useCallback(async (text: string) => {
    if (!text) {
      if (convStateRef.current === "listening") setConvState("idle");
      return;
    }
    if (userTurnCount >= MAX_EXCHANGES) return;
    if (mode === "exam" && !isExamStarted) {
      setError("Please start the exam first.");
      return;
    }

    setError("");
    setTranscript(text);
    setEvaluation(null);
    stopAudio();

    const nextTurnCount = userTurnCount + 1;
    setUserTurnCount(nextTurnCount);
    const isLastTurn = nextTurnCount >= MAX_EXCHANGES;

    const previousHistory = historyRef.current;
    const nextHistory: ConversationMessage[] = [...previousHistory, { role: "user", content: text }];
    setHistory(nextHistory);
    setConvState("processing");

    // Natural pause before examiner responds (2s)
    await new Promise((resolve) => window.setTimeout(resolve, 2000));

    try {
      const response = await sendConversation({
        message: text,
        history: previousHistory,
        task_type: taskType,
        mode,
        hints: mode === "practice" && hintsEnabled,
        session_id: sessionIdRef.current ?? undefined
      });

      const assistantMessage: ConversationMessage = { role: "assistant", content: response.reply };
      setHistory((prev) => [...prev, assistantMessage]);

      const audioUrl = buildAudioUrl(response.audio_url);
      if (audioUrl) {
        if (isLastTurn) pendingEvaluateRef.current = true;
        playAudio(audioUrl, () => {
          if (pendingEvaluateRef.current) {
            pendingEvaluateRef.current = false;
            window.setTimeout(() => void handleEvaluate(), 400);
          } else if (handsFreeEnabled) {
            // Hands-free: auto-start listening after examiner finishes
            window.setTimeout(() => startListening(), 800);
          }
          // Manual mode: user clicks Start Recording themselves
        });
      } else if (isLastTurn) {
        setConvState("idle");
        window.setTimeout(() => void handleEvaluate(), 400);
      } else {
        setConvState("idle");
        if (handsFreeEnabled) {
          window.setTimeout(() => startListening(), 800);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get examiner response.");
      setConvState("idle");
    }
  }, [mode, isExamStarted, userTurnCount, taskType, hintsEnabled, handsFreeEnabled,
      stopAudio, handleEvaluate, startListening, playAudio]);

  const handleTimerExpire = () => {
    if (!isExamStarted) return;
    void handleEvaluate();
  };

  // ── Status label ──────────────────────────────────────────────────────────
  const statusLabel = useMemo(() => {
    if (mode === "exam" && !isExamStarted) return "Start the exam to begin.";
    switch (convState) {
      case "processing": return "Examiner is thinking…";
      case "speaking":   return "Examiner is speaking…";
      case "listening":  return "Listening… speak now.";
      default:
        if (handsFreeEnabled) return "Hands-free active — ready.";
        return isSessionActive ? "Click Start Recording to respond." : "Ready.";
    }
  }, [convState, handsFreeEnabled, mode, isExamStarted, isSessionActive]);

  const taskLabel = useMemo(
    () => (taskType === "role_play" ? "Task 1: Role-play" : "Task 2: Opinion discussion"),
    [taskType]
  );

  const stateIndicatorColor: Record<ConvState, string> = {
    idle:       "bg-slate-300",
    listening:  "bg-emerald-500 animate-pulse",
    processing: "bg-amber-400 animate-pulse",
    speaking:   "bg-indigo-500 animate-pulse"
  };

  const isRecorderDisabled =
    convState === "processing" ||
    convState === "speaking" ||
    (mode === "exam" && !isExamStarted) ||
    !!evaluation;

  return (
    <AppShell title="Speaking Module" subtitle="Real-time TEF Canada speaking practice">
      <div className="space-y-6">
        {/* Mode buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={mode === "practice" ? "default" : "outline"} disabled={isSessionActive}
            onClick={() => { setMode("practice"); resetSession(); }}>
            Practice Mode
          </Button>
          <Button variant={mode === "exam" ? "default" : "outline"} disabled={isSessionActive}
            onClick={() => { setMode("exam"); resetSession(); }}>
            Exam Mode
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {mode === "exam" && (
              <TimerClock durationSeconds={EXAM_DURATION_SECONDS} isActive={timerActive}
                resetKey={timerKey} onExpire={handleTimerExpire} />
            )}
          </div>
        </div>

        {/* Task + settings row */}
        <div className="flex flex-wrap gap-3">
          <Button variant={taskType === "role_play" ? "default" : "outline"} disabled={isSessionActive}
            onClick={() => setTaskType("role_play")}>
            Role Play (Task 1)
          </Button>
          <Button variant={taskType === "opinion" ? "default" : "outline"} disabled={isSessionActive}
            onClick={() => setTaskType("opinion")}>
            Opinion (Task 2)
          </Button>
          <Button variant="secondary" onClick={resetSession}>Reset</Button>
          <Button
            variant={handsFreeEnabled ? "default" : "outline"}
            title="Hands-free: mic auto-starts after examiner finishes. Manual: you control when to record."
            onClick={() => setHandsFreeEnabled((prev) => !prev)}
          >
            {handsFreeEnabled ? "🎙 Hands-Free On" : "🎙 Hands-Free Off"}
          </Button>
        </div>

        {/* Start cards */}
        {mode === "exam" && !isExamStarted && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Exam Mode</h3>
              <p className="text-sm text-slate-600">
                You have 15 minutes. The examiner speaks first — respond naturally.
              </p>
              <Button onClick={startSession}>Start Exam</Button>
            </CardContent>
          </Card>
        )}

        {mode === "practice" && !isSessionActive && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Practice Mode</h3>
              <p className="text-sm text-slate-600">
                The examiner starts first. Respond naturally and the conversation will flow.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={startSession}>Start Practice</Button>
                <Button variant="secondary" onClick={() => setHintsEnabled((prev) => !prev)}>
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

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {/* Recorder + status card */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Active Task</p>
                    <h2 className="text-lg font-semibold text-slate-900">{taskLabel}</h2>
                  </div>
                  {/* State indicator dot */}
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${stateIndicatorColor[convState]}`} />
                    <span className="text-xs text-slate-500 capitalize">{convState}</span>
                  </div>
                </div>

                {/* Hidden audio element — managed programmatically */}
                <audio ref={audioRef} className="hidden" />

                {/* ── Controls ── */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Stop Audio button — visible while examiner is speaking */}
                  {convState === "speaking" && (
                    <Button variant="secondary" onClick={stopAudio}>
                      ⏹ Stop Audio
                    </Button>
                  )}

                  {/* Recording controls — only in manual mode while session is active */}
                  {!handsFreeEnabled && isSessionActive && !evaluation && convState !== "speaking" && (
                    convState === "listening" ? (
                      <Button
                        variant="secondary"
                        onClick={stopListening}
                      >
                        ⏹ Stop Recording
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        disabled={isRecorderDisabled}
                        onClick={startListening}
                      >
                        🎤 Start Recording
                      </Button>
                    )
                  )}
                </div>

                {/* SpeakingRecorder — hands-free mode only (no button rendered by default) */}
                {/*
                  In hands-free mode: silence detection auto-submits after 3.5s of quiet.
                  In manual mode: hideButton=true + manualSubmit=true — parent controls everything.
                */}
                <SpeakingRecorder
                  ref={recorderRef}
                  hideButton={true}
                  silenceTimeoutMs={handsFreeEnabled ? 3500 : 0}
                  manualSubmit={!handsFreeEnabled}
                  onTranscript={handleTranscript}
                  onError={(message) => setError(message)}
                  onNoSpeech={() => {
                    if (convStateRef.current === "listening") setConvState("idle");
                  }}
                  onListeningChange={(listening) => {
                    if (!listening && convStateRef.current === "listening") setConvState("idle");
                  }}
                  isDisabled={isRecorderDisabled}
                />

                <p className="text-sm text-slate-500">{statusLabel}</p>
              </CardContent>
            </Card>

            <SpeakingChat
              history={history}
              isThinking={convState === "processing"}
              currentTranscript={transcript}
              exchangeCount={userTurnCount}
              maxExchanges={MAX_EXCHANGES}
            />
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {mode === "practice" && hintsEnabled && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader><CardTitle>Hints</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  {initialHints.map((hint) => (
                    <p key={hint} className="rounded-lg bg-slate-50 px-3 py-2">{hint}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-6">
                <Button
                  onClick={() => void handleEvaluate()}
                  disabled={convState === "processing" || history.length === 0}
                >
                  {convState === "processing" ? "Evaluating…" : "End & Evaluate"}
                </Button>
                <p className="text-sm text-slate-500">
                  End the conversation and get feedback on fluency, grammar, and interaction.
                </p>
              </CardContent>
            </Card>

            {evaluation && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-3 p-6 text-sm text-slate-700">
                  <h3 className="text-base font-semibold text-slate-900">Evaluation</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Fluency",     val: evaluation.fluency },
                      { label: "Grammar",     val: evaluation.grammar },
                      { label: "Vocabulary",  val: evaluation.vocabulary },
                      { label: "Interaction", val: evaluation.interaction }
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase text-slate-400">{label}</p>
                        <p className="text-lg font-semibold text-slate-900">{val}/10</p>
                      </div>
                    ))}
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
