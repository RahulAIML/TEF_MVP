"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReadingExamContainerProps {
  part: number;
  totalParts: number;
  timer: ReactNode;
  children: ReactNode;
}

export default function ReadingExamContainer({
  part,
  totalParts,
  timer,
  children
}: ReadingExamContainerProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-slate-900">Reading Exam</CardTitle>
          <p className="text-sm text-slate-500">Part {part} / {totalParts}</p>
        </div>
        {timer}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
