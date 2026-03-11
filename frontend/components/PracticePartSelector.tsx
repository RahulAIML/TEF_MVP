"use client";

import { Button } from "@/components/ui/button";
import type { ReadingPart } from "@/types/reading";

interface PracticePartSelectorProps {
  part: ReadingPart;
  onChange: (part: ReadingPart) => void;
}

export default function PracticePartSelector({ part, onChange }: PracticePartSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800">Select Reading Part</p>
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3].map((value) => (
          <Button
            key={value}
            variant={part === value ? "default" : "outline"}
            onClick={() => onChange(value as ReadingPart)}
          >
            Part {value}
          </Button>
        ))}
      </div>
    </div>
  );
}
