"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearAuthToken, getAuthToken } from "@/lib/auth";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(Boolean(getAuthToken()));
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthed(false);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

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
          {isAuthed && (
            <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link href="/mock-exam" className="hover:text-slate-900">
                Mock Exam
              </Link>
              <Link href="/passage-analyzer" className="hover:text-slate-900">
                Passage Analyzer
              </Link>
              <Link href="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
            </nav>
          )}
          {!isAuthed ? (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Login
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
