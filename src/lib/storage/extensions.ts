/**
 * 扩展存储层：Todo / Skills / Plugins / MCP / Goals
 * 复用 localStorage 策略，与原有的会话/config 存储保持一致。
 */

import { loadConfig } from "./config";

// ============================================================
// 1. TODO
// ============================================================
export interface TodoItem {
  id: string;
  title: string;
  note?: string;
  priority: "low" | "normal" | "high";
  done: boolean;
  createdAt: number;
  dueAt?: number;
  conversationId?: string; // 可选：与某个会话关联
}

const TODO_KEY = "agnes.todos.v1";

export function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTodos(items: TodoItem[]): void {
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function makeTodoId(): string {
  return "todo_" + Math.random().toString(36).slice(2, 10);
}

// ============================================================
// 2. SKILLS
// ============================================================
// 一个 Skill 对应一组预置 toolId，也可以自带一段 system prompt 注入。
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  enabled: boolean;
  /** 对应 agent.ts 中 TOOL_REGISTRY 的 tool 名数组 */
  toolIds: string[];
  /** 额外的 system prompt 片段，启用时会追加到总 system prompt */
  extraSystemPrompt?: string;
  builtin?: boolean;
}

const SKILL_KEY = "agnes.skills.v1";

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: "skill-design",
    name: "设计助手",
    description:
      "生成图片、配色方案、UI 素材 — 启用后 AI 会优先调用图像类工具。",
    icon: "🎨",
    enabled: false,
    toolIds: ["generate_image", "image_to_image"],
    extraSystemPrompt:
      "你是一个注重设计的助手：描述图片时优先给出色彩、构图、情绪，尽量让用户可直接落地使用。",
    builtin: true,
  },
  {
    id: "skill-video",
    name: "视频创作",
    description:
      "基于描述或图片生成视频内容 — 启用后 AI 会调用 generate_video。",
    icon: "🎬",
    enabled: false,
    toolIds: ["generate_video"],
    extraSystemPrompt:
      "你是一个视频创作助手：生成视频前，先向用户确认镜头、时长、风格；完成后给出脚本要点。",
    builtin: true,
  },
  {
    id: "skill-dev",
    name: "开发助手",
    description:
      "读取/写入项目文件、列出目录 — 让 AI 具备本地文件读写能力。",
    icon: "💻",
    enabled: true, // 默认开启，因为文件工具对桌面 Agent 很重要
    toolIds: ["list_directory", "read_text_file", "write_text_file", "read_image_file"],
    extraSystemPrompt:
      "你是一个开发助手：不确定路径时先查目录；不要编造不存在的文件；写文件前先备份原内容。",
    builtin: true,
  },
  {
    id: "skill-writer",
    name: "写作助手",
    description:
      "输出长文本、Markdown 文档、结构化报告 — 不调用额外工具，只强化写作风格。",
    icon: "✍️",
    enabled: false,
    toolIds: [],
    extraSystemPrompt:
      "你是一个写作助手：回复结构清晰、用二级标题分点；技术文档用中文，尽量给可复制的代码片段。",
    builtin: true,
  },
  {
    id: "skill-research",
    name: "调研助手",
    description:
      "以结构化方式列出结论与引用，适合做信息整理/对比分析。",
    icon: "🔍",
    enabled: false,
    toolIds: ["list_directory", "read_text_file"],
    extraSystemPrompt:
      "你是一个调研助手：每个结论都给出来源；若不确定就明确说 —— 不确定；对比型问题使用表格。",
    builtin: true,
  },
];

export function loadSkills(): Skill[] {
  try {
    const raw = localStorage.getItem(SKILL_KEY);
    if (!raw) return [...BUILTIN_SKILLS];
    const parsed = JSON.parse(raw) as Skill[];
    // 合并：旧配置保留 + 新增的 builtin skill 补齐
    const ids = new Set(parsed.map((s) => s.id));
    for (const b of BUILTIN_SKILLS) {
      if (!ids.has(b.id)) parsed.push({ ...b });
    }
    return parsed;
  } catch {
    return [...BUILTIN_SKILLS];
  }
}

