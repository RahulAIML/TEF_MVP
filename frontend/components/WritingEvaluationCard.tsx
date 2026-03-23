"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WritingEvaluationResponse } from "@/types/writing";

interface WritingEvaluationCardProps {
  title: string;
  evaluation: WritingEvaluationResponse;
}

export default function WritingEvaluationCard({ title, evaluation }: WritingEvaluationCardProps) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-500">Level: {evaluation.level}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Structure</p>
            <p className="text-lg font-semibold text-slate-900">{evaluation.scores.structure}/10</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Grammar</p>
            <p className="text-lg font-semibold text-slate-900">{evaluation.scores.grammar}/10</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Coherence</p>
            <p className="text-lg font-semibold text-slate-900">{evaluation.scores.coherence}/10</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Vocabulary</p>
            <p className="text-lg font-semibold text-slate-900">{evaluation.scores.vocab}/10</p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-slate-900">Feedback</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {evaluation.feedback.map((item, index) => (
              <li key={`${title}-fb-${index}`}>{item}</li>
            ))}
          </ul>
        </div>

        {evaluation.improved_version && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-400">Improved version</p>
            <p className="mt-2 whitespace-pre-line text-slate-700">{evaluation.improved_version}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

