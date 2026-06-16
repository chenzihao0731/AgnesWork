// 待办事项（Todo）工具

import {
  loadTodos,
  saveTodos,
  makeTodoId,
} from "../../storage/extensions";
import type { AgentTool } from "./types";

export function makeListTodoTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "list_todos",
        description:
          "列出用户的任务清单（Todo List）。返回所有未完成任务和最近完成的任务。" +
          "当用户问 '我的任务'、'有什么待办'、'今天要做什么' 时调用此工具。",
        parameters: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: '过滤条件："all" | "active" | "done"',
              default: "active",
            },
          },
          required: [],
        },
      },
    },
    async run(args, ctx) {
      const filter = String(args.filter || "active") as "all" | "active" | "done";
      ctx.onInfo(`读取 Todo (${filter})`);
      let todos = loadTodos();
      if (filter === "active") todos = todos.filter((t) => !t.done);
      else if (filter === "done") todos = todos.filter((t) => t.done);
      todos = [...todos].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        filter,
        total: todos.length,
        items: todos.slice(0, 100),
      });
    },
  };
}

export function makeAddTodoTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "add_todo",
        description:
          "在用户的任务清单里新增一条任务。当用户说：添加 xx 为任务、待办 xx、把 xx 加入 Todo 时调用。",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "任务标题（中文，简练）",
            },
            priority: {
              type: "string",
              description: '优先级："low" | "normal" | "high"',
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
      const priority: "low" | "normal" | "high" =
        args.priority === "high" || args.priority === "low"
          ? (args.priority as "high" | "low")
          : "normal";
      ctx.onInfo(`添加任务：${title}`);
      const all = loadTodos();
      const t = {
        id: makeTodoId(),
        title,
        priority,
        done: false,
        createdAt: Date.now(),
      };
      all.unshift(t);
      saveTodos(all);
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        id: t.id,
        title: t.title,
        priority: t.priority,
        totalActive: all.filter((x) => !x.done).length,
      });
    },
  };
}

export function makeCompleteTodoTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "complete_todo",
        description:
          "把指定任务标记为已完成。当用户说：完成 xx、标记 xx 已完成 时调用。" +
          "调用前先调用 list_todos 拿到 id。",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "任务 id" },
            title: { type: "string", description: "可选：用标题去匹配（不建议）" },
          },
          required: ["id"],
        },
      },
    },
    async run(args, ctx) {
      const id = String(args.id || "").trim();
      const title = String(args.title || "").trim();
      const all = loadTodos();
      const idx = all.findIndex(
        (t) => t.id === id || (title && t.title === title)
      );
      if (idx < 0) {
        throw new Error(`未找到任务：${id || title}`);
      }
      all[idx] = { ...all[idx], done: !all[idx].done };
      saveTodos(all);
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        id: all[idx].id,
        title: all[idx].title,
        now_done: all[idx].done,
      });
    },
  };
}

export function makeRemoveTodoTool(): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "remove_todo",
        description: "删除一个任务。优先使用 complete_todo，只有真正删除时才用这个。",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "任务 id" },
          },
          required: ["id"],
        },
      },
    },
    async run(args, ctx) {
      const id = String(args.id || "").trim();
      if (!id) throw new Error("id is required");
      const all = loadTodos();
      const removed = all.find((t) => t.id === id);
      const next = all.filter((t) => t.id !== id);
      saveTodos(next);
      ctx.onProgress(100);
      return JSON.stringify({
        success: true,
        removed: removed?.title || null,
        remaining_active: next.filter((x) => !x.done).length,
      });
    },
  };
}
