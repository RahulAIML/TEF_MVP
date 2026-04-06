"use client";

import { useMemo } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ScriptableContext
} from "chart.js";
import type { DashboardSummaryResponse, LearnSummary, ModuleExamSummary } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface DashboardChartsProps {
  summary: DashboardSummaryResponse;
}

const chartContainerClass = "h-60";

const buildLineDataset = (labels: string[], data: number[], color: string) => ({
  labels,
  datasets: [
    {
      label: "Accuracy %",
      data,
      borderColor: color,
      backgroundColor: (ctx: ScriptableContext<"line">) => {
        const chart = ctx.chart;
        const { ctx: canvasCtx, chartArea } = chart;
        if (!chartArea) return "rgba(79,70,229,0.2)";
        const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, color.replace("1)", "0.35)"));
        gradient.addColorStop(1, color.replace("1)", "0.05)"));
        return gradient;
      },
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointBackgroundColor: color
    }
  ]
});

const buildBarDataset = (labels: string[], data: number[], color: string, label: string) => ({
  labels,
  datasets: [
    {
      label,
      data,
      backgroundColor: color,
      borderRadius: 12,
      maxBarThickness: 36
    }
  ]
});

function SectionHeader({ title, subtitle, value }: { title: string; subtitle: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
        {value}
      </span>
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-60 items-center justify-center text-sm text-slate-500">
        No data yet.
      </CardContent>
    </Card>
  );
}

function buildExamCharts(summary: ModuleExamSummary, color: string, labelPrefix: string, maxScore: number) {
  const ordered = [...summary.recent_exams].reverse();
  const labels = ordered.map((exam) => `${labelPrefix} ${exam.id}`);
  const accuracyData = ordered.map((exam) => exam.accuracy);
  const scoreData = ordered.map((exam) => exam.score);

  return {
    labels,
    accuracyData,
    scoreData,
    lineDataset: buildLineDataset(labels, accuracyData, color),
    barDataset: buildBarDataset(labels, scoreData, color, "Score"),
    maxScore
  };
}

function LearnSection({ learning }: { learning: LearnSummary }) {
  if (learning.recent_sessions.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="AI Learning"
          subtitle="Sessions from the AI Learn module"
          value="No sessions yet"
        />
        <EmptyCard title="Learning Progress" />
      </div>
    );
  }

  const labels = [...learning.recent_sessions].reverse().map((s, i) => s.topic ?? `Session ${i + 1}`);
  const scores = [...learning.recent_sessions].reverse().map((s) => s.score ?? 0);
  const barDataset = buildBarDataset(labels, scores, "rgba(139,92,246,0.85)", "Score");

  return (
    <div className="space-y-4">
      <SectionHeader
        title="AI Learning"
        subtitle="Exercise scores and recent sessions"
        value={`Average score ${learning.average_score.toFixed(1)}/10`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Session Scores</CardTitle>
          </CardHeader>
          <CardContent className={chartContainerClass}>
            <Bar
              data={barDataset}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, max: 10, ticks: { stepSize: 2 } }
                }
              }}
            />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {learning.recent_sessions.map((s) => (
              <div key={`learn-${s.id}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{s.topic ?? "Untitled"}</p>
                  <p className="text-xs text-slate-500">
                    {s.level ?? "—"} · {s.exercises_completed}/{s.exercises_total} exercises · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-base font-semibold text-slate-900">
                  {s.score != null ? `${s.score.toFixed(1)}/10` : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardCharts({ summary }: DashboardChartsProps) {
  const readingCharts = useMemo(
    () => buildExamCharts(summary.reading, "rgba(79,70,229,1)", "Exam", 40),
    [summary.reading]
  );
  const listeningCharts = useMemo(
    () => buildExamCharts(summary.listening, "rgba(15,118,110,1)", "Attempt", 40),
    [summary.listening]
  );

  const writingLabels = summary.writing.recent_submissions.map((item) => `Submission ${item.id}`);
  const writingScores = summary.writing.recent_submissions.map((item) => item.average_score);
  const writingBar = useMemo(
    () => buildBarDataset(writingLabels, writingScores, "rgba(245,158,11,0.85)", "Average Score"),
    [writingLabels, writingScores]
  );

  const readingPieData = useMemo(() => {
    const weakestValue = Math.max(10, Math.round(100 - summary.reading.average_accuracy));
    const otherValue = Math.max(0, 100 - weakestValue);
    return [weakestValue, otherValue];
  }, [summary.reading.average_accuracy]);

  const pieDataset = useMemo(() => ({
    labels: [summary.reading.weakest_question_type ?? "Weakest", "Other Areas"],
    datasets: [
      {
        data: readingPieData,
        backgroundColor: ["#4f46e5", "#e2e8f0"],
        borderWidth: 0
      }
    ]
  }), [readingPieData, summary.reading.weakest_question_type]);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <SectionHeader
          title="Reading (Text)"
          subtitle="Mock exam accuracy, score history, and weakest areas"
          value={`Average accuracy ${summary.reading.average_accuracy.toFixed(1)}%`}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {readingCharts.labels.length === 0 ? (
            <>
              <EmptyCard title="Accuracy Trend" />
              <EmptyCard title="Score History" />
              <EmptyCard title="Weak Areas" />
            </>
          ) : (
            <>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Accuracy Trend</CardTitle>
                </CardHeader>
                <CardContent className={chartContainerClass}>
                  <Line
                    data={readingCharts.lineDataset}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { intersect: false } },
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Score History</CardTitle>
                </CardHeader>
                <CardContent className={chartContainerClass}>
                  <Bar
                    data={readingCharts.barDataset}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, max: readingCharts.maxScore, ticks: { stepSize: 10 } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Weak Areas</CardTitle>
                </CardHeader>
                <CardContent className="flex h-60 items-center justify-center">
                  <div className="w-full max-w-[260px]">
                    <Pie
                      data={pieDataset}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: "bottom" } }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader
          title="Listening (Voice)"
          subtitle="Accuracy and score tracking for listening exams"
          value={`Average accuracy ${summary.listening.average_accuracy.toFixed(1)}%`}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {listeningCharts.labels.length === 0 ? (
            <>
              <EmptyCard title="Accuracy Trend" />
              <EmptyCard title="Score History" />
            </>
          ) : (
            <>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Accuracy Trend</CardTitle>
                </CardHeader>
                <CardContent className={chartContainerClass}>
                  <Line
                    data={listeningCharts.lineDataset}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { intersect: false } },
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Score History</CardTitle>
                </CardHeader>
                <CardContent className={chartContainerClass}>
                  <Bar
                    data={listeningCharts.barDataset}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, max: listeningCharts.maxScore, ticks: { stepSize: 10 } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader
          title="Writing"
          subtitle="Average writing scores across recent submissions"
          value={`Average score ${summary.writing.average_score.toFixed(1)}/10`}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {writingLabels.length === 0 ? (
            <>
              <EmptyCard title="Writing Score Trend" />
              <EmptyCard title="Submission Summary" />
            </>
          ) : (
            <>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Writing Score Trend</CardTitle>
                </CardHeader>
                <CardContent className={chartContainerClass}>
                  <Bar
                    data={writingBar}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, max: 10, ticks: { stepSize: 2 } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Recent Writing Submissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  {summary.writing.recent_submissions.map((item) => (
                    <div key={`writing-${item.id}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">Submission {item.id}</p>
                        <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-base font-semibold text-slate-900">{item.average_score.toFixed(1)}/10</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <LearnSection learning={summary.learning} />
    </div>
  );
}

