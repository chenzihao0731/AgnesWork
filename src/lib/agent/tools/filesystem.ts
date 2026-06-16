// 文件系统工具：目录列表、文件读写、图片读取、压缩

import {
  getWorkspace,
  listDirectory,
  readTextFile,
  writeTextFile,
  readImageAsDataUrl,
} from "../../api/fs";
import type { AgentTool } from "./types";

// ============ 基础文件操作 ============

export function makeListDirTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "list_directory",
        description:
          "列出工作目录下的文件和子目录。不传 path 则列出 workspace 根目录。" +
          "这是 Agent 查看本地文件结构的唯一入口，先调用它再决定读哪个文件。",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "相对 workspace 的子目录路径。留空表示根目录。",
            },
          },
          required: [],
        },
      },
    },
    async run(args, ctx) {
      const path = args.path ? String(args.path) : undefined;
      ctx.onInfo(`列出目录: ${path || "(workspace 根)"}`);
      const entries = await listDirectory(path);
      ctx.onProgress(100, "completed");
      return JSON.stringify({
        success: true,
        workspace: await getWorkspace().catch(() => ""),
        path: path || "./",
        entries: entries.slice(0, 100),
        count: entries.length,
      });
    },
  };
}

export function makeReadTextTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "read_text_file",
        description:
          "读取工作目录中的文本文件，用于分析代码、读取配置、总结文档内容。" +
          "对于大文件请设置 max_bytes 避免超出上下文限制。",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "文件路径（相对 workspace 或绝对路径，但必须在 workspace 内）",
            },
            max_bytes: {
              type: "number",
              description: "最大读取字节数（建议 8000~32000）；不传则读取全部",
            },
          },
          required: ["path"],
        },
      },
    },
    async run(args, ctx) {
      const path = String(args.path || "").trim();
      if (!path) throw new Error("path is required");
      const maxBytes = args.max_bytes ? Number(args.max_bytes) : undefined;
      ctx.onInfo(`读取文件: ${path}${maxBytes ? `（前${maxBytes}字节）` : ""}`);
      const content = await readTextFile(path, maxBytes);
      ctx.onProgress(100, "completed");
      return JSON.stringify({ success: true, path, bytes: content.length, content });
    },
  };
}

export function makeWriteTextTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "write_text_file",
        description:
          "把内容写入工作目录下的文本文件。用于：保存代码、写报告、导出对话记录、" +
          "生成 Markdown 文档等。相同路径会覆盖，请谨慎！",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "目标文件路径（相对 workspace 或绝对路径，必须在 workspace 内）",
            },
            content: { type: "string", description: "要写入的文本内容" },
          },
          required: ["path", "content"],
        },
      },
    },
    async run(args, ctx) {
      const path = String(args.path || "").trim();
      const content = String(args.content ?? "");
      if (!path) throw new Error("path is required");
      ctx.onInfo(`写入文件: ${path}（${content.length} 字符）`);
      const actualPath = await writeTextFile(path, content);
      ctx.onProgress(100, "completed");
      return JSON.stringify({ success: true, path: actualPath, bytes: content.length });
    },
  };
}

export function makeReadImageTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "read_image_file",
        description:
          "读取工作目录中的图片文件为 base64 data URL，返回的值可以交给" +
          "多模态模型分析图片内容（识别图表、截图识别文字、描述图片等）。" +
          "注意：文件体积越大，token 消耗越多。",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "图片路径（相对 workspace）" },
          },
          required: ["path"],
        },
      },
    },
    async run(args, ctx) {
      const path = String(args.path || "").trim();
      if (!path) throw new Error("path is required");
      ctx.onInfo(`读取图片: ${path}`);
      const dataUrl = await readImageAsDataUrl(path);
      ctx.onProgress(100, "completed");
      return JSON.stringify({
        success: true,
        path,
        image_data_url: dataUrl,
        preview_hint:
          "此 URL 可以直接作为消息内容中的 image_url 交给多模态模型分析",
      });
    },
  };
}

// ============ 压缩工具 ============

