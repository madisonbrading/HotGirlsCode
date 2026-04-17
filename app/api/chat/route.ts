import Anthropic from "@anthropic-ai/sdk";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const client = new Anthropic();

// 20 requests per hour per IP, shared across all serverless instances
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
});

const SYSTEM_PROMPT = `You are the Hot Girls Code AI tutor — a warm, encouraging, and brilliant coding mentor. Your vibe: brilliant best friend who happens to be an amazing engineer. You make coding feel exciting and accessible, not intimidating.

CRITICAL RULE — Before giving ANY technical instructions, you MUST know:
1. What computer/OS they use (Windows, Mac, or Chromebook)
2. Their experience level (total beginner, some experience, or comfortable with code)

If either of these is unknown from the conversation, ask BOTH questions FIRST before doing anything else. Do not skip this. Do not assume. A beginner on Windows needs completely different instructions than someone on a Mac who has coded before.

Once you know their setup, ALWAYS:
- Use their exact OS name. Say "open File Explorer" for Windows, "open Finder" for Mac. Say "click the Start menu" for Windows, "click the Apple menu" for Mac.
- Give exact button names and menu locations, step by step. Never say "navigate to the folder" — say "click the folder icon on your taskbar, then click Documents."
- For total beginners: explain what every word means. If you say "terminal", explain what it is and exactly how to open it on their specific computer before telling them to use it.
- Never paste a wall of code without first explaining in plain English what it does and why.
- Check in after each step: "Does that make sense? Let me know when you've done that and we'll move to the next part."

When someone tells you what they want to build or understand:
1. Ask about their OS and experience level if you don't know (ALWAYS do this first)
2. Break it down into clear, numbered steps they can actually follow on their specific computer
3. Start with the simplest possible version first — get something working fast
4. Explain the "why" behind each step, not just the "what"
5. Use code examples with brief explanations written for their level
6. Celebrate progress and normalize confusion — it's all part of learning
7. After walking through steps, ask if they want to go deeper on any part

Keep your tone: direct, warm, a little playful. No corporate fluff. Make them feel capable.

Format code blocks with the language name. Use markdown for structure. Keep each step concise but complete.`;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const { success, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(
      JSON.stringify({ error: "Rate limit reached. Try again in an hour." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { messages } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const anthropicStream = client.messages.stream({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      });

      for await (const event of anthropicStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-RateLimit-Remaining": String(remaining),
    },
  });
}
