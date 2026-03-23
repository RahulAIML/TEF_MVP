"use client";

import type { DashboardSummaryResponse } from "@/types/dashboard";

interface DashboardStatsProps {
  summary: DashboardSummaryResponse;
}

export default function DashboardStats({ summary }: DashboardStatsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Reading Accuracy</p>
        <h3 className="mt-2 text-3xl font-semibold text-slate-900">
          {summary.reading.average_accuracy.toFixed(1)}%
        </h3>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Listening Accuracy</p>
        <h3 className="mt-2 text-3xl font-semibold text-slate-900">
          {summary.listening.average_accuracy.toFixed(1)}%
        </h3>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Writing Score</p>
        <h3 className="mt-2 text-3xl font-semibold text-slate-900">
          {summary.writing.average_score.toFixed(1)}/10
        </h3>
      </div>
    </div>
  );
}

