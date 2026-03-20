"use client";

import { useMemo } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler, type ScriptableContext } from "chart.js";
import type { DashboardSummaryResponse } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface DashboardChartsProps {
  summary: DashboardSummaryResponse;
}

const chartContainerClass = "h-64";

export default function DashboardCharts({ summary }: DashboardChartsProps) {
  const recentLabels = summary.recent_exams.map((exam) => `Exam ${exam.id}`);
  const accuracyData = summary.recent_exams.map((exam) => exam.accuracy);
  const scoreData = summary.recent_exams.map((exam) => exam.score);

  const pieData = useMemo(() => {
    const weakestValue = Math.max(10, Math.round(100 - summary.average_accuracy));
    const otherValue = Math.max(0, 100 - weakestValue);
    return [weakestValue, otherValue];
  }, [summary.average_accuracy]);

  const lineDataset = useMemo(() => ({
    labels: recentLabels,
    datasets: [
      {
        label: "Accuracy %",
        data: accuracyData,
        borderColor: "#4f46e5",
        backgroundColor: (ctx: ScriptableContext<"line">) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return "rgba(79,70,229,0.2)";
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(79,70,229,0.35)");
          gradient.addColorStop(1, "rgba(79,70,229,0.05)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#4f46e5"
      }
    ]
  }), [recentLabels, accuracyData]);

  const barDataset = useMemo(() => ({
    labels: recentLabels,
    datasets: [
      {
        label: "Score",
        data: scoreData,
        backgroundColor: "rgba(79,70,229,0.8)",
        borderRadius: 12,
        maxBarThickness: 36
      }
    ]
  }), [recentLabels, scoreData]);

  const pieDataset = useMemo(() => ({
    labels: [summary.weakest_question_type, "Other Areas"],
    datasets: [
      {
        data: pieData,
        backgroundColor: ["#4f46e5", "#e2e8f0"],
        borderWidth: 0
      }
    ]
  }), [pieData, summary.weakest_question_type]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent className={chartContainerClass}>
          <Line
            data={lineDataset}
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
            data={barDataset}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
              }
            }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Weak Areas</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
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
    </div>
  );
}
