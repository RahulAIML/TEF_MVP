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
          {summary.average_accuracy}%
        </h3>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Recent Exams</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {summary.recent_exams.length === 0 ? (
            <p>No exams yet.</p>
          ) : (
            summary.recent_exams.map((exam) => (
              <div key={`exam-${exam.id}`} className="flex items-center justify-between">
                <span>Exam #{exam.id}</span>
                <span className="font-semibold text-slate-900">{exam.accuracy}%</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Weakest Area</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          {summary.weakest_question_type}
        </h3>
      </div>
    </div>
  );
}
