// 浏览器工具

import type { AgentTool } from "./types";

export function makeBrowserNavigateTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "browser_navigate",
        description:
          "用浏览器打开一个网页（新标签页）。可用于打开参考文档、登录页、下载地址等。",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "要打开的 URL（必须以 http:// 或 https:// 开头）",
            },
          },
          required: ["url"],
        },
      },
    },
    async run(args, ctx) {
      const url = String(args.url || "").trim();
      if (!url) throw new Error("url is required");
      ctx.onInfo(`打开网页: ${url}`);
      try {
        window.open(url, "_blank");
      } catch (e: any) {
        return JSON.stringify({
          ok: false,
          url,
          error: e?.message || String(e),
        });
      }
      ctx.onProgress(100);
      return JSON.stringify({
        ok: true,
        url,
        note: "已在新标签页打开，无法直接读取页面 DOM。如需截图请调用 browser_screenshot",
      });
    },
  };
}

export function makeBrowserScreenshotTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "browser_screenshot",
        description:
          "尝试读取目标网页的文本内容作为截图预览（降级实现：无法真正截屏，仅返回文本摘要）。",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "目标 URL",
            },
          },
          required: ["url"],
        },
      },
    },
    async run(args, ctx) {
      const url = String(args.url || "").trim();
      if (!url) throw new Error("url is required");
      ctx.onInfo(`抓取页面文本: ${url}`);
      try {
        const res = await fetch(url, { method: "GET", mode: "cors" });
        const text = await res.text();
        const preview = text.slice(0, 500);
        ctx.onProgress(100);
        return JSON.stringify({
          ok: true,
          url,
          status: res.status,
          note: "尝试读取了页面内容（仅文本）",
          preview,
        });
      } catch (e: any) {
        return JSON.stringify({
          ok: false,
          url,
          error:
            e?.message ||
            "跨域失败：该网站不允许直接抓取；可尝试 browser_navigate 在新标签页打开",
        });
      }
    },
  };
}
