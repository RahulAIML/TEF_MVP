"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import DashboardCharts from "@/components/DashboardCharts";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardSummary } from "@/services/api";
import type { DashboardSummaryResponse } from "@/types/dashboard";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getDashboardSummary();
        setSummary(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    void fetchSummary();
  }, []);

  return (
    <AppShell title="Dashboard" subtitle="Track your progress and weakest areas">
      <div className="space-y-6">
        {loading && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 text-sm text-slate-600">Loading summary...</CardContent>
          </Card>
        )}
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {summary && <DashboardCharts summary={summary} />}
      </div>
    </AppShell>
  );
}
