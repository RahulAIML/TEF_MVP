"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReadingPanelProps {
  title: string;
  passage: string;
  onWordHighlight?: (word: string) => void;
}

function pickFirstWord(rawSelection: string): string {
  const cleaned = rawSelection
    .trim()
    .replace(/[.,!?;:()[\]{}"'`~<>«»]/g, " ")
    .split(/\s+/)
    .filter(Boolean)[0];

  return cleaned ?? "";
}

export default function ReadingPanel({
  title,
  passage,
  onWordHighlight
}: ReadingPanelProps) {
  const handleMouseUp = () => {
    const selection = window.getSelection()?.toString() ?? "";
    const chosenWord = pickFirstWord(selection);
    if (chosenWord && onWordHighlight) {
      onWordHighlight(chosenWord);
    }
  };

  return (
    <Card className="border-slate-200 shadow-soft">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <CardDescription>
          Select a word in the passage to auto-fill the helper on the right.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="max-h-[360px] overflow-y-auto rounded-md border border-slate-200 bg-slate-50/60 p-5 text-[1.02rem] leading-8 text-slate-800"
          onMouseUp={handleMouseUp}
        >
          {passage}
        </div>
      </CardContent>
    </Card>
  );
}
