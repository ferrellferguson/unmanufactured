import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { db } from "@/lib/db";
import { contextRejections } from "@/lib/db/schema";

interface SearchResultInput {
  id: string;
  content: string;
}

interface ContextRejectionResult {
  searchResultId: string;
  providedFact: string;
  rejected: boolean;
  similarityScore: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function extractKeyFacts(content: string): Promise<string[]> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Extract the 2-4 most important factual claims from this text. Return each fact on its own line, with no numbering or bullets. Be concise — one sentence per fact.

Text:
${content}`,
    maxOutputTokens: 500,
  });

  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

const REJECTION_THRESHOLD = 0.45;

export async function detectContextRejection(
  snapshotId: string,
  eventId: string,
  searchResultRows: SearchResultInput[],
  responseText: string
): Promise<ContextRejectionResult[]> {
  if (searchResultRows.length === 0) return [];

  const responseEmbedding = await generateEmbedding(responseText);
  const results: ContextRejectionResult[] = [];

  for (const sr of searchResultRows) {
    let facts: string[];
    try {
      facts = await extractKeyFacts(sr.content);
    } catch {
      continue;
    }

    for (const fact of facts) {
      const factEmbedding = await generateEmbedding(fact);
      const similarity = cosineSimilarity(factEmbedding, responseEmbedding);
      const rejected = similarity < REJECTION_THRESHOLD;

      const result: ContextRejectionResult = {
        searchResultId: sr.id,
        providedFact: fact,
        rejected,
        similarityScore: similarity,
      };

      results.push(result);

      await db.insert(contextRejections).values({
        snapshotId,
        eventId,
        searchResultId: sr.id,
        providedFact: fact,
        rejected,
        similarityScore: similarity,
      });
    }
  }

  return results;
}
