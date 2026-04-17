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
            <pre key={i} className="bg-stone-100 border border-stone-200 rounded-xl p-4 my-3 overflow-x-auto">
              {lang && (
                <div className="text-xs text-pink-500 mb-2 font-mono uppercase tracking-wider">{lang}</div>
              )}
              <code className="text-sm text-stone-800 font-mono whitespace-pre">{code}</code>
            </pre>
          );
        }
        return (
          <span key={i}>
            {part.split(/(`[^`]+`)/g).map((chunk, j) => {
              if (chunk.startsWith("`") && chunk.endsWith("`")) {
                return (
                  <code key={j} className="bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5 text-pink-600 font-mono text-sm">
                    {chunk.slice(1, -1)}
                  </code>
                );
              }
              return (
                <span key={j} dangerouslySetInnerHTML={{
                  __html: chunk
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br/>"),
                }} />
              );
            })}
          </span>
        );
      })}
    </>
  );
}

const TICKER_ITEMS = [
  "Megan Thee Stallion has a CS degree",
  "A graph is just a spreadsheet",
  "An algorithm is just a recipe",
  "Women couldn't have credit cards until 1974",
  "The gap is cultural, not intellectual",
  "AI means anyone can build anything",
  "You were always technical enough",
];

const MANIFESTO = [
  {
    num: "01",
    text: "The gender gap in tech is a cultural artifact, not a fact of nature. Women were literally blocked from financial independence until 1974.",
  },
  {
    num: "02",
    text: 'Being \u201ctechnical\u201d is a skill you learn, not a trait you\'re born with. Nobody came out of the womb knowing Python.',
  },
  {
    num: "03",
    text: "With AI, the bar has never been lower. If you can describe it, you can build it. That's not an exaggeration.",
  },
  {
    num: "04",
    text: "The boys' club exists because of a 50-year head start in encouragement. Not because they're better at math. You beat them in 4th grade and you know it.",
  },
];

const DEMO = {
  user: "I want to build an app where people can vote on where to eat with their friends",
  assistant: `Yes — and this is genuinely a great idea because group dinner decisions are a real pain point that nobody has solved elegantly for friend groups.

What you're building is called a voting app — think of it like a group poll, but for restaurants. Here's how you'd actually make it:

**Step 1**
Start with a simple webpage that lets one person add restaurant options. Think of it like a Google Form, but you're the one building it.

**Step 2**
Add a shareable link so friends can click in and vote. This is just a URL — the same way you share a Google Doc.

**Step 3**
Show the results live. A bar chart is just numbers displayed as rectangles — nothing scary about that.

You could have a working version of this in a weekend. Seriously.`,
};

const DEMO_CHIPS = [
  "How long will this take?",
  "What tools do I need?",
  "Break step 1 down more",
];

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
  const [showChat, setShowChat] = useState(false);
  const manifestoRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function handleBuildClick() {
    setShowChat(true);
    setTimeout(() => {
      toolRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }, 100);
  }

  function handleManifestoClick() {
    manifestoRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    if (!showChat) setShowChat(true);

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    setTimeout(() => {
      toolRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

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
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Check your API key and try again." }]);
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

  return (
    <div className="min-h-screen bg-[#f5f0eb] text-stone-900 flex flex-col">

      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-stone-200">
        <div className="text-lg font-semibold tracking-tight">
          hot girls <span className="text-pink-500 italic">code</span>
        </div>
        <nav className="flex items-center gap-8 text-sm text-stone-500">
          <button onClick={handleManifestoClick} className="hover:text-stone-900 transition-colors">about</button>
          <button onClick={handleBuildClick} className="hover:text-stone-900 transition-colors">build something</button>
          <a href="#" className="hover:text-stone-900 transition-colors">community</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-pink-500 uppercase">
          The hot girl walk, but make it tech
        </p>

        <h1 className="text-5xl sm:text-7xl font-bold leading-tight max-w-3xl">
          Hot girls <em className="text-pink-500 not-italic font-bold">always</em> could code.
          <br />Nobody told them.
        </h1>

        <p className="text-stone-500 text-lg max-w-xl leading-relaxed">
          Someone told you you&apos;re not technical enough. They were wrong, and we&apos;re going to prove it — one idea at a time. Type what you want to build. We&apos;ll show you how.
        </p>

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleBuildClick}
            className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Build something now
          </button>
          <button
            onClick={handleManifestoClick}
            className="px-6 py-3 border border-stone-300 text-stone-700 rounded-full text-sm font-medium hover:border-stone-500 transition-colors"
          >
            Read the manifesto
          </button>
        </div>
      </section>

      {/* Ticker */}
      <div className="border-y border-stone-200 py-3 overflow-hidden bg-[#f5f0eb]">
        <div className="flex gap-10 animate-marquee whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="text-sm text-stone-400 font-medium flex-shrink-0">
              {item} <span className="text-pink-300">✳</span>
            </span>
          ))}
        </div>
      </div>

      {/* Manifesto */}
      <section ref={manifestoRef} className="border-b border-stone-200 bg-[#f5f0eb] px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] text-pink-500 uppercase mb-12">
            things that are actually true
          </p>
          <div className="space-y-10">
            {MANIFESTO.map(({ num, text }) => (
              <div key={num} className="flex gap-8 items-start">
                <span className="text-4xl font-bold text-stone-200 leading-none flex-shrink-0 w-12">{num}</span>
                <p className="text-stone-700 text-lg leading-relaxed pt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Tool */}
      <section ref={toolRef} className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-pink-500 uppercase mb-4">
            the tool
          </p>
          <h2 className="text-3xl font-bold mb-3">Type anything. We&apos;ll break it down.</h2>
          <p className="text-stone-500 text-base mb-10 leading-relaxed">
            No jargon. No gatekeeping. Just your idea and a step-by-step path to building it.
          </p>

          {/* Static demo (shown when no real conversation yet) */}
          {messages.length === 0 && !isLoading && (
            <div className="space-y-6 mb-8 opacity-70">
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-800">
                  {DEMO.user}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-pink-500 flex-shrink-0 mt-1 flex items-center justify-center text-white text-xs font-bold">
                  ✦
                </div>
                <div className="max-w-[85%] text-sm text-stone-600 leading-relaxed">
                  <MarkdownText text={DEMO.assistant} />
                </div>
              </div>
            </div>
          )}

          {/* Real messages */}
          {(messages.length > 0 || isLoading) && (
            <div className="space-y-6 mb-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-pink-500 flex-shrink-0 mt-1 flex items-center justify-center text-white text-xs font-bold">
                      ✦
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-stone-100 border border-stone-200 text-stone-800"
                      : "text-stone-800"
                  }`}>
                    {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : msg.content}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-pink-500 flex-shrink-0 mt-1 flex items-center justify-center text-white text-xs font-bold animate-pulse">
                    ✦
                  </div>
                  <div className="max-w-[85%] text-sm text-stone-800 leading-relaxed">
                    <MarkdownText text={streamingText} />
                    <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                  </div>
                </div>
              )}

              {isLoading && !streamingText && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-pink-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold animate-pulse">
                    ✦
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {/* Quick chips — demo chips when empty, suggestion chips after first message */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {DEMO_CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="text-sm px-3 py-1.5 rounded-full border border-stone-200 text-stone-500 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition-all disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="text-sm px-3 py-1.5 rounded-full border border-stone-200 text-stone-500 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition-all disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-stone-200 bg-stone-50 focus-within:border-pink-300 focus-within:bg-white transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your idea or ask anything..."
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent px-4 py-3.5 pr-14 text-sm text-stone-800 placeholder-stone-400 resize-none outline-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center hover:bg-stone-700 disabled:opacity-30 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                </svg>
              </button>
            </div>
            <p className="text-center text-stone-400 text-xs mt-2">Enter to send · Shift+Enter for new line</p>
          </form>
        </div>
      </section>

      {/* Quote */}
      <section className="bg-[#f5f0eb] border-b border-stone-200 px-6 py-16 text-center">
        <blockquote className="max-w-2xl mx-auto text-stone-500 text-lg leading-relaxed italic">
          &ldquo;Making a for loop doesn&apos;t require a specific kind of brain. It requires someone who believed they could — and someone who told them they could too.&rdquo;
        </blockquote>
      </section>

      <footer className="px-8 py-8 border-t border-stone-200 bg-[#f5f0eb]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm font-semibold text-stone-900">
            hot girls <span className="text-pink-500 italic">code</span>
            <span className="text-stone-400 font-normal ml-2">— because we always did</span>
          </div>
          <p className="text-xs text-stone-400">
            hotgirlscode.codes — built by a girl who was told she wasn&apos;t technical enough
          </p>
        </div>
      </footer>
    </div>
  );
}
