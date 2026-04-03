"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Headphones, PenSquare, Sparkles,
  TrendingUp, Target, AlertTriangle, CheckCircle2,
  RefreshCw, ArrowRight
} from "lucide-react";
import AppShell from "@/components/AppShell";
import DashboardCharts from "@/components/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/services/api";
import type { DashboardSummaryResponse } from "@/types/dashboard";

// ── helpers ────────────────────────────────────────────────────────────────
function scoreColor(val: number, max = 100) {
  const pct = (val / max) * 100;
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 50) return "text-amber-500";
  return "text-rose-500";
}

function ScoreBar({ value, max = 100, color = "bg-indigo-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Summary stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconBg }: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconBg} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Module score row ────────────────────────────────────────────────────────
function ModuleRow({ label, score, max, sessions, href, icon: Icon, barColor }: {
  label: string; score: number; max: number; sessions: number;
  href: string; icon: React.ComponentType<{ className?: string }>; barColor: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-xl p-3 transition hover:bg-slate-50">
      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className={`text-sm font-bold ${scoreColor(score, max)}`}>
            {score.toFixed(1)}{max === 10 ? "/10" : "%"}
          </span>
        </div>
        <ScoreBar value={score} max={max} color={barColor} />
        <p className="mt-1 text-xs text-slate-400">{sessions} session{sessions !== 1 ? "s" : ""}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition group-hover:text-slate-500" />
    </Link>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError("");
    try {
      setSummary(await getDashboardSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchSummary(); }, []);

  // Computed overview
  const overview = summary
    ? (() => {
        const r = summary.reading.average_accuracy;
        const l = summary.listening.average_accuracy;
        const w = summary.writing.average_score * 10;       // scale to %
        const le = (summary.learning.average_score ?? 0) * 10;
        const counts = [r, l, w, le].filter((v) => v > 0);
        const overall = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
        const totalSessions =
          summary.reading.recent_exams.length +
          summary.listening.recent_exams.length +
          summary.writing.recent_submissions.length +
          summary.learning.recent_sessions.length;
        const weakModules = [
          { label: "Reading", val: r },
          { label: "Listening", val: l },
          { label: "Writing", val: w },
          { label: "AI Learn", val: le }
        ].filter((m) => m.val > 0).sort((a, b) => a.val - b.val);
        return { overall, totalSessions, weakest: weakModules[0] ?? null };
      })()
    : null;

  return (
    <AppShell title="Dashboard" subtitle="Your progress at a glance">
      <div className="max-w-5xl space-y-8">

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {summary && overview && (
          <>
            {/* ── Summary stat cards ──────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Overall Score"
                value={`${overview.overall.toFixed(0)}%`}
                sub="Across all modules"
                icon={TrendingUp}
                iconBg="bg-indigo-600"
              />
              <StatCard
                label="Sessions"
                value={String(overview.totalSessions)}
                sub="Total practice sessions"
                icon={Target}
                iconBg="bg-violet-500"
              />
              <StatCard
                label="Reading Accuracy"
                value={`${summary.reading.average_accuracy.toFixed(1)}%`}
                sub={`${summary.reading.recent_exams.length} exam${summary.reading.recent_exams.length !== 1 ? "s" : ""}`}
                icon={BookOpen}
                iconBg="bg-sky-500"
              />
              <StatCard
                label="Weakest Area"
                value={overview.weakest?.label ?? "—"}
                sub={overview.weakest ? `${overview.weakest.val.toFixed(0)}% score` : "Keep practicing"}
                icon={AlertTriangle}
                iconBg="bg-amber-500"
              />
            </div>

            {/* ── Module scores + recommendations ─────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              {/* Module performance */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-900">Module Performance</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-slate-50">
                  <ModuleRow label="Reading" score={summary.reading.average_accuracy} max={100}
                    sessions={summary.reading.recent_exams.length} href="/reading"
                    icon={BookOpen} barColor="bg-violet-500" />
                  <ModuleRow label="Listening" score={summary.listening.average_accuracy} max={100}
                    sessions={summary.listening.recent_exams.length} href="/listening-exam"
                    icon={Headphones} barColor="bg-sky-500" />
                  <ModuleRow label="Writing" score={summary.writing.average_score} max={10}
                    sessions={summary.writing.recent_submissions.length} href="/writing"
                    icon={PenSquare} barColor="bg-amber-500" />
                  <ModuleRow label="AI Learn" score={summary.learning.average_score} max={10}
                    sessions={summary.learning.recent_sessions.length} href="/learn"
                    icon={Sparkles} barColor="bg-indigo-500" />
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-900">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.reading.weakest_question_type && summary.reading.weakest_question_type !== "Not enough data" && (
                    <div className="flex gap-3 rounded-xl bg-rose-50 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
                      <div>
                        <p className="text-xs font-semibold text-rose-700">Weak reading area</p>
                        <p className="text-xs text-rose-600 mt-0.5">{summary.reading.weakest_question_type}</p>
                      </div>
                    </div>
                  )}
                  {summary.reading.average_accuracy < 60 && (
                    <div className="flex gap-3 rounded-xl bg-amber-50 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                      <p className="text-xs text-amber-700">Reading accuracy below 60% — try the Passage Analyzer to build comprehension.</p>
                    </div>
                  )}
                  {summary.writing.average_score < 6 && summary.writing.recent_submissions.length > 0 && (
                    <div className="flex gap-3 rounded-xl bg-amber-50 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                      <p className="text-xs text-amber-700">Writing score under 6/10 — use AI Learn to practice sentence structure.</p>
                    </div>
                  )}
                  {summary.learning.recent_sessions.length === 0 && (
                    <div className="flex gap-3 rounded-xl bg-indigo-50 p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                      <p className="text-xs text-indigo-700">You have not tried AI Learn yet — paste any French text to generate personalised exercises.</p>
                    </div>
                  )}
                  {overview.overall >= 75 && (
                    <div className="flex gap-3 rounded-xl bg-emerald-50 p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <p className="text-xs text-emerald-700">Great overall score! Keep pushing with harder exam simulations.</p>
                    </div>
                  )}
                  {summary.reading.recent_exams.length === 0 &&
                   summary.listening.recent_exams.length === 0 &&
                   summary.writing.recent_submissions.length === 0 &&
                   summary.learning.recent_sessions.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Complete a module to see recommendations.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Detailed charts ──────────────────────────────────────────── */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Detailed Analytics</h2>
                <button
                  onClick={() => void fetchSummary()}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <DashboardCharts summary={summary} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
