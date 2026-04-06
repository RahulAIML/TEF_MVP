"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import StudyAssistant from "@/components/GlobalAIChat";

interface AppShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
}

export default function AppShell({ title, subtitle, backHref, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopNav title={title} subtitle={subtitle} backHref={backHref} />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
      {/* Study assistant — available on every page */}
      <StudyAssistant />
    </div>
  );
}
