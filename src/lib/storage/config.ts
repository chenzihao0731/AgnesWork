// 本地存储：支持多会话 + API Key
// 为了兼容浏览器（纯前端）和 Tauri 两种运行环境：
// - 在浏览器中：使用 localStorage
// - 在 Tauri 中：优先调用 Tauri 后端的读写命令（更安全的本地文件）
// 本模块只负责 localStorage 层，Tauri 专用命令由 Rust 后端提供。

export interface PersistedMessage {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: PersistedMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AppConfig {
  apiKey: string;
  activeConversationId?: string;
}

const CONFIG_KEY = "agnes.agent.config.v2";
const CONV_PREFIX = "agnes.agent.conv.v2:";

function convKey(id: string) {
  return CONV_PREFIX + id;
}

function readAllKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CONV_PREFIX)) keys.push(k);
  }
  return keys;
}

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return {
        apiKey: parsed.apiKey ?? "",
        activeConversationId: parsed.activeConversationId ?? "",
      };
    }
  } catch {
    // ignore
  }
  return { apiKey: "", activeConversationId: "" };
}

export function saveConfig(cfg: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function loadAllConversations(): Conversation[] {
  const list: Conversation[] = [];
  for (const key of readAllKeys()) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) list.push(JSON.parse(raw) as Conversation);
    } catch {
      // ignore corrupt
    }
  }
  // 按更新时间倒序
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

export function saveConversation(conv: Conversation) {
  // 只保留最近 200 条消息，避免无限膨胀
  const trimmed: Conversation = {
    ...conv,
    messages: conv.messages.slice(-200),
    updatedAt: Date.now(),
  };
  localStorage.setItem(convKey(conv.id), JSON.stringify(trimmed));
}

export function deleteConversation(id: string) {
  localStorage.removeItem(convKey(id));
}

export function createEmptyConversation(title = "新对话"): Conversation {
  const id =
    "c_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  const conv: Conversation = {
    id,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  saveConversation(conv);
  return conv;
}

/** 把 UI 层消息转成可持久化消息（只保留文本） */
export function toPersistedMessages(
  list: Array<{ role: "user" | "assistant"; text: string; createdAt: number }>
): PersistedMessage[] {
  return list.map((m) => ({
    role: m.role,
    text: m.text.slice(0, 20000),
    createdAt: m.createdAt,
  }));
}

export function clearAllConversations() {
  for (const key of readAllKeys()) localStorage.removeItem(key);
}
