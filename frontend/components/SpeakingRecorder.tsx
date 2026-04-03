"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface SpeakingRecorderHandle {
  /** Stop recognition and emit the buffered transcript (used by manual Stop button) */
  stop: () => void;
  /** Stop recognition and DISCARD buffer — use for Reset / cleanup */
  cancel: () => void;
  /** Start recognition */
  start: () => void;
}

interface SpeakingRecorderProps {
  language?: string;
  isDisabled?: boolean;
  /** Hide the built-in button row (parent renders its own controls) */
  hideButton?: boolean;
  /**
   * Hands-free auto-stop: after this many ms of silence following the last
   * detected speech, recognition stops and the buffered transcript is emitted.
   * Set to 0 (default) to disable.
   */
  silenceTimeoutMs?: number;
  /**
   * Manual mode: buffer transcript and only emit on explicit stop() call.
   * Takes precedence over silenceTimeoutMs.
   */
  manualSubmit?: boolean;
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  onNoSpeech?: () => void;
  onListeningChange?: (listening: boolean) => void;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResult[];
  resultIndex: number;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const SpeakingRecorder = forwardRef<SpeakingRecorderHandle, SpeakingRecorderProps>(
  function SpeakingRecorder(
    {
      language = "fr-FR",
      isDisabled = false,
      hideButton = false,
      silenceTimeoutMs = 0,
      manualSubmit = false,
      onTranscript,
      onError,
      onNoSpeech,
      onListeningChange,
    },
    ref
  ) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const bufferRef = useRef<string>("");
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSpeechRef = useRef(false); // true once user has spoken at least one word

    // ── helpers ──────────────────────────────────────────────────────────────

    const clearSilenceTimer = useCallback(() => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }, []);

    /** Internal stop — optionally emit the buffer */
    const doStop = useCallback(
      (emit: boolean) => {
        clearSilenceTimer();
        hasSpeechRef.current = false;

        // Null out ref first so onend doesn't auto-restart
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec?.stop();

        setIsListening(false);
        onListeningChange?.(false);

        if (emit) {
          const text = bufferRef.current.trim();
          bufferRef.current = "";
          if (text) onTranscript(text);
        } else {
          bufferRef.current = "";
        }
      },
      [clearSilenceTimer, onListeningChange, onTranscript]
    );

    // ── Exposed handle ────────────────────────────────────────────────────────

    const stopAndEmit = useCallback(() => doStop(true), [doStop]);
    const cancel = useCallback(() => doStop(false), [doStop]);

    const startListening = useCallback(() => {
      if (isDisabled) return;
      if (recognitionRef.current) return; // already running

      const speechApi = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const Impl = speechApi.SpeechRecognition ?? speechApi.webkitSpeechRecognition;
      if (!Impl) {
        onError?.("Speech recognition is not supported in this browser.");
        return;
      }

      bufferRef.current = "";
      hasSpeechRef.current = false;
      clearSilenceTimer();

      const recognition = new Impl();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true; // lets us reset silence timer on interim speech

      recognition.onresult = (event) => {
        let hasNewFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            bufferRef.current = (bufferRef.current + " " + result[0].transcript).trim();
            hasNewFinal = true;
            hasSpeechRef.current = true;
          }
        }

        // Reset silence timer after ANY speech activity (interim or final)
        if (hasSpeechRef.current && (silenceTimeoutMs > 0) && !manualSubmit) {
          clearSilenceTimer();
          if (hasNewFinal) {
            // Schedule auto-stop after silence
            silenceTimerRef.current = setTimeout(() => {
              doStop(true);
            }, silenceTimeoutMs);
          }
        }
      };

      recognition.onerror = (event) => {
        const code = event.error ?? "";
        if (code === "no-speech" || code === "audio-capture") {
          onNoSpeech?.();
          return;
        }
        const messages: Record<string, string> = {
          "not-allowed": "Microphone access denied. Please allow microphone access.",
          "network": "Network error during speech recognition.",
          "aborted": "",
        };
        const msg = messages[code] ?? `Speech recognition error: ${code}`;
        if (msg) onError?.(msg);
      };

      recognition.onend = () => {
        // If recognitionRef is still set, the browser ended early (silence timeout) —
        // restart to keep mic open until we explicitly stop.
        if (recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
          return;
        }
        setIsListening(false);
        onListeningChange?.(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      onListeningChange?.(true);
      recognition.start();
    }, [
      isDisabled,
      language,
      manualSubmit,
      silenceTimeoutMs,
      clearSilenceTimer,
      doStop,
      onError,
      onListeningChange,
      onNoSpeech,
    ]);

    useImperativeHandle(
      ref,
      () => ({ start: startListening, stop: stopAndEmit, cancel }),
      [startListening, stopAndEmit, cancel]
    );

    // ── UI ────────────────────────────────────────────────────────────────────

    if (hideButton) return null;

    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={isListening ? stopAndEmit : startListening}
          disabled={isDisabled}
        >
          {isListening ? "Stop" : "Start Recording"}
        </Button>
        <p className="text-sm text-slate-500">
          {isListening ? "Listening... speak now." : "Tap to answer in French."}
        </p>
      </div>
    );
  }
);

export default SpeakingRecorder;
