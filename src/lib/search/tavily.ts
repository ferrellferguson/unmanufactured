import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

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
  const response = await client.search(query, {
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
