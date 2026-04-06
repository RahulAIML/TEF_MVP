"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, X, Send, Loader2, Volume2, VolumeX, Globe } from "lucide-react";
import { chatWithAI } from "@/services/api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

function speakText(text: string, onEnd: () => void): void {
  if (!("speechSynthesis" in window)) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frVoice) utt.voice = frVoice;
  utt.rate = 0.9;
  utt.onend = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

const QUICK_ACTIONS = [
  { label: "Translate to English", prompt: "Translate this to English: " },
  { label: "Explain this phrase", prompt: "Explain the meaning of: " },
  { label: "Grammar help", prompt: "Explain the grammar rule for: " },
  { label: "Example sentences", prompt: "Give 3 example sentences using: " }
];

export default function StudyAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Stop any TTS in progress
  const stopAudio = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Stop TTS when panel is closed
  useEffect(() => {
    if (!open) stopAudio();
  }, [open, stopAudio]);

  const handleListen = useCallback((text: string) => {
    stopAudio();
    setIsSpeaking(true);
    speakText(text, () => setIsSpeaking(false));
  }, [stopAudio]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await chatWithAI({ message: trimmed, context });
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Unable to process your request. Please try again." }
      ]);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [loading, context, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close Study Assistant" : "Open Study Assistant"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 transition-all duration-200 hover:bg-indigo-700 hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-indigo-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <HelpCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Study Assistant</p>
                <p className="text-[10px] text-indigo-200">Translate · Explain · Practise</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Stop audio button — visible while TTS is playing */}
              {isSpeaking && (
                <button
                  onClick={stopAudio}
                  title="Stop audio"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-white bg-white/20 hover:bg-white/30"
                >
                  <VolumeX className="h-3.5 w-3.5" /> Stop
                </button>
              )}
              <button
                onClick={() => setShowContext((p) => !p)}
                title="Add passage context"
                className="rounded-lg p-1 text-indigo-200 hover:bg-white/10 hover:text-white"
              >
                <Globe className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Context input */}
          {showContext && (
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
                Paste passage or text for context (optional)
              </p>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Paste a passage here so the assistant can answer questions about it..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => setInput(a.prompt)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">
                Ask anything — translate French, explain grammar, or get study tips.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => handleListen(msg.text)}
                    disabled={isSpeaking}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 disabled:opacity-40"
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="h-3 w-3" /> Listen
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question in English or French…"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
