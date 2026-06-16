// MCP（Model Context Protocol）工具：轻量 MCP 客户端实现

import { loadMcpServers } from "../../storage/extensions";
import type { AgentTool } from "./types";

// 简单的内存便签存储：所有 MCP mock 工具共享
const mockMemoryNotes: Record<string, string> = {};

export function makeMockMcpTools(serverId: string): AgentTool[] {
  return [
    {
      definition: {
        type: "function",
        function: {
          name: `mcp_${serverId}_memory_write`,
          description:
            `在 MCP 服务"${serverId}" 里写一条便签（key-value）。` +
            "再次写相同 key 会覆盖。调用后可通过 memory_read 取回。",
          parameters: {
            type: "object",
            properties: {
              key: { type: "string", description: "便签 key（建议英文、无空格）" },
              content: { type: "string", description: "便签内容" },
            },
            required: ["key", "content"],
          },
        },
      },
      async run(args, ctx) {
        const key = String(args.key || "").trim();
        const content = String(args.content || "");
        if (!key) throw new Error("key is required");
        ctx.onInfo(`写便签：${key}`);
        mockMemoryNotes[key] = content;
        ctx.onProgress(100);
        return JSON.stringify({ success: true, key, bytes: content.length });
      },
    },
    {
      definition: {
        type: "function",
        function: {
          name: `mcp_${serverId}_memory_read`,
          description: `读取 MCP 服务"${serverId}" 里的一条便签（给定 key）或全部便签（key = "__all__"）。`,
          parameters: {
            type: "object",
            properties: {
              key: { type: "string", description: '便签 key；传 "__all__" 查全部' },
            },
            required: ["key"],
          },
        },
      },
      async run(args, ctx) {
        const key = String(args.key || "").trim();
        if (!key) throw new Error("key is required");
        ctx.onInfo(`读取便签：${key}`);
        let data: unknown;
        if (key === "__all__") {
          data = Object.entries(mockMemoryNotes).map(([k, v]) => ({ key: k, value: v }));
        } else {
          data = mockMemoryNotes[key] ?? null;
        }
        ctx.onProgress(100);
        return JSON.stringify({ success: true, key, data });
      },
    },
    {
      definition: {
        type: "function",
        function: {
          name: `mcp_${serverId}_memory_clear`,
          description: `清空 MCP 服务"${serverId}" 里的全部便签。`,
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      async run(_args, ctx) {
        ctx.onInfo(`清空便签`);
        const keys = Object.keys(mockMemoryNotes);
        for (const k of keys) delete mockMemoryNotes[k];
        ctx.onProgress(100);
        return JSON.stringify({ success: true, cleared: keys.length });
      },
    },
  ];
}

export function buildMcpTools(): AgentTool[] {
  const servers = loadMcpServers().filter((s) => s.enabled);
  const tools: AgentTool[] = [];
  for (const s of servers) {
    if (s.mode === "mock") {
      tools.push(...makeMockMcpTools(s.id));
    } else {
      tools.push({
        definition: {
          type: "function",
          function: {
            name: `mcp_${s.id}`,
            description:
              `${s.icon} ${s.name}: 调用该 MCP 服务的工具。` +
              `需传入服务里工具的 name 与 params（JSON）。` +
              (s.description ? `（${s.description}）` : ""),
            parameters: {
              type: "object",
              properties: {
                tool_name: { type: "string", description: "该 MCP 服务里的工具名" },
                tool_params_json: {
                  type: "string",
                  description: "该工具参数的 JSON（字符串形式）",
                },
              },
              required: ["tool_name"],
            },
          },
        },
        async run(args, ctx) {
          const toolName = String(args.tool_name || "").trim();
          const paramsJson = String(args.tool_params_json || "{}");
          ctx.onInfo(`MCP [${s.name}] → ${toolName}`);
          try {
            const res = await fetch(s.baseUrl.replace(/\/$/, "") + "/tools/call", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
              },
              body: JSON.stringify({ name: toolName, arguments: JSON.parse(paramsJson) }),
            });
            const txt = await res.text();
            let parsed: unknown = txt;
            try { parsed = JSON.parse(txt); } catch { /* keep as text */ }
            ctx.onProgress(100);
            return JSON.stringify({
              success: res.ok,
              status: res.status,
              server: s.name,
              tool: toolName,
              content: parsed,
            });
          } catch (e: any) {
            return JSON.stringify({
              success: false,
              error: e?.message || String(e),
              server: s.name,
              tool: toolName,
            });
          }
        },
      });
    }
  }
  return tools;
}
