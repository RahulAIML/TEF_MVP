"use client";

import Link from "next/link";
import { BookOpenCheck, FileSearch, ArrowRight, Clock, Target, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";

const modes = [
  {
    title: "Reading Mock Exam",
    description:
      "Simulate the full TEF Canada reading exam with all 5 question types, 40 questions, and a 60-minute countdown timer.",
    href: "/mock-exam",
    icon: BookOpenCheck,
    accent: "bg-violet-600",
    stats: [
      { icon: Clock, label: "60 minutes" },
      { icon: Target, label: "40 questions" },
      { icon: Zap, label: "5 question types" }
    ],
    cta: "Start Mock Exam"
  },
  {
    title: "Passage Analyzer",
    description:
      "Generate a French passage, read it at your own pace, look up words, get AI explanations, and take a 10-question quiz.",
    href: "/passage-analyzer",
    icon: FileSearch,
    accent: "bg-indigo-500",
    stats: [
      { icon: Target, label: "10 quiz questions" },
      { icon: Zap, label: "AI word lookup" },
      { icon: Clock, label: "No time limit" }
    ],
    cta: "Open Analyzer"
  }
];

export default function ReadingPage() {
  return (
    <AppShell
      title="Reading Module"
      subtitle="Choose a reading practice mode"
      backHref="/"
    >
      <div className="max-w-3xl space-y-6">
        {/* Intro banner */}
        <div className="rounded-2xl border border-violet-100 bg-violet-50 px-6 py-4">
          <p className="text-sm text-violet-800">
            <span className="font-semibold">TEF Reading</span> tests everyday documents, gap-fill sentences, rapid reading, administrative texts, and press articles — covering questions 1–40.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Card key={mode.href} className="group border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex flex-col gap-5 p-6">
                  {/* Header */}
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mode.accent} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">{mode.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{mode.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3">
                    {mode.stats.map(({ icon: StatIcon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                        <StatIcon className="h-3.5 w-3.5 text-slate-400" />
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link
                    href={mode.href}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl ${mode.accent} px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90`}
                  >
                    {mode.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
