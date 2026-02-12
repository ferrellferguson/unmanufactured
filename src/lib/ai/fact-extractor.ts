import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface ExtractedFact {
  claim: string;
  confidence: number;
}

export async function extractFacts(
  responseText: string
): Promise<ExtractedFact[]> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Extract individual factual claims from the following text. Return a JSON array where each item has "claim" (a single sentence stating one fact) and "confidence" (0.0-1.0, how definitively the text states this).

Only extract concrete, verifiable claims. Skip opinions, speculation, and analysis.

Text:
${responseText}

Return ONLY valid JSON array, no markdown code blocks:`,
  });

  try {
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
