"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const PATH_LABELS: Record<string, string> = {
  "":                  "Home",
  "reading":           "Reading Module",
  "mock-exam":         "Mock Exam",
  "passage-analyzer":  "Passage Analyzer",
  "listening-exam":    "Listening Module",
  "speaking":          "Speaking Module",
  "writing":           "Writing Module",
  "learn":             "Practice Lab",
  "dashboard":         "Dashboard"
};

const PATH_HREFS: Record<string, string> = {
  "mock-exam":        "/reading",
  "passage-analyzer": "/reading"
};

export default function Breadcrumb() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  const crumbs = [
    { label: "Home", href: "/" },
    ...segments.map((seg, i) => {
      const href = "/" + segments.slice(0, i + 1).join("/");
      const parentHref = PATH_HREFS[seg];
      return {
        label: PATH_LABELS[seg] ?? seg,
        href: parentHref ?? href
      };
    })
  ];

  // Deduplicate consecutive identical hrefs
  const unique = crumbs.filter((c, i) => i === 0 || c.href !== crumbs[i - 1].href);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-6 py-2 text-xs text-slate-400 border-b border-slate-100 bg-white">
      {unique.map((crumb, i) => (
        <span key={crumb.href + i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          {i === 0 && <Home className="h-3 w-3" />}
          {i === unique.length - 1 ? (
            <span className="font-medium text-slate-600">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-indigo-600 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
