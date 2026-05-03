"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LatexRenderer } from "@/components/LatexRenderer";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
};

type ApiResponse = {
  message?: string;
  error?: string;
  limitReached?: boolean;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm AcerBot 🤖 I can help you with subject questions and navigating EthioAcers. What do you need help with?",
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  "Explain photosynthesis",
  "How do I use flashcards?",
  "Solve a quadratic equation",
];

function formatTime(value: string): string {
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingDots() {
  return (
    <div className="inline-flex items-center gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}

export function AIAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hidden = pathname === "/login" || pathname === "/signup";
  const hasOnlyWelcome = messages.length <= 1;

  const contextMessages = useMemo(() => {
    return messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending, open]);

  function clearChat() {
    setMessages([WELCOME_MESSAGE]);
    setLimitMessage(null);
    setUnread(0);
    setInput("");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content: clean,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage].slice(-20);
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setLimitMessage(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: contextMessages,
        }),
      });
      const payload = (await res.json()) as ApiResponse;

      if (!res.ok) {
        const textMsg =
          payload.message ??
          payload.error ??
          "Sorry, I couldn't answer right now. Please try again.";
        if (payload.limitReached) {
          setLimitMessage(textMsg);
        } else {
          const errMessage: ChatMessage = {
            id: `${Date.now()}-err`,
            role: "assistant",
            content: textMsg,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMessage].slice(-20));
          if (!open) setUnread((u) => u + 1);
        }
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-a`,
        role: "assistant",
        content: payload.message ?? "I couldn't generate a response.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage].slice(-20));
      if (!open) setUnread((u) => u + 1);
    } catch {
      const errMessage: ChatMessage = {
        id: `${Date.now()}-err`,
        role: "assistant",
        content: "Network issue. Please check your connection and try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMessage].slice(-20));
      if (!open) setUnread((u) => u + 1);
    } finally {
      setSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }

  if (hidden) return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close AI panel"
          className="fixed inset-0 z-[139] bg-black/65 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed right-0 top-0 z-[140] h-screen w-[85vw] max-w-[85vw] border-l border-gold/25 bg-background/95 shadow-2xl transition-transform duration-300 md:top-auto md:bottom-8 md:right-6 md:h-[70vh] md:max-h-[640px] md:w-[380px] md:max-w-[380px] md:rounded-2xl md:border md:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.65)]",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                🤖
              </span>
              <div>
                <p className="text-sm font-semibold text-gold">AI Tutor</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                🗑
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {hasOnlyWelcome && (
              <div className="space-y-2 rounded-xl border border-gold/20 bg-card/60 p-3">
                <p className="text-xs text-muted-foreground">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-gold transition-colors hover:bg-gold/20"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-3 py-2",
                      isUser
                        ? "rounded-br-md bg-gold text-black"
                        : "rounded-bl-md border border-border/60 bg-card/80 text-foreground",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      <LatexRenderer text={m.content} />
                    </div>
                    <p
                      className={[
                        "mt-1 text-[10px]",
                        isUser ? "text-black/70" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {formatTime(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-border/60 bg-card/80 px-3 py-2">
                  <TypingDots />
                </div>
              </div>
            )}

            {limitMessage && (
              <div className="rounded-xl border border-gold/35 bg-gold/10 p-3">
                <p className="text-sm text-gold">{limitMessage}</p>
                <Link
                  href="/pricing"
                  className="mt-2 inline-flex rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                >
                  View Plans
                </Link>
              </div>
            )}
          </div>

          <form
            className="border-t border-gold/20 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="h-10 flex-1 rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none ring-0 transition-colors focus:border-gold/55"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-black shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send message"
              >
                {sending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                ) : (
                  <span aria-hidden>➤</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI tutor assistant"
        className="fixed bottom-24 right-4 z-[130] inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl text-black shadow-[0_10px_28px_-10px_rgba(0,0,0,0.7)] ring-2 ring-gold/50 transition-transform hover:scale-105 md:bottom-8 md:right-6"
      >
        <span className="animate-bounce">🤖</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
