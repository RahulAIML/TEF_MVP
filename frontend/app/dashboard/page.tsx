"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardSummary } from "@/services/api";
import { getAuthToken } from "@/lib/auth";
import type { DashboardSummaryResponse } from "@/types/dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) {
      return;
    }
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
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header subtitle="Track your progress and weakest areas" />
      <main className="container space-y-6 py-8">
        {loading && (
          <Card className="border-slate-200 shadow-soft">
            <CardContent className="p-6 text-sm text-slate-600">Loading summary...</CardContent>
          </Card>
        )}
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {summary && <DashboardStats summary={summary} />}
      </main>
    </div>
  );
}
