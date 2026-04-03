"use client";

import Link from "next/link";

import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  {
    title: "AI Learn",
    description: "Paste text, upload a PDF or image — AI generates exercises and evaluates your answers.",
    href: "/learn",
    highlight: true
  },
  {
    title: "Reading Mock Exam",
    description: "Simulate the full TEF reading exam with 40 questions and a 60-minute timer.",
    href: "/mock-exam"
  },
  {
    title: "Passage Analyzer",
    description: "Generate a passage and use the Text Helper Tool for explanations.",
    href: "/passage-analyzer"
  },
  {
    title: "Listening Mock Exam",
    description: "Practice listening comprehension with ElevenLabs-generated audio MCQs.",
    href: "/listening-exam"
  },
  {
    title: "Speaking Module",
    description: "Interactive TEF speaking practice with real-time examiner responses.",
    href: "/speaking"
  },
  {
    title: "Writing Module",
    description: "Train Task 1 and Task 2 with guided steps or a full 60-minute exam simulation.",
    href: "/writing"
  },
  {
    title: "Performance Dashboard",
    description: "Track accuracy, recent scores, and weakest areas.",
    href: "/dashboard"
  }
];

export default function HomePage() {
  return (
    <AppShell title="Home" subtitle="Choose a module to start training">
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {modules.map((module) => (
            <Card
              key={module.title}
              className={`border-slate-200 shadow-sm ${
                "highlight" in module && module.highlight
                  ? "border-slate-800 bg-slate-800 text-white"
                  : ""
              }`}
            >
              <CardContent className="p-6">
                <h3 className={`text-lg font-semibold ${"highlight" in module && module.highlight ? "text-white" : "text-slate-900"}`}>
                  {module.title}
                </h3>
                <p className={`mt-2 text-sm ${"highlight" in module && module.highlight ? "text-slate-300" : "text-slate-600"}`}>
                  {module.description}
                </p>
                <Link
                  href={module.href}
                  className={`mt-4 inline-flex text-sm font-medium underline ${"highlight" in module && module.highlight ? "text-white" : "text-slate-900"}`}
                >
                  Open module
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Demo mode: login is disabled for now.
        </p>
      </div>
    </AppShell>
  );
}

