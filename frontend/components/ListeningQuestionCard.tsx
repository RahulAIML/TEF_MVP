"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnswerOption } from "@/types/exam";
import type { ListeningQuestion } from "@/types/listening";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ListeningQuestionCardProps {
  question: ListeningQuestion;
  questionNumber: number;
  selectedAnswer: AnswerOption | "";
  onSelect: (value: AnswerOption) => void;
  disabled?: boolean;
  maxPlays?: number;
  playCount?: number;
  onPlay?: () => void;
  showTranscript: boolean;
  onToggleTranscript?: () => void;
  onTranscriptSelect?: (text: string) => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export default function ListeningQuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onSelect,
  disabled,
  maxPlays,
  playCount = 0,
  onPlay,
  showTranscript,
  onToggleTranscript,
  onTranscriptSelect
}: ListeningQuestionCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const audioSrc = useMemo(() => {
    if (!question.audio_url) return "";
    if (question.audio_url.startsWith("http")) return question.audio_url;
    return `${apiBase}${question.audio_url}`;
  }, [question.audio_url, apiBase]);

  const words = useMemo(() => question.script.split(/\s+/).filter(Boolean), [question.script]);

  const remainingPlays = maxPlays ? Math.max(0, maxPlays - playCount) : null;
  const canPlay = Boolean(audioSrc) && (remainingPlays === null || remainingPlays > 0);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setAutoScroll(true);
      setIsBuffering(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    const handleCanPlay = () => setIsBuffering(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplaythrough", handleCanPlay);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplaythrough", handleCanPlay);
    };
  }, []);

  useEffect(() => {
    if (!showTranscript) return;
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !audio.duration) return;
      const progress = audio.currentTime / audio.duration;
      const index = Math.min(words.length - 1, Math.max(0, Math.floor(progress * words.length)));
      setCurrentWordIndex(index);
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying, showTranscript, words.length]);

  useEffect(() => {
    if (!showTranscript || !autoScroll) return;
    const currentWord = wordRefs.current[currentWordIndex];
    if (currentWord && transcriptRef.current) {
      currentWord.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentWordIndex, showTranscript, autoScroll]);

  const handlePlayClick = async () => {
    if (!audioRef.current || !canPlay) return;
    if (audioRef.current.readyState < 3) {
      setIsBuffering(true);
    }
    try {
      await audioRef.current.play();
      onPlay?.();
    } catch {
      setIsBuffering(false);
    }
  };

  const handlePauseClick = () => {
    audioRef.current?.pause();
  };

  const handleStopClick = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentWordIndex(0);
  };

  const handleTranscriptSelection = () => {
    const selection = window.getSelection()?.toString() ?? "";
    const cleaned = selection.replace(/\s+/g, " ").trim();
    if (cleaned && onTranscriptSelect) {
      onTranscriptSelect(cleaned);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-slate-900">Question {questionNumber}</CardTitle>
            <CardDescription>Play the audio and answer the question.</CardDescription>
          </div>
          {onToggleTranscript && (
            <Button variant="outline" onClick={onToggleTranscript}>
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Audio Controls</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={handlePlayClick} disabled={!canPlay}>
              {isBuffering ? "Loading audio..." : remainingPlays === null ? "Play" : remainingPlays > 0 ? `Play (${remainingPlays} left)` : "Play limit reached"}
            </Button>
            <Button variant="secondary" onClick={handlePauseClick} disabled={!audioSrc}>
              Pause
            </Button>
            <Button variant="secondary" onClick={handleStopClick} disabled={!audioSrc}>
              Stop
            </Button>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Speed</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPEED_OPTIONS.map((speed) => (
                <Button
                  key={`speed-${speed}`}
                  variant={playbackRate === speed ? "default" : "outline"}
                  onClick={() => setPlaybackRate(speed)}
                  size="sm"
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
          {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" />}
        </div>

        {showTranscript && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">Transcript</p>
            <div
              ref={transcriptRef}
              className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-white p-3 text-sm leading-6 text-slate-700 scrollbar-thin"
              onMouseUp={handleTranscriptSelection}
              onWheel={() => setAutoScroll(false)}
              onTouchMove={() => setAutoScroll(false)}
            >
              {words.map((word, index) => (
                <span
                  key={`word-${index}`}
                  ref={(el) => { wordRefs.current[index] = el; }}
                  className={index === currentWordIndex ? "rounded bg-yellow-200 px-1" : ""}
                >
                  {word}{" "}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">{question.question}</h3>
          <div className="mt-2 space-y-2">
            {question.options.map((option, index) => {
              const value = (["A", "B", "C", "D"][index] as AnswerOption) ?? "A";
              const isSelected = selectedAnswer === value;
              return (
                <label
                  key={`listening-${questionNumber}-${index}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                  } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <input
                    type="radio"
                    name={`listening-question-${questionNumber}`}
                    className="mt-1"
                    value={value}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onSelect(value)}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
