"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0].trim();
          const code = lines.slice(1).join("\n");
          return (
            <pre key={i} className="bg-black/40 border border-white/10 rounded-xl p-4 my-3 overflow-x-auto">
              {lang && (
                <div className="text-xs text-pink-400 mb-2 font-mono uppercase tracking-wider">
                  {lang}
                </div>
              )}
              <code className="text-sm text-green-300 font-mono whitespace-pre">
                {code}
              </code>
            </pre>
          );
        }

        return (
          <span key={i}>
            {part.split(/(`[^`]+`)/g).map((chunk, j) => {
              if (chunk.startsWith("`") && chunk.endsWith("`")) {
                return (
                  <code key={j} className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-pink-300 font-mono text-sm">
                    {chunk.slice(1, -1)}
                  </code>
                );
              }
              return (
                <span
                  key={j}
                  dangerouslySetInnerHTML={{
                    __html: chunk
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              );
            })}
          </span>
        );
      })}
    </>
  );
}

const SUGGESTIONS = [
  "Build a to-do app in React",
  "Explain how APIs work",
  "Create a Python web scraper",
  "How does JWT auth work?",
  "Build a landing page from scratch",
  "Learn SQL with examples",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (res.status === 429) {
        setMessages([...newMessages, { role: "assistant", content: "You've hit the hourly limit (20 messages). Come back in a bit!" }]);
        setStreamingText("");
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }

      setMessages([...newMessages, { role: "assistant", content: fullText }]);
      setStreamingText("");
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Something went wrong. Check your API key and try again." },
      ]);
      setStreamingText("");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0 && !streamingText;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-white/5">
        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          hotgirlscode.codes
        </span>
        <span className="text-xs text-white/25">powered by Claude</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 pb-4">
        {/* Hero */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-6">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-pink-600/8 rounded-full blur-[120px] pointer-events-none" />

            <h1 className="relative text-5xl sm:text-7xl font-black tracking-tighter leading-none">
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                Hot Girls
              </span>
              <br />
              <span className="text-white">Code.</span>
            </h1>

            <p className="text-white/45 text-lg max-w-xs leading-relaxed">
              Tell me what you want to build or learn — I&apos;ll walk you through it step by step.
            </p>

            <div className="flex flex-wrap gap-2 justify-center max-w-lg mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-sm px-3 py-1.5 rounded-full border border-white/10 text-white/55 hover:border-pink-500/40 hover:text-pink-300 hover:bg-pink-500/5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {!isEmpty && (
          <div className="flex-1 py-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0 mt-1 flex items-center justify-center text-xs font-bold">
                    ✦
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white/8 border border-white/10 text-white/90"
                    : "text-white/85"
                }`}>
                  {msg.role === "assistant" ? (
                    <MarkdownText text={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {streamingText && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0 mt-1 flex items-center justify-center text-xs font-bold animate-pulse">
                  ✦
                </div>
                <div className="max-w-[85%] text-sm text-white/85 leading-relaxed">
                  <MarkdownText text={streamingText} />
                  <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                </div>
              </div>
            )}

            {isLoading && !streamingText && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold animate-pulse">
                  ✦
                </div>
                <div className="flex items-center gap-1 pt-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className={`sticky bottom-0 pt-4 pb-2 ${!isEmpty ? "bg-gradient-to-t from-[#080808] via-[#080808]/95 to-transparent" : ""}`}>
          {!isEmpty && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="text-xs px-2.5 py-1 rounded-full border border-white/8 text-white/35 hover:border-pink-500/30 hover:text-pink-300 transition-all disabled:opacity-30"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-white/10 bg-white/4 focus-within:border-pink-500/40 focus-within:bg-white/5 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to build or learn?"
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent px-4 py-3.5 pr-14 text-sm text-white placeholder-white/25 resize-none outline-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22 11 13 2 9l20-7z" />
                </svg>
              </button>
            </div>
            <p className="text-center text-white/18 text-xs mt-2">
              Enter to send · Shift+Enter for new line
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
