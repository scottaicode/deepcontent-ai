import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";
import { env } from "process";

export const runtime = "edge";

// Check if ANTHROPIC_API_KEY is set
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('No ANTHROPIC_API_KEY found in environment variables');
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: anthropic("claude-3-5-sonnet-20240620"),
    messages: convertToCoreMessages(messages),
    system: "You are a helpful AI assistant",
  });

  return result.toDataStreamResponse();
}
