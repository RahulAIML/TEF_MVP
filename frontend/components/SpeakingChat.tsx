"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ConversationMessage } from "@/types/speaking";

interface SpeakingChatProps {
  history: ConversationMessage[];
  isThinking?: boolean;
  currentTranscript?: string;
}

export default function SpeakingChat({ history, isThinking, currentTranscript }: SpeakingChatProps) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Conversation</h3>
          {isThinking && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Examiner is thinking...
            </span>
          )}
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {history.length === 0 && (
            <p className="text-sm text-slate-500">Start speaking to begin the conversation.</p>
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

