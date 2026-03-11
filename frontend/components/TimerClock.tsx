"use client";

import { useEffect, useMemo, useState } from "react";

interface TimerClockProps {
  durationSeconds: number;
  isActive: boolean;
  resetKey: number;
  onExpire?: () => void;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function TimerClock({
  durationSeconds,
  isActive,
  resetKey,
  onExpire
}: TimerClockProps) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds, resetKey]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (remaining <= 0) {
      onExpire?.();
      return;
    }

    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [isActive, remaining, onExpire]);

  const label = useMemo(() => formatTime(remaining), [remaining]);

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-400">Time Remaining</p>
      <p className={`text-base font-semibold ${remaining <= 60 ? "text-rose-600" : "text-slate-900"}`}>
        {label}
      </p>
    </div>
  );
}
