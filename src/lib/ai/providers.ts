import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";

export const MODEL_CONFIGS = [
  {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic" as const,
    displayName: "Claude (Anthropic)",
    model: anthropic("claude-sonnet-4-20250514"),
  },
  {
    id: "gpt-4o",
    provider: "openai" as const,
    displayName: "GPT-4o (OpenAI)",
    model: openai("gpt-4o"),
  },
  {
    id: "grok-3",
    provider: "xai" as const,
    displayName: "Grok 3 (xAI)",
    model: xai("grok-3"),
  },
  {
    id: "gemini-2.0-flash",
    provider: "google" as const,
    displayName: "Gemini 2.0 Flash (Google)",
    model: google("gemini-2.0-flash"),
  },
] as const;

export type ModelConfig = (typeof MODEL_CONFIGS)[number];
