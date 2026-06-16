// 目标（Goal）管理工具

import {
  loadGoals,
  saveGoals,
  makeGoalId,
  type Goal,
} from "../../storage/extensions";
import type { AgentTool } from "./types";

export function makeListGoalsTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "list_goals",
        description:
          "列出用户的所有目标（Goal）。当用户问 我的目标、目标清单 时调用。",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
    async run(_args, ctx) {
      ctx.onInfo("读取目标清单");
      const goals = loadGoals().sort((a, b) => {
        if (a.status !== b.status) {
          const rank = (s: string) =>
            s === "active" ? 0 : s === "done" ? 2 : 1;
          return rank(a.status) - rank(b.status);
        }
        return b.createdAt - a.createdAt;
      });
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        total: goals.length,
        items: goals,
      });
    },
  };
}

export function makeAddGoalTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "add_goal",
        description:
          "新增一个目标。当用户说：把 xx 设为目标、新增目标 xx 时调用。" +
          "标题简洁不超过 60 个字符。",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "目标标题（中文，简练）",
            },
            description: {
              type: "string",
              description: "可选：目标说明/背景/要点",
            },
            priority: {
              type: "string",
              description: '"low" | "normal" | "high"，默认 normal',
              default: "normal",
            },
          },
          required: ["title"],
        },
      },
    },
    async run(args, ctx) {
      const title = String(args.title || "").trim();
      if (!title) throw new Error("title is required");
      const description = args.description
        ? String(args.description).trim()
        : undefined;
      const priority: "low" | "normal" | "high" =
        args.priority === "high" || args.priority === "low"
          ? (args.priority as "high" | "low")
          : "normal";
      ctx.onInfo(`添加目标：${title}`);
      const all = loadGoals();
      const now = Date.now();
      const g: Goal = {
        id: makeGoalId(),
        title,
        description,
        status: "active",
        priority,
        progress: 0,
        createdAt: now,
        updatedAt: now,
      };
      all.unshift(g);
      saveGoals(all);
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        id: g.id,
        title: g.title,
        priority: g.priority,
        status: g.status,
        totalActive: all.filter((x) => x.status === "active").length,
      });
    },
  };
}

export function makeCompleteGoalTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "complete_goal",
        description:
          "把指定目标的状态改为 done 或 dropped。调用前先调用 list_goals 拿到 id。",
        parameters: {
          type: "object",
          properties: {
            goalId: {
              type: "string",
              description: "目标 id",
            },
            status: {
              type: "string",
              description: '"done" | "dropped"，默认 done',
              default: "done",
            },
          },
          required: ["goalId"],
        },
      },
    },
    async run(args, ctx) {
      const goalId = String(args.goalId || "").trim();
      if (!goalId) throw new Error("goalId is required");
      const status: "done" | "dropped" =
        args.status === "dropped" ? "dropped" : "done";
      const all = loadGoals();
      const idx = all.findIndex((g) => g.id === goalId);
      if (idx < 0) throw new Error(`未找到目标：${goalId}`);
      const now = Date.now();
      all[idx] = {
        ...all[idx],
        status,
        progress: status === "done" ? 100 : all[idx].progress,
        updatedAt: now,
      };
      saveGoals(all);
      ctx.onInfo(`目标状态：${goalId} → ${status}`);
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        id: all[idx].id,
        title: all[idx].title,
        status: all[idx].status,
        progress: all[idx].progress,
      });
    },
  };
}
