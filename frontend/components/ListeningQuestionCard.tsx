"use client";

import { useMemo, useRef } from "react";
import type { AnswerOption } from "@/types/exam";
import type { ListeningQuestion } from "@/types/listening";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ListeningQuestionCardProps {
  question: ListeningQuestion;
  questionNumber: number;
  selectedAnswer: AnswerOption | "";
  playCount: number;
  onPlay: () => void;
  onSelect: (value: AnswerOption) => void;
  disabled?: boolean;
}

const MAX_PLAYS = 2;

export default function ListeningQuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  playCount,
  onPlay,
  onSelect,
  disabled
}: ListeningQuestionCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useMemo(() => {
    if (!question.audio) return "";
    return `data:audio/wav;base64,${question.audio}`;
  }, [question.audio]);

  const remainingPlays = Math.max(0, MAX_PLAYS - playCount);

  const handlePlay = () => {
    if (!audioRef.current || remainingPlays <= 0) return;
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => undefined);
    onPlay();
  };

  return (
    <Card className="border-slate-200 shadow-soft">
      <CardHeader>
        <CardTitle className="text-slate-900">Question {questionNumber}</CardTitle>
        <CardDescription>
          Play the audio (max {MAX_PLAYS} plays) then answer the question.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm text-slate-700">Transcript</p>
          <p className="text-[1.02rem] leading-7 text-slate-900">{question.script}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handlePlay} disabled={!audioUrl || remainingPlays <= 0}>
              {remainingPlays > 0 ? `Play audio (${remainingPlays} left)` : "Play limit reached"}
            </Button>
            {audioUrl && (
              <audio ref={audioRef} src={audioUrl} preload="none" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">{question.question}</h3>
          <div className="mt-2 space-y-2">
            {question.options.map((option, index) => {
              const label = option.trim();
              const value = (["A", "B", "C", "D"][index] as AnswerOption) ?? "A";
              const isSelected = selectedAnswer === value;
              return (
                <label
                  key={`listening-${questionNumber}-${index}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
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
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