export function saveSkills(items: Skill[]): void {
  try {
    localStorage.setItem(SKILL_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

// ============================================================
// 3. PLUGINS（用户自定义工具）
// ============================================================
// type=simple: 用固定提示模板注入 system prompt（轻量，不需要网络）
// type=http_api: 调用外部 HTTP API，JSON 响应由 AI 理解
export type PluginType = "simple" | "http_api";

export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: PluginType;
  enabled: boolean;
  // simple 型的 system prompt 片段
  systemPrompt?: string;
  // http_api 型的配置
  api?: {
    url?: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    // 请求体模板，支持 {{param}} 占位符
    bodyTemplate?: string;
    // 传给 AI 的参数定义（JSON Schema 风格）
    inputSchema?: {
      type: "object";
      properties: Record<
        string,
        { type: string; description?: string; default?: unknown }
      >;
      required?: string[];
    };
  };
  createdAt: number;
}

const PLUGIN_KEY = "agnes.plugins.v1";

export function loadPlugins(): Plugin[] {
  try {
    const raw = localStorage.getItem(PLUGIN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlugins(items: Plugin[]): void {
  try {
    localStorage.setItem(PLUGIN_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function makePluginId(): string {
  return "plugin_" + Math.random().toString(36).slice(2, 10);
}

// ============================================================
// 4. MCP（Model Context Protocol）
// ============================================================
// 本项目不实现完整的 MCP server，只做一个"轻量 MCP 客户端"：
// - 用户配置一个或多个 MCP server（仅保存配置）
// - Agent 启动时通过 HTTP 调用 MCP server 的 tools/list 拿到工具列表
// - 用户请求时通过 tools/call 调用具体工具
// 对于无法直连 MCP server 的场景，提供一个"模拟 MCP"选项（用 prompt 模拟）。
export interface McpServer {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseUrl: string; // MCP server 的 base URL（SSE 或 HTTP）
  apiKey?: string;
  enabled: boolean;
  mode: "http" | "sse" | "mock";
  createdAt: number;
  lastError?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  serverId: string;
}

const MCP_KEY = "agnes.mcp.v1";

export function loadMcpServers(): McpServer[] {
  try {
    const raw = localStorage.getItem(MCP_KEY);
    if (!raw) {
      // 默认提供一个"mock"示例，方便用户理解
      return [
        {
          id: "mcp-memory",
          name: "内存便签（模拟 MCP）",
          description:
            "一个演示用的 MCP 工具：可以把便签存在浏览器内存里，支持查询与清除。",
          icon: "📝",
          baseUrl: "mock://memory",
          enabled: false,
          mode: "mock",
          createdAt: Date.now(),
        },
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMcpServers(items: McpServer[]): void {
  try {
    localStorage.setItem(MCP_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function makeMcpId(): string {
  return "mcp_" + Math.random().toString(36).slice(2, 10);
}

// ============================================================
// 5. 方便 Agent 汇总查询：哪些 toolId 当前可用 + 合并后的 extra system prompt
// ============================================================
export interface ActiveToolProfile {
  enabledToolIds: string[];
  extraSystemPrompts: string[];
  enabledSkillCount: number;
  enabledPluginCount: number;
  enabledMcpCount: number;
}

export function getActiveProfile(): ActiveToolProfile {
  const skills = loadSkills();
  const plugins = loadPlugins();
  const mcps = loadMcpServers();

  const enabledSkillToolIds = new Set<string>();
  const extraSystemPrompts: string[] = [];

  for (const s of skills) {
    if (!s.enabled) continue;
    for (const tid of s.toolIds) enabledSkillToolIds.add(tid);
    if (s.extraSystemPrompt) extraSystemPrompts.push(s.extraSystemPrompt);
  }

  // plugins: simple 型贡献 system prompt
  for (const p of plugins) {
    if (!p.enabled) continue;
    if (p.type === "simple" && p.systemPrompt) {
      extraSystemPrompts.push(`[plugin:${p.name}] ${p.systemPrompt}`);
    }
  }

  return {
    enabledToolIds: Array.from(enabledSkillToolIds),
    extraSystemPrompts,
    enabledSkillCount: skills.filter((s) => s.enabled).length,
    enabledPluginCount: plugins.filter((p) => p.enabled).length,
    enabledMcpCount: mcps.filter((m) => m.enabled).length,
  };
}

// ============================================================
// 6. 目标 (Goal)
// ============================================================
export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: "active" | "done" | "dropped";
  priority: "low" | "normal" | "high";
  progress: number; // 0-100
  milestones?: { id: string; text: string; done: boolean }[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  dueAt?: number;
  conversationId?: string;
}

const GOAL_KEY = "agnes.goals.v1";

export function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGoals(items: Goal[]): void {
  try {
    localStorage.setItem(GOAL_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function makeGoalId(): string {
  return "goal_" + Math.random().toString(36).slice(2, 10);
}

export function makeMilestoneId(): string {
  return "ms_" + Math.random().toString(36).slice(2, 10);
}

export type Milestone = NonNullable<Goal["milestones"]>[number];

// 方便其他模块也调用 — 从 config.ts 复用
export { loadConfig };
