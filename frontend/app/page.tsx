"use client";

import Link from "next/link";
import { Sparkles, BookOpen, Headphones, Mic, PenSquare, LayoutDashboard, ArrowRight } from "lucide-react";
import AppShell from "@/components/AppShell";

const modules = [
  {
    group: "AI-Powered",
    items: [
      {
        title: "AI Learn",
        description: "Paste any text or upload a PDF — AI generates exercises, evaluates all 5 answers at once, and tracks your progress.",
        href: "/learn",
        icon: Sparkles,
        accent: "bg-indigo-600",
        badge: "New"
      }
    ]
  },
  {
    group: "TEF Modules",
    items: [
      {
        title: "Reading Module",
        description: "40-question mock exam across 5 sections + Passage Analyzer with AI text explanations and TTS.",
        href: "/reading",
        icon: BookOpen,
        accent: "bg-violet-500"
      },
      {
        title: "Listening Module",
        description: "AI-generated audio MCQs with ElevenLabs voice synthesis. Practice and exam modes.",
        href: "/listening-exam",
        icon: Headphones,
        accent: "bg-sky-500"
      },
      {
        title: "Speaking Module",
        description: "Live conversation with an AI examiner. Hands-free (auto silence detection) or manual mode.",
        href: "/speaking",
        icon: Mic,
        accent: "bg-rose-500"
      },
      {
        title: "Writing Module",
        description: "Guided Task 1 & 2 practice with step-by-step AI feedback on grammar, structure, and coherence.",
        href: "/writing",
        icon: PenSquare,
        accent: "bg-amber-500"
      }
    ]
  },
  {
    group: "Analytics",
    items: [
      {
        title: "Dashboard",
        description: "Track accuracy trends, section-wise scores, weak areas, and personalized improvement tips.",
        href: "/dashboard",
        icon: LayoutDashboard,
        accent: "bg-emerald-500"
      }
    ]
  }
];

export default function HomePage() {
  return (
    <AppShell title="TEF Canada Trainer" subtitle="Choose a module to start training">
      <div className="space-y-10 max-w-5xl">
        {modules.map((group) => (
          <div key={group.group}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {group.group}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.accent} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {"badge" in mod && mod.badge && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                          {mod.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{mod.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{mod.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-indigo-600">
                      Open module
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-xs text-slate-400">Demo mode — login disabled, all features active.</p>
      </div>
    </AppShell>
  );
}
