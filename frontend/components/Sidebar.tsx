"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Headphones,
  Mic,
  PenSquare,
  Sparkles,
  ChevronRight
} from "lucide-react";

const groups = [
  {
    label: "Core",
    items: [
      { href: "/learn", label: "AI Learn", icon: Sparkles }
    ]
  },
  {
    label: "Modules",
    items: [
      { href: "/reading", label: "Reading", icon: BookOpen },
      { href: "/listening-exam", label: "Listening", icon: Headphones },
      { href: "/speaking", label: "Speaking", icon: Mic },
      { href: "/writing", label: "Writing", icon: PenSquare }
    ]
  },
  {
    label: "Analytics",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
    ]
  }
];

// Paths that belong to a parent nav item (for active highlighting)
const parentMap: Record<string, string> = {
  "/mock-exam": "/reading",
  "/passage-analyzer": "/reading"
};

export default function Sidebar() {
  const pathname = usePathname();
  const activePath = parentMap[pathname] ?? pathname;

  return (
    <aside className="hidden w-60 flex-col border-r border-slate-100 bg-white lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">
          T
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">TEF Trainer</p>
          <p className="text-xs text-slate-400">Canada B2</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activePath === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                      ${isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                      {item.label}
                    </div>
                    {isActive && <ChevronRight className="h-3 w-3 text-indigo-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-xs text-slate-400">Demo mode · All features active</p>
      </div>
    </aside>
  );
}
