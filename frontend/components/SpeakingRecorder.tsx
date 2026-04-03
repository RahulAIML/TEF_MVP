"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface SpeakingRecorderHandle {
  start: () => void;
  stop: () => void;
}

interface SpeakingRecorderProps {
  language?: string;
  isDisabled?: boolean;
  /** Hide the built-in Start/Stop button (parent manages its own controls) */
  hideButton?: boolean;
  /**
   * When true, transcript is buffered and only emitted when stop() is called.
   * Use this for manual mode so the examiner never responds mid-speech.
   */
  manualSubmit?: boolean;
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  onNoSpeech?: () => void;
  onListeningChange?: (listening: boolean) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResult[];
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const SpeakingRecorder = forwardRef<SpeakingRecorderHandle, SpeakingRecorderProps>(function SpeakingRecorder(
  {
    language = "fr-FR",
    isDisabled = false,
    hideButton = false,
    manualSubmit = false,
    onTranscript,
    onError,
    onNoSpeech,
    onListeningChange
  },
  ref
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Buffer for manual-submit mode
  const bufferedTranscriptRef = useRef<string>("");

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    onListeningChange?.(false);

    // In manual mode, emit buffered transcript now that user clicked Stop
    if (manualSubmit && bufferedTranscriptRef.current.trim()) {
      onTranscript(bufferedTranscriptRef.current.trim());
      bufferedTranscriptRef.current = "";
    }
  }, [manualSubmit, onListeningChange, onTranscript]);

  const startListening = useCallback(() => {
    if (isDisabled) return;

    const speechApi = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionImpl = speechApi.SpeechRecognition ?? speechApi.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      onError?.("Speech recognition is not supported in this browser.");
      return;
    }

    bufferedTranscriptRef.current = "";

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = language;
    recognition.continuous = true;   // always continuous — we decide when to stop
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      // Collect all final results
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          chunk += event.results[i][0].transcript + " ";
        }
      }
      chunk = chunk.trim();
      if (!chunk) return;

      if (manualSubmit) {
        // Buffer — don't emit until user clicks Stop
        bufferedTranscriptRef.current = (bufferedTranscriptRef.current + " " + chunk).trim();
      } else {
        // Hands-free / auto mode — emit immediately
        onTranscript(chunk);
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
        "aborted": ""
      };
      const msg = messages[code] ?? `Speech recognition error: ${code}`;
      if (msg) onError?.(msg);
    };

    recognition.onend = () => {
      // In continuous mode onend fires if browser cuts it (e.g. silence timeout).
      // Restart automatically if we're still supposed to be listening.
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* already stopped */ }
        return;
      }
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    onListeningChange?.(true);
    recognition.start();
  }, [isDisabled, language, manualSubmit, onError, onListeningChange, onNoSpeech, onTranscript]);

  useImperativeHandle(ref, () => ({
    start: startListening,
    stop: stopListening
  }), [startListening, stopListening]);

  if (hideButton) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={isListening ? stopListening : startListening} disabled={isDisabled}>
        {isListening ? "Stop" : "Start Recording"}
      </Button>
      <p className="text-sm text-slate-500">
        {isListening ? "Listening... speak now." : "Tap to answer in French."}
      </p>
    </div>
  );
});

export default SpeakingRecorder;
