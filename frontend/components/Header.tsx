"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface HeaderProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function Header({ isGenerating, onGenerate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            TEF Reading Practice
          </h1>
          <p className="text-sm text-muted-foreground">
            B2 reading comprehension with instant feedback
          </p>
        </div>
        <Button onClick={onGenerate} disabled={isGenerating} size="lg">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Reading Exercise"
          )}
        </Button>
      </div>
    </header>
  );
}
