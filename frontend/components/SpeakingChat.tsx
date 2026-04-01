"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ConversationMessage } from "@/types/speaking";

interface SpeakingChatProps {
  history: ConversationMessage[];
  isThinking?: boolean;
  currentTranscript?: string;
  exchangeCount?: number;
  maxExchanges?: number;
}

export default function SpeakingChat({
  history,
  isThinking,
  currentTranscript,
  exchangeCount,
  maxExchanges
}: SpeakingChatProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isThinking]);

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Conversation</h3>
          <div className="flex items-center gap-2">
            {maxExchanges !== undefined && exchangeCount !== undefined && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {exchangeCount}/{maxExchanges} exchanges
              </span>
            )}
            {isThinking && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                Examiner is responding...
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {history.length === 0 && !isThinking && (
            <p className="text-sm text-slate-500">Press Start — the examiner will speak first.</p>
          )}
          {history.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl px-4 py-3 text-sm ${
                message.role === "user"
                  ? "bg-slate-100 text-slate-900"
                  : "bg-indigo-50 text-slate-900"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-slate-400">
                {message.role === "user" ? "You" : "Examiner"}
              </p>
              <p className="mt-1 whitespace-pre-line">{message.content}</p>
            </div>
          ))}
          {isThinking && (
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-slate-500 italic">
              Examiner is responding...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {currentTranscript && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase text-slate-400">Last transcript</p>
            <p className="mt-1">{currentTranscript}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

