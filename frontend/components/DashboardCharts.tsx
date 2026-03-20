"use client";

import { Line, Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import type { DashboardSummaryResponse } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

interface DashboardChartsProps {
  summary: DashboardSummaryResponse;
}

export default function DashboardCharts({ summary }: DashboardChartsProps) {
  const recentLabels = summary.recent_exams.map((exam) => `Exam ${exam.id}`);
  const accuracyData = summary.recent_exams.map((exam) => exam.accuracy);
  const scoreData = summary.recent_exams.map((exam) => exam.score);

  const weakestValue = Math.max(10, Math.round(100 - summary.average_accuracy));
  const otherValue = Math.max(0, 100 - weakestValue);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Line
            data={{
              labels: recentLabels,
              datasets: [
                {
                  label: "Accuracy %",
                  data: accuracyData,
                  borderColor: "#4f46e5",
                  backgroundColor: "rgba(79,70,229,0.2)",
                  tension: 0.4
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, max: 100 } }
            }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Score History</CardTitle>
        </CardHeader>
        <CardContent>
          <Bar
            data={{
              labels: recentLabels,
              datasets: [
                {
                  label: "Score",
                  data: scoreData,
                  backgroundColor: "rgba(79,70,229,0.6)",
                  borderRadius: 8
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Weak Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <Pie
            data={{
              labels: [summary.weakest_question_type, "Other Areas"],
              datasets: [
                {
                  data: [weakestValue, otherValue],
                  backgroundColor: ["#4f46e5", "#e2e8f0"]
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: { legend: { position: "bottom" } }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
