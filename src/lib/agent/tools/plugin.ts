// 插件（Plugin）工具：用户自定义 HTTP API 工具

import { type Plugin } from "../../storage/extensions";
import type { AgentTool } from "./types";

export function makePluginTool(plugin: Plugin): AgentTool {
  const name = `plugin_${plugin.id.replace(/[^a-z0-9_]/gi, "_")}`;
  const schema =
    plugin.type === "http_api" && plugin.api?.inputSchema
      ? plugin.api.inputSchema
      : {
          type: "object" as const,
          properties: {
            user_query: {
              type: "string",
              description: `给 ${plugin.name} 的用户输入`,
            },
          } as Record<string, unknown>,
          required: ["user_query"],
        };

  return {
    definition: {
      type: "function",
      function: {
        name,
        description: `${plugin.icon} ${plugin.name}: ${plugin.description}`,
        parameters: schema as any,
      },
    },
    async run(args, ctx) {
      if (plugin.type !== "http_api" || !plugin.api) {
        ctx.onProgress(100);
        return JSON.stringify({
          success: true,
          info: `${plugin.name} 是 simple 型，仅会注入 system prompt，不需要调用。`,
        });
      }
      const httpApi = plugin.api;
      if (!httpApi || !httpApi.url || !httpApi.method) {
        throw new Error(`插件 ${plugin.name} 的 API 配置不完整`);
      }
      const api = httpApi as Required<Pick<typeof httpApi, "url" | "method">> &
        Omit<NonNullable<typeof httpApi>, "url" | "method">;
      ctx.onInfo(`调用插件 ${plugin.name}：${api.method} ${api.url}`);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(api.headers || {}),
        };
        let fetchUrl: string = api.url;
        let body: string | undefined;

        if (api.method === "GET") {
          const params = Object.entries(args).map(
            ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
          );
          if (params.length) fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + params.join("&");
        } else {
          let tpl = api.bodyTemplate || "";
          if (!tpl) {
            tpl = JSON.stringify(args);
          } else {
            for (const [k, v] of Object.entries(args)) {
              tpl = tpl.split(`{{${k}}}`).join(String(v));
            }
          }
          body = tpl;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);
        const res = await fetch(fetchUrl, {
          method: api.method,
          headers,
          body: body,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
        const text = await res.text();
        let parsed: unknown = text;
        try { parsed = JSON.parse(text); } catch { /* keep as text */ }
        ctx.onProgress(100);
        return JSON.stringify({
          success: res.ok,
          status: res.status,
          plugin: plugin.name,
          response: parsed,
        });
      } catch (e: any) {
        return JSON.stringify({
          success: false,
          error: e?.message || String(e),
          plugin: plugin.name,
        });
      }
    },
  };
}
