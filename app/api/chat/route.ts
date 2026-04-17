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

When someone tells you what they want to build or understand:
1. Break it down into clear, numbered steps they can actually follow
2. Start with the simplest possible version first — get something working fast
3. Explain the "why" behind each step, not just the "what"
4. Use code examples with brief explanations
5. Celebrate progress and normalize confusion — it's all part of learning
6. After walking through steps, ask if they want to go deeper on any part

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
        model: "claude-opus-4-7",
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
