export interface SourceLike {
  title: string;
  url: string | null;
  content: string;
}

export interface SearchResultLike {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate: string | null;
}

export function buildPollPrompt(
  promptTemplate: string,
  activeSources: SourceLike[],
  searchResults: SearchResultLike[] = []
): string {
  const hasExternalSources = activeSources.length > 0;
  const hasSearchResults = searchResults.length > 0;

  const sourcesBlock = hasExternalSources
    ? activeSources
        .map(
          (s, i) =>
            `[Source ${i + 1}] ${s.title}${s.url ? ` (${s.url})` : ""}\n${s.content}`
        )
        .join("\n\n---\n\n")
    : null;

  const searchBlock = hasSearchResults
    ? searchResults
        .map(
          (r, i) =>
            `[Search ${i + 1}] ${r.title} (${r.url})${r.publishedDate ? ` [${r.publishedDate}]` : ""}\nRelevance: ${(r.score * 100).toFixed(0)}%\n${r.content}`
        )
        .join("\n\n---\n\n")
    : null;

  let prompt = `${promptTemplate}

## Instructions

Tell me everything you know about this event. Draw on your full training data to provide a comprehensive, up-to-date summary. Do NOT say you lack information — share what you know.

Include:
1. **Key Facts**: What happened, who was involved, when, where, how
2. **Context**: Background information, relevant history, and what led to this event
3. **Current Status**: Latest developments you're aware of
4. **Public Reaction**: How officials, media, and the public have responded
5. **Uncertainties**: What remains unknown, disputed, or unconfirmed
6. **Analysis**: What this means and potential implications

Be thorough but objective. Clearly distinguish between confirmed facts and claims that are disputed or unverified.`;

  if (sourcesBlock) {
    prompt += `

## Additional Sources / Evidence

The following external sources have been collected. Incorporate them into your analysis and note if they contradict or add to what you already know:

${sourcesBlock}`;
  }

  if (searchBlock) {
    prompt += `

## Real-Time Search Results

The following are real-time search results retrieved just now. You MUST acknowledge and address every fact present in these results. If a search result contradicts your training data, explicitly note the discrepancy. Do not ignore or omit any information from these results.

${searchBlock}`;
  }

  return prompt;
}

export function buildSynthesisPrompt(
  promptTemplate: string,
  activeSources: SourceLike[],
  searchResults: SearchResultLike[] = []
): string {
  return buildPollPrompt(promptTemplate, activeSources, searchResults);
}
