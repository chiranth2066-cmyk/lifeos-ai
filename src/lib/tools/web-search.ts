import { getServerCapabilities } from "@/lib/env";
import { sanitizeExternalContent } from "@/lib/security";
import type { ToolResult } from "@/types/agent";

export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
  source: string;
  isMock: boolean;
}

export async function runWebSearch(
  query: string,
  maxResults = 5
): Promise<ToolResult<WebSearchHit[]>> {
  const cleanQuery = sanitizeExternalContent(query, 240);
  const caps = getServerCapabilities();

  if (caps.webSearchProvider === "tavily" && process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: cleanQuery,
          max_results: maxResults,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error("Tavily error");
      const json = (await res.json()) as {
        results?: Array<{ title: string; url: string; content: string }>;
      };
      const hits: WebSearchHit[] = (json.results || []).map((r) => ({
        title: sanitizeExternalContent(r.title, 140),
        url: r.url,
        snippet: sanitizeExternalContent(r.content, 400),
        source: "Tavily Live Web Search",
        isMock: false,
      }));
      return {
        toolName: "web_search",
        provider: "Tavily Live Search",
        isMock: false,
        status: "success",
        fetchedAt: new Date().toISOString(),
        data: hits,
      };
    } catch {
      // Fall through to clearly labeled mock search
    }
  }

  if (caps.webSearchProvider === "serper" && process.env.SERPER_API_KEY) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.SERPER_API_KEY,
        },
        body: JSON.stringify({ q: cleanQuery, num: maxResults }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error("Serper error");
      const json = (await res.json()) as {
        organic?: Array<{ title: string; link: string; snippet: string }>;
      };
      const hits: WebSearchHit[] = (json.organic || []).slice(0, maxResults).map((r) => ({
        title: sanitizeExternalContent(r.title, 140),
        url: r.link,
        snippet: sanitizeExternalContent(r.snippet, 400),
        source: "Serper Live Web Search",
        isMock: false,
      }));
      return {
        toolName: "web_search",
        provider: "Serper Live Search",
        isMock: false,
        status: "success",
        fetchedAt: new Date().toISOString(),
        data: hits,
      };
    } catch {
      // Fall through to clearly labeled mock search
    }
  }

  return {
    toolName: "web_search",
    provider: "Mock Web Search Sandbox",
    isMock: true,
    status: "success",
    fetchedAt: new Date().toISOString(),
    warnings: [
      "No live search API key (TAVILY_API_KEY or SERPER_API_KEY) configured. Returning clearly labeled sandbox research results.",
    ],
    data: [
      {
        title: `[Mock Sandbox] Research summary for: ${cleanQuery}`,
        url: "https://example.com/mock-search-result",
        snippet: `Simulated web research snapshot for "${cleanQuery}". Configure TAVILY_API_KEY or SERPER_API_KEY in .env.local to retrieve live web citations.`,
        source: "Mock Web Search Sandbox",
        isMock: true,
      },
    ],
  };
}

