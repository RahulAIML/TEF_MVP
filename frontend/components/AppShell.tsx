"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <TopNav title={title} subtitle={subtitle} />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
