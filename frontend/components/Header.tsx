"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {title ?? "TEF Reading Trainer"}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/mock-exam" className="hover:text-slate-900">
              Reading Exam
            </Link>
            <Link href="/listening-exam" className="hover:text-slate-900">
              Listening Exam
            </Link>
            <Link href="/passage-analyzer" className="hover:text-slate-900">
              Passage Analyzer
            </Link>
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
          </nav>
          <Button asChild size="sm" variant="secondary">
            <Link href="/listening-exam">Start Training</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
