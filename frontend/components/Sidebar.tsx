"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpenCheck, Headphones, FileText, PenSquare } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mock-exam", label: "Reading Mock Exam", icon: BookOpenCheck },
  { href: "/listening-exam", label: "Listening Practice", icon: Headphones },
  { href: "/writing", label: "Writing Module", icon: PenSquare },
  { href: "/passage-analyzer", label: "Passage Analyzer", icon: FileText }
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-6 lg:flex">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">TEF Trainer</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Learning Hub</h2>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

