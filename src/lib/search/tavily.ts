import { tavily } from "@tavily/core";

// Created on first use so builds don't fail when TAVILY_API_KEY isn't set
let client: ReturnType<typeof tavily> | undefined;

function getClient() {
  client ??= tavily({ apiKey: process.env.TAVILY_API_KEY! });
  return client;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate: string | null;
}

export async function searchForEvent(
  query: string,
  maxResults = 10
): Promise<SearchResult[]> {
  const response = await getClient().search(query, {
    searchDepth: "advanced",
    maxResults,
    includeRawContent: false,
  });

  return response.results.map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
    publishedDate: r.publishedDate ?? null,
  }));
}
