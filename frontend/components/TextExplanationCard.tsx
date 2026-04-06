"use client";

import { useState } from "react";
import type { ExplainTextResponse } from "@/types/text-helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TextExplanationCardProps {
  entry: ExplainTextResponse;
}

export default function TextExplanationCard({ entry }: TextExplanationCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-900">Text Explanation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        <div>
          <p className="font-medium text-slate-900">Meaning</p>
          <p>{entry.meaning}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Explanation</p>
          <p>{entry.explanation}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900">Translation</p>
            <Button
              variant="outline"
              size="sm"
              className="h-auto px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800"
              onClick={() => setShowTranslation((p) => !p)}
            >
              {showTranslation ? "Hide" : "Show"}
            </Button>
          </div>
          {showTranslation && <p>{entry.translation}</p>}
        </div>
        <div>
          <p className="font-medium text-slate-900">Example</p>
          <p>{entry.example}</p>
        </div>
      </CardContent>
    </Card>
  );
}
