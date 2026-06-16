// Web Search 工具 — 使用 DuckDuckGo Instant Answer API（免费，无需 key）

import type { AgentTool } from "./types";

/** DuckDuckGo Instant Answer 返回的结构 */
interface DuckDuckGoResult {
  Abstract?: string;
  AbstractText?: string;
  AbstractSource?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
    Icon?: { URL?: string };
  }>;
  Results?: Array<{
    Text?: string;
    FirstURL?: string;
    Icon?: { URL?: string };
  }>;
}

export function makeWebSearchTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "web_search",
        description:
          "在网络上搜索信息。当用户需要最新资讯、事实核查、百科知识查询、" +
          "或需要外部信息来回答问题时应调用此工具。返回搜索结果摘要和相关链接。" +
          "使用 DuckDuckGo 搜索引擎，无需 API Key。",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索关键词（英文效果更好，中文也可）。建议精简到 5-10 个词。",
            },
            max_results: {
              type: "number",
              description: "返回结果数量上限，默认 5，最多 10",
              default: 5,
            },
          },
          required: ["query"],
        },
      },
    },
    async run(args, ctx) {
      const query = String(args.query || "").trim();
      const maxResults = Math.min(Number(args.max_results) || 5, 10);
      if (!query) throw new Error("query is required");

      ctx.onInfo(`搜索: ${query}`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(url, { signal: controller.signal }).finally(() =>
          clearTimeout(timeoutId)
        );

        if (!res.ok) throw new Error(`Search API returned ${res.status}`);

        const data = (await res.json()) as DuckDuckGoResult;

        const items: Array<{ title: string; url?: string; snippet: string }> = [];

        // 1. 如果有直接答案（Abstract）
        if (data.AbstractText && data.AbstractText.trim()) {
          items.push({
            title: data.Heading || "直接答案",
            url: data.AbstractURL,
            snippet: data.AbstractText.slice(0, 500),
          });
        }

        // 2. RelatedTopics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
          for (const topic of data.RelatedTopics.slice(0, maxResults)) {
            if (topic.Text) {
              items.push({
                title: topic.Text.split(" - ")[0].slice(0, 80),
                url: topic.FirstURL,
                snippet: topic.Text.slice(0, 300),
              });
            }
          }
        }

        // 3. Results
        if (data.Results && data.Results.length > 0) {
          for (const result of data.Results.slice(0, maxResults)) {
            if (result.Text) {
              items.push({
                title: result.Text.split(" - ")[0].slice(0, 80),
                url: result.FirstURL,
                snippet: result.Text.slice(0, 300),
              });
            }
          }
        }

        ctx.onProgress(100);
        const uniqueItems = items.slice(0, maxResults);
        return JSON.stringify({
          success: true,
          query,
          source: "DuckDuckGo",
          total: uniqueItems.length,
          items: uniqueItems,
          hint: "这些是搜索结果的摘要。如需详细内容，可以使用 browser_navigate 打开 URL。",
        });
      } catch (e: any) {
        return JSON.stringify({
          success: false,
          query,
          error: e?.message || String(e),
          hint: "搜索失败。可能是网络问题或查询格式有误。",
        });
      }
    },
  };
}