export function makeCompressImageTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "compress_image",
        description:
          "读取工作目录中的图片，按 quality 重新编码为 JPEG 并写回 original-compressed.jpg。" +
          "quality 越小体积越小，画质越低。",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "工作目录中的图片相对路径",
            },
            quality: {
              type: "number",
              description: "压缩质量 0-1，默认 0.7",
              default: 0.7,
            },
          },
          required: ["filePath"],
        },
      },
    },
    async run(args, ctx) {
      const filePath = String(args.filePath || "").trim();
      const quality = Number(args.quality) || 0.7;
      if (!filePath) throw new Error("filePath is required");
      ctx.onInfo(`压缩图片: ${filePath} (quality=${quality})`);
      try {
        const dataUrl = await readImageAsDataUrl(filePath);
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("图片加载失败"));
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) throw new Error("无法创建 canvas 上下文");
        ctx2d.drawImage(img, 0, 0);
        const newDataUrl = canvas.toDataURL("image/jpeg", quality);
        const baseName = filePath.replace(/\.[^.]+$/, "");
        const outFile = `${baseName}-compressed.jpg`;
        await writeTextFile(outFile, newDataUrl);
        const originalBytes = dataUrl.length;
        const newBytes = newDataUrl.length;
        const ratio = originalBytes > 0 ? newBytes / originalBytes : 1;
        ctx.onProgress(100);
        return JSON.stringify({
          ok: true, originalBytes, newBytes,
          ratio: +ratio.toFixed(4), newFile: outFile,
        });
      } catch (e: any) {
        return JSON.stringify({
          ok: false, filePath,
          error: e?.message || String(e),
        });
      }
    },
  };
}

export function makeCompressFilesTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "compress_files",
        description:
          "对文本文件进行轻量压缩（去除多余空白/合并空格），写回 original-compressed.ext。" +
          "仅处理 txt/md/json/js/ts/css/html/yaml/csv/svg/xml 文本文件。",
        parameters: {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: { type: "string" },
              description: "工作目录中的相对路径数组",
            },
            mode: {
              type: "string",
              description: '"deflate" | "simple"。默认 simple。',
              default: "simple",
            },
          },
          required: ["paths"],
        },
      },
    },
    async run(args, ctx) {
      const rawPaths = args.paths;
      const paths: string[] = Array.isArray(rawPaths)
        ? rawPaths.map((p) => String(p)) : [];
      const mode = String(args.mode || "simple");
      if (paths.length === 0) throw new Error("paths is required");
      const textExts = new Set([
        ".txt", ".md", ".json", ".js", ".ts",
        ".css", ".html", ".yaml", ".csv", ".svg", ".xml",
      ]);
      const results: Array<
        | { path: string; originalBytes: number; newBytes: number; ratio: number }
        | { path: string; skipped: boolean; reason: string }
      > = [];
      ctx.onInfo(`压缩 ${paths.length} 个文件 (mode=${mode})`);
      for (const p of paths) {
        const ext = p.match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
        if (!textExts.has(ext)) {
          results.push({ path: p, skipped: true, reason: "非文本类型，跳过" });
          continue;
        }
        try {
          const content = await readTextFile(p);
          let compressed = content;
          if (mode === "deflate") {
            compressed = content.replace(/\r\n/g, "\n")
              .replace(/[ \t]+/g, " ")
              .replace(/\n{3,}/g, "\n\n").trim();
          } else {
            compressed = content.replace(/[ \t]+/g, " ")
              .replace(/\n{3,}/g, "\n\n").trim();
          }
          const newFile = p.replace(/(\.[^.]+)$/, "-compressed$1");
          await writeTextFile(newFile, compressed);
          const originalBytes = content.length;
          const newBytes = compressed.length;
          const ratio = originalBytes > 0 ? newBytes / originalBytes : 1;
          results.push({ path: p, originalBytes, newBytes, ratio: +ratio.toFixed(4) });
        } catch (e: any) {
          results.push({ path: p, skipped: true, reason: e?.message || String(e) });
        }
      }
      ctx.onProgress(100);
      return JSON.stringify({ ok: true, mode, results });
    },
  };
}
