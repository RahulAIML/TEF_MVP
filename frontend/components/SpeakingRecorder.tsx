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
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  onNoSpeech?: () => void;
  onListeningChange?: (listening: boolean) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResult[];
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
    onTranscript,
    onError,
    onNoSpeech,
    onListeningChange
  },
  ref
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    onListeningChange?.(false);
  }, [onListeningChange]);

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

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript.trim());
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
      setIsListening(false);
      onListeningChange?.(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    onListeningChange?.(true);
    recognition.start();
  }, [isDisabled, language, onError, onListeningChange, onNoSpeech, onTranscript]);

  useImperativeHandle(ref, () => ({
    start: startListening,
    stop: stopListening
  }), [startListening, stopListening]);

  // expose isListening so parent can read it if needed

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

