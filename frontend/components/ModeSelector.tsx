"use client";

import { Button } from "@/components/ui/button";
import type { ReadingMode } from "@/types/reading";

interface ModeSelectorProps {
  mode: ReadingMode;
  onChange: (mode: ReadingMode) => void;
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800">Choose Mode</p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant={mode === "exam" ? "default" : "outline"}
          onClick={() => onChange("exam")}
        >
          Full Reading Exam
        </Button>
        <Button
          variant={mode === "practice" ? "default" : "outline"}
          onClick={() => onChange("practice")}
        >
          Practice Reading Section
        </Button>
      </div>
    </div>
  );
}
