"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface TopNavProps {
  title: string;
  subtitle?: string;
  backHref?: string;
}

export default function TopNav({ title, subtitle, backHref }: TopNavProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-white px-6 py-4">
      {backHref && (
        <button
          onClick={() => router.push(backHref)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
