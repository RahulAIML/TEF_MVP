"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReadingPanelProps {
  title: string;
  passage: string;
  onTextHighlight?: (text: string) => void;
}

function normalizeSelection(rawSelection: string): string {
  return rawSelection.replace(/\s+/g, " ").trim();
}

export default function ReadingPanel({
  title,
  passage,
  onTextHighlight
}: ReadingPanelProps) {
  const handleMouseUp = () => {
    const selection = window.getSelection()?.toString() ?? "";
    const chosenText = normalizeSelection(selection);
    if (chosenText && onTextHighlight) {
      onTextHighlight(chosenText);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <CardDescription>
          Select text in the passage to auto-fill the helper on the right.
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
