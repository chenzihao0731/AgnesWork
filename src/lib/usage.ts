import { useEffect, useSyncExternalStore } from "react";

const USAGE_KEY = "agnes.agent.usage.v1";

/** 某段时间内（今日）的用量 */
export interface UsageSnapshot {
  date: string;                    // YYYY-MM-DD
  totalTokens: number;             // 累计使用 token
  promptTokens: number;            // 输入（含上下文）
  completionTokens: number;        // 输出
  turns: number;                   // 进行了多少次“用户输入 → AI 回复”的轮次
  toolCalls: number;               // 工具调用次数
}

export interface UsageStats {
  today: UsageSnapshot;
  totalTokens: number;           // 累计所有天
  currentConversationContext: number;  // 当前会话上下文 token 估算
  contextLimit: number;           // 上下文上限（估算，模型默认 32k）
  modelName: string;
}

function startOfDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface StorageShape {
  history: Record<string, UsageSnapshot>;
  total: number;
}

function read(): StorageShape {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { history: {}, total: 0 };
    const parsed = JSON.parse(raw) as StorageShape;
    if (!parsed || !parsed.history) return { history: {}, total: 0 };
    return parsed;
  } catch {
    return { history: {}, total: 0 };
  }
}

function write(shape: StorageShape) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(shape));
  } catch {}
}

// 简化估算：中文 1 token ≈ 1.8 字，英文 1 token ≈ 4 字符
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 中文汉字、日文假名、韩文
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const others = text.length - cjk;
  return Math.max(1, Math.round(cjk / 1.8 + others / 4));
}

// ==========================
// 外部 Store
// ==========================
let shape: StorageShape = read();
let today = startOfDay();
let contextTokens = 0;
let listeners: Array<() => void> = [];

function ensureToday() {
  if (!shape.history[today]) {
    shape.history[today] = {
      date: today,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      turns: 0,
      toolCalls: 0,
    };
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** 记录一次对话（用户发送 + AI 回应）的 token 用量 */
export function recordTurn(opts: {
  userPrompt?: string;
  assistantReply?: string;
  toolCalls?: number;
  promptTokens?: number;        // 可选：若 API 返回了实际值，优先使用
  completionTokens?: number;
}) {
  // 切换日期检测
  const now = startOfDay();
  if (now !== today) {
    today = now;
  }
  ensureToday();
  const snap = shape.history[today];

  const promptT = opts.promptTokens ?? estimateTokens(opts.userPrompt || "");
  const completionT = opts.completionTokens ?? estimateTokens(opts.assistantReply || "");
  const tools = opts.toolCalls ?? 0;

  snap.promptTokens += promptT;
  snap.completionTokens += completionT;
  snap.totalTokens += promptT + completionT;
  snap.turns += 1;
  snap.toolCalls += tools;

  shape.total += promptT + completionT;

  write(shape);
  emit();
}

/** 更新当前会话的上下文 token（估算） */
export function setContextTokens(tokens: number) {
  contextTokens = Math.max(0, Math.round(tokens));
  emit();
}

/** 重置当前会话上下文估算 */
export function resetContextTokens() {
  contextTokens = 0;
  emit();
}

export function getUsage(): UsageStats {
  ensureToday();
  return {
    today: { ...shape.history[today] },
    totalTokens: shape.total,
    currentConversationContext: contextTokens,
    contextLimit: 32768,
    modelName: "agnes-2.0-flash",
  };
}

export function useUsage(): UsageStats {
  useSyncExternalStore(
    (cb) => {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((x) => x !== cb);
      };
    },
    () => `${JSON.stringify(shape)}|${contextTokens}|${today}`,
    () => `${JSON.stringify(shape)}|${contextTokens}|${today}`,
  );
  useEffect(() => {
    // 分钟级日期检测
    const t = setInterval(() => {
      const now = startOfDay();
      if (now !== today) {
        today = now;
        ensureToday();
        emit();
      }
    }, 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return getUsage();
}
