"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ExamContainerProps {
  currentQuestion: number;
  totalQuestions: number;
  timer: ReactNode;
  children: ReactNode;
}

export default function ExamContainer({
  currentQuestion,
  totalQuestions,
  timer,
  children
}: ExamContainerProps) {
  return (
    <Card className="border-slate-200 shadow-soft">
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">TEF Reading Mock Exam</p>
          <h2 className="text-xl font-semibold text-slate-900">
            Question {currentQuestion} / {totalQuestions}
          </h2>
        </div>
        {timer}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
