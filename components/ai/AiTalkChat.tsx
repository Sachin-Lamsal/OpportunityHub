"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { sendAiTalkMessage } from "@/lib/actions/ai";
import type { ChatTurn } from "@/lib/ai/prompts";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import AITokenBadge from "@/components/ai/AITokenBadge";

const SUGGESTED_QUESTIONS = [
  "How balanced is my extracurricular portfolio?",
  "What activities should I focus on for my target universities?",
  "Ideas for a student leadership or community project in Nepal",
  "How can I turn my existing activities into compelling CV bullets?",
];

export default function AiTalkChat() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || isPending) return;

    const nextHistory: ChatTurn[] = [...messages, { role: "user", text }];
    setMessages(nextHistory);
    setInput("");
    setStatusNote(null);

    startTransition(async () => {
      const result = await sendAiTalkMessage(messages, text);
      setMessages([
        ...nextHistory,
        { role: "model", text: result.reply },
      ]);

      if (result.tierLabel) {
        setStatusNote(`Answered by ${result.tierLabel}`);
      } else if (result.source === "fallback") {
        setStatusNote("Offline rule-based advisor response");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function resetChat() {
    setMessages([]);
    setStatusNote(null);
  }

  return (
    <Card className="flex flex-col h-[650px] p-0 overflow-hidden border-slate-200 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-semibold text-slate-900">
              AI Student Advisor
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Interactive mentorship on extracurriculars, college prep, and portfolio building.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetChat}
              disabled={isPending}
            >
              New topic
            </Button>
          )}
        </div>
      </div>

      {/* Usage Bar */}
      <div className="border-b border-slate-100 bg-white px-4 py-2 sm:px-6">
        <AITokenBadge />
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-8">
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold shadow-sm">
              💬
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-800">
              Talk directly with your admissions advisor
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Ask about portfolio gaps, competitive activities for your dream universities, or how to develop impactful projects in Nepal.
            </p>

            <div className="mt-6 w-full space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider text-left px-1">
                Suggested questions:
              </p>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isPending}
                  className="w-full text-left text-xs bg-white hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl p-2.5 text-slate-700 transition shadow-2xs"
                >
                  💡 {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-2xs ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                    }`}
                  >
                    {!isUser && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 mb-1">
                        AI Advisor
                      </p>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              );
            })}

            {isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 text-sm text-slate-500 shadow-2xs flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                  </span>
                  <span>Reviewing your portfolio profile…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Status note */}
      {statusNote && (
        <div className="px-4 py-1.5 bg-slate-100 text-[11px] text-slate-500 border-t border-slate-200 text-center">
          {statusNote}
        </div>
      )}

      {/* Input Form */}
      <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your portfolio or extracurriculars… (Shift+Enter for new line)"
            rows={2}
            disabled={isPending}
            className="flex-1 resize-none rounded-xl border border-slate-200 p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
          />
          <Button
            type="submit"
            size="md"
            disabled={isPending || !input.trim()}
            className="h-10 px-4 shrink-0"
          >
            {isPending ? "Sending…" : "Send"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
