"use client";

import Link from "next/link";

import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
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
    description: "Practice listening comprehension with Gemini-generated audio MCQs.",
    href: "/listening-mock-exam"
  },
  {
    title: "Performance Dashboard",
    description: "Track accuracy, recent scores, and weakest areas.",
    href: "/dashboard"
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header subtitle="Choose a module to start training" />
      <main className="container space-y-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.title} className="border-slate-200 shadow-soft">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{module.description}</p>
                <Link
                  href={module.href}
                  className="mt-4 inline-flex text-sm font-medium text-slate-900 underline"
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
      </main>
    </div>
  );
}
