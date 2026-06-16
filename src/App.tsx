import React, { useEffect, useMemo, useRef, useState } from "react";
import { getWindowApi } from "./lib/api/window";
import { AgnesApiClient } from "./lib/api/agnes";
import { OpenAICompatibleProvider } from "./lib/api/openai-provider";
import type { LLMProvider } from "./lib/api/provider";
import {
  AgentEngine,
  type UIChatMessage,
  type ToolInvocation,
} from "./lib/agent/agent";
import {
  createEmptyConversation,
  loadAllConversations,
  loadConfig,
  saveConfig,
  saveConversation,
  type Conversation,
} from "./lib/storage/config";
import {
  loadGoals,
  saveGoals,
  makeGoalId,
  type Goal,
  loadTodos,
  saveTodos,
  makeTodoId,
  type TodoItem,
  makeMilestoneId,
  type Milestone,
} from "./lib/storage/extensions";
import { MessageBubble } from "./components/MessageBubble";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import {
  getWorkspace,
  isDesktopEnv,
  pickDirectoryDialog,
  setWorkspace,
  pickFileDialog,
  readTextFile,
} from "./lib/api/fs";
import { UsagePill, UsagePanel } from "./components/UsagePill";
import { useTheme } from "./lib/theme";
import {
  estimateTokens,
  recordTurn,
  resetContextTokens,
  setContextTokens,
} from "./lib/usage";
import {
  MoonIcon,
  SunIcon,
  SettingsIcon,
  PlusIcon,
  PaperclipIcon,
  SendIcon,
  StopIcon,
  FolderOpenIcon,
  HelpIcon,
  TargetIcon,
  SparkleIcon,
  RocketIcon,
  ChevronIcon,
  ArrowRightIcon,
  LayersIcon,
  CommandIcon,
  FolderIcon,
  GaugeIcon,
} from "./components/icons";

/** 根据配置创建对应的 LLM Provider 实例 */
function makeProvider(apiKey: string): LLMProvider {
  // 默认使用 Agnes Provider；未来可从 localStorage 读取 provider 类型配置
  try {
    const raw = localStorage.getItem("agnes.provider");
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.type === "openai") {
        return new OpenAICompatibleProvider({
          apiKey,
          baseUrl: cfg.baseUrl || "https://api.openai.com/v1",
          model: cfg.model || "gpt-4o",
          supportsImageGen: cfg.supportsImageGen ?? false,
        });
      }
    }
  } catch { /* ignore */ }
  return new AgnesApiClient(apiKey);
}

function summarize(text: string, max = 24): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

type CommandResult =
  | { type: "cmd-handled"; text: string; command: string }
  | { type: "cmd-unknown"; text: string; command: string }
  | { type: "cmd-help"; text: string; command: string };

function parseCommand(text: string): CommandResult | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const raw = trimmed.slice(1);
  const firstSpace = raw.search(/\s/);
  const cmd = firstSpace === -1 ? raw : raw.slice(0, firstSpace);
  const rest = firstSpace === -1 ? "" : raw.slice(firstSpace + 1).trim();
  const lowerCmd = cmd.toLowerCase();

  if (lowerCmd === "help" || lowerCmd === "?") {
    return {
      type: "cmd-help",
      command: "/help",
      text: "命令总览\n\n· /clear 或 /cls  清空当前会话消息\n· /theme [dark|light|toggle]  切换主题\n· /goal add <标题> [high|normal|low] [描述...]  新增目标\n· /goal list  列出所有目标\n· /goal done <关键字>  标记目标完成\n· /todo add <文本>  新增待办\n· /todo list  列出待办\n· /compress <路径> [质量]  图片压缩",
    };
  }

  if (lowerCmd === "clear" || lowerCmd === "cls") {
    return { type: "cmd-handled", command: "/" + cmd, text: "已清空当前会话的消息。" };
  }

  if (lowerCmd === "theme") {
    const arg = rest.split(/\s+/)[0].toLowerCase();
    const mode = arg === "dark" || arg === "light" ? arg : "toggle";
    return { type: "cmd-handled", command: "/theme " + mode, text: "主题已切换为：" + mode };
  }

  if (lowerCmd === "goal") {
    const words = rest.split(/\s+/);
    const sub = words[0]?.toLowerCase() || "";
    const subRest = words.slice(1).join(" ").trim();
    if (sub === "add") {
      if (!subRest) return { type: "cmd-unknown", command: "/goal add", text: "缺少标题" };
      const priTokens = ["high", "normal", "low"] as const;
      let priority: (typeof priTokens)[number] = "normal";
      let titleStart = 0;
      const tokens = subRest.split(/\s+/);
      for (let i = 0; i < Math.min(tokens.length, 2); i++) {
        const low = tokens[i].toLowerCase();
        if ((priTokens as readonly string[]).includes(low)) {
          priority = low as (typeof priTokens)[number];
          titleStart = i + 1;
          break;
        }
      }
      const title = tokens.slice(titleStart).join(" ");
      if (!title) return { type: "cmd-unknown", command: "/goal add", text: "缺少标题" };
      const goals = loadGoals();
      const g: Goal = {
        id: makeGoalId(), title, priority, status: "active", progress: 0,
        milestones: [], tags: [], createdAt: Date.now(), updatedAt: Date.now(),
      };
      saveGoals([g, ...goals]);
      return { type: "cmd-handled", command: "/goal add", text: "已添加目标：「" + title + "」（" + priority + "）" };
    }
    if (sub === "list") {
      const goals = loadGoals();
      const lines = goals.map((g, i) => (i + 1) + ". " + (g.status === "done" ? "✅" : "⏳") + " [" + g.priority + "] " + g.title);
      return { type: "cmd-handled", command: "/goal list", text: "目标列表（共 " + goals.length + "）\n\n" + lines.join("\n") };
    }
    if (sub === "done") {
      if (!subRest) return { type: "cmd-unknown", command: "/goal done", text: "缺少关键字" };
      const goals = loadGoals();
      let idx = goals.findIndex((g) => g.id.toLowerCase() === subRest.toLowerCase());
      if (idx === -1) {
        idx = goals.findIndex((g) =>
          g.title.toLowerCase().startsWith(subRest.toLowerCase()) ||
          g.title.toLowerCase().includes(subRest.toLowerCase()),
        );
      }
      if (idx === -1) return { type: "cmd-unknown", command: "/goal done", text: "未找到匹配的目标" };
      const updated = [...goals];
      updated[idx] = { ...updated[idx], status: "done", progress: 100, updatedAt: Date.now() };
      saveGoals(updated);
      return { type: "cmd-handled", command: "/goal done", text: "已将目标标记为完成：「" + updated[idx].title + "」" };
    }
    return { type: "cmd-unknown", command: "/goal " + sub, text: "未知的 /goal 子命令" };
  }

  if (lowerCmd === "todo") {
    const words = rest.split(/\s+/);
    const sub = words[0]?.toLowerCase() || "";
    const subRest = words.slice(1).join(" ").trim();
    if (sub === "add") {
      if (!subRest) return { type: "cmd-unknown", command: "/todo add", text: "缺少待办内容" };
      const todos = loadTodos();
      const t: TodoItem = { id: makeTodoId(), title: subRest, priority: "normal", done: false, createdAt: Date.now() };
      saveTodos([t, ...todos]);
      return { type: "cmd-handled", command: "/todo add", text: "已添加待办：「" + subRest + "」" };
    }
    if (sub === "list") {
      const todos = loadTodos();
      const lines = todos.map((t, i) => (i + 1) + ". " + (t.done ? "✅" : "⏳") + " [" + t.priority + "] " + t.title);
      return { type: "cmd-handled", command: "/todo list", text: "待办列表（共 " + todos.length + "）\n\n" + lines.join("\n") };
    }
    return { type: "cmd-unknown", command: "/todo " + sub, text: "未知的 /todo 子命令" };
  }

  if (lowerCmd === "compress") {
    const parts = rest.split(/\s+/);
    const filePath = parts[0] || "";
    const quality = parts[1] ? Math.max(0.1, Math.min(1, parseFloat(parts[1]) || 0.8)) : 0.8;
    if (!filePath) return { type: "cmd-unknown", command: "/compress", text: "请提供文件路径" };
    return { type: "cmd-handled", command: "/compress " + filePath + " " + quality, text: "压缩请求已记录（需桌面端执行）" };
  }

  return { type: "cmd-unknown", command: "/" + cmd, text: "未知命令：/" + cmd + "。试试 /help。" };
}

function defaultMilestonesFor(title: string): Milestone[] {
  const clean = title.trim();
  if (!clean) return [];
  return [
    { id: makeMilestoneId(), text: "澄清「" + clean + "」的核心诉求与验收标准", done: false },
    { id: makeMilestoneId(), text: "拆分第一阶段可落地的小任务", done: false },
    { id: makeMilestoneId(), text: "执行并记录关键进展", done: false },
    { id: makeMilestoneId(), text: "复盘：总结结果与下一步", done: false },
  ];
}

async function tryGenerateMilestones(apiKey: string, userInput: string): Promise<Milestone[] | null> {
  try {
    if (!apiKey.trim()) return null;
    const client = makeProvider(apiKey);
    const prompt = "你是一个目标拆解助手。将用户的目标拆解为 3-5 个清晰、可执行的里程碑，以严格的 JSON 数组返回，数组每项包含 title、description、priority（high|normal|low）字段。不要返回任何额外解释。\n\n用户目标：" + userInput.trim();
    const res = await client.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.4, max_tokens: 600 });
    const raw = res?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;
    let jsonText = raw;
    const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeMatch) {
      jsonText = codeMatch[1].trim();
    } else {
      const arrStart = raw.indexOf("[");
      const arrEnd = raw.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        jsonText = raw.slice(arrStart, arrEnd + 1);
      }
    }
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x, i) => {
        const titleRaw = (x.title as string | undefined)?.trim();
        const descRaw = (x.description as string | undefined)?.trim();
        const priRaw = (x.priority as string | undefined)?.toLowerCase?.();
        const priority: Goal["priority"] = priRaw === "high" || priRaw === "low" ? priRaw : "normal";
        const text = descRaw ? (titleRaw ?? "里程碑 " + (i + 1)) + "：" + descRaw : titleRaw ?? "里程碑 " + (i + 1);
        return { id: makeMilestoneId(), text, done: false, priority } as Milestone & { priority?: Goal["priority"] };
      });
  } catch {
    return null;
  }
}

export default function App() {
  const { theme, toggle } = useTheme();
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<UIChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [workspace, setWorkSpace] = useState<string>("");
  const [attachments, setAttachments] = useState<Array<{ path: string; text?: string; imageDataUrl?: string }>>([]);
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [todos, setTodos] = useState<TodoItem[]>(() => loadTodos());
  const [goalMode, setGoalMode] = useState<boolean>(false);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [titleDraft, setTitleDraft] = useState<string>("");

  const engineRef = useRef<AgentEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { saveGoals(goals); }, [goals]);
  useEffect(() => { saveTodos(todos); }, [todos]);

  useEffect(() => {
    const cfg = loadConfig();
    setApiKey(cfg.apiKey);
    if (cfg.apiKey) engineRef.current = new AgentEngine(makeProvider(cfg.apiKey));
    const convs = loadAllConversations();
    if (convs.length === 0) {
      const fresh = createEmptyConversation("新对话");
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(convs);
      const active = cfg.activeConversationId && convs.find((c) => c.id === cfg.activeConversationId)
        ? cfg.activeConversationId
        : convs[0].id;
      setActiveId(active);
    }
    if (isDesktopEnv()) {
      getWorkspace().then((p) => setWorkSpace(p)).catch(() => {
        /* ignore */
      });
    }
  }, []);

  useEffect(() => {
    if (!activeId || conversations.length === 0) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    const uiMsgs: UIChatMessage[] = conv.messages.map((m) => ({
      id: activeId + "-" + (m.createdAt || Math.random()),
      role: m.role, text: m.text, toolInvocations: [], streaming: false, createdAt: m.createdAt,
    }));
    setMessages(uiMsgs);
    const ctx = (conv.messages || []).map((m) => m.text || "").join(" ");
    setContextTokens(estimateTokens(ctx));
    const cfg = loadConfig();
    if (cfg.activeConversationId !== activeId) saveConfig({ ...cfg, activeConversationId: activeId });
  }, [activeId, conversations.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [input]);

  const hasKey = useMemo(() => apiKey.trim().length > 0, [apiKey]);
  const activeConv = conversations.find((c) => c.id === activeId);

  function persistActiveConversation(titleOverride?: string) {
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    const persistedText = messages
      .filter((m) => !m.isError && !m.streaming && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role as "user" | "assistant", text: m.text.slice(0, 20000), createdAt: m.createdAt }));
    const title =
      titleOverride ||
      (conv.title !== "新对话"
        ? conv.title
        : messages.find((m) => m.role === "user")?.text
        ? summarize(messages.find((m) => m.role === "user")!.text, 24)
        : "新对话");
    const updated: Conversation = { ...conv, title, messages: persistedText, updatedAt: Date.now() };
    saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updated : c)).sort((a, b) => b.updatedAt - a.updatedAt));
  }

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => { persistActiveConversation(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function handleNewConversation() {
    const fresh = createEmptyConversation("新对话");
    setConversations((prev) => [fresh, ...prev].sort((a, b) => b.updatedAt - a.updatedAt));
    setActiveId(fresh.id);
    setMessages([]);
    resetContextTokens();
  }

  function handleDeleteConversation(id: string) {
    if (!confirm("删除该会话？")) return;
    try { localStorage.removeItem("agnes.agent.conv.v2:" + id); } catch { /* ignore */ }
    const next = conversations.filter((c) => c.id !== id);
    if (next.length === 0) {
      const fresh = createEmptyConversation("新对话");
      setConversations([fresh]);
      setActiveId(fresh.id);
      setMessages([]);
      return;
    }
    setConversations(next);
    if (activeId === id) setActiveId(next[0].id);
  }

  function handleRenameConversation(id: string, title: string) {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const updated = { ...conv, title, updatedAt: Date.now() };
    saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handlePickWorkspace() {
    try {
      const path = await pickDirectoryDialog();
      await setWorkspace(path);
      setWorkSpace(path);
    } catch (e: any) { alert("选择工作目录失败: " + (e?.message || String(e))); }
  }

  async function handleAttachFile() {
    try {
      const path = await pickFileDialog();
      let text: string | undefined;
      try { text = await readTextFile(path, 12000); } catch { /* ignore */ }
      setAttachments((prev) => [...prev, { path, text: text?.slice(0, 2000) }]);
    } catch (e: any) { alert("选择文件失败: " + (e?.message || String(e))); }
  }

  async function handleGoalMode(userInput: string): Promise<boolean> {
    const trimmed = userInput.trim();
    if (!trimmed) return false;
    const userMsg: UIChatMessage = {
      id: "msg-" + Date.now(), role: "user", text: trimmed,
      toolInvocations: [], streaming: false, createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const newGoal: Goal = {
      id: makeGoalId(), title: trimmed,
      description: "通过对话中的目标模式自动创建。",
      status: "active", priority: "normal", progress: 0,
      milestones: [], tags: [], createdAt: Date.now(), updatedAt: Date.now(),
      conversationId: activeId || undefined,
    };
    let milestones: Milestone[] | null = null;
    setStatus("正在拆解目标里程碑…");
    try { milestones = await tryGenerateMilestones(apiKey, trimmed); } catch { milestones = null; }
    finally { setStatus(""); }
    if (!milestones || milestones.length === 0) milestones = defaultMilestonesFor(trimmed);
    newGoal.milestones = milestones;
    setGoals((prev) => [newGoal, ...prev]);
    setRightPanelOpen(true);
    const systemText = "已为你创建目标：「" + trimmed + "」。\n共拆解出 " + milestones.length + " 个里程碑，可在右侧「目标面板」查看与管理。" +
      (milestones.length > 0 ? "\n\n· " + milestones.map((m) => m.text).join("\n· ") : "");
    const sysMsg: UIChatMessage = {
      id: "msg-sys-" + Date.now(), role: "system", text: systemText,
      toolInvocations: [], streaming: false, createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, sysMsg]);
    return true;
  }

  async function onSend() {
    const userText = input.trim();
    const finalUserText =
      userText ||
      (attachments.length > 0 ? "[附件] 请分析这些文件：" + attachments.map((a) => a.path).join(", ") : "");
    if (!finalUserText.trim()) return;

    if (goalMode && userText) {
      const handled = await handleGoalMode(userText);
      if (handled) { setInput(""); setAttachments([]); return; }
    }

    if (userText) {
      const cmdResult = parseCommand(userText);
      if (cmdResult) {
        const userMsg: UIChatMessage = {
          id: "msg-" + Date.now(), role: "user", text: userText,
          toolInvocations: [], streaming: false, createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        if (cmdResult.command.startsWith("/clear") || cmdResult.command.startsWith("/cls")) {
          setMessages([]); resetContextTokens();
          if (activeId) {
            const conv = conversations.find((c) => c.id === activeId);
            if (conv) {
              const cleared = { ...conv, messages: [], updatedAt: Date.now() };
              saveConversation(cleared);
              setConversations((prev) => prev.map((c) => (c.id === activeId ? cleared : c)));
            }
          }
        } else if (cmdResult.command.startsWith("/theme")) {
          const arg = cmdResult.command.split(" ")[1];
          if (arg === "dark" || arg === "light") {
            const root = document.documentElement;
            if (root && "setAttribute" in root) root.setAttribute("data-theme", arg);
            try { localStorage.setItem("agnes.theme", arg); } catch { /* ignore */ }
          } else { toggle(); }
        }
        const sysMsg: UIChatMessage = {
          id: "msg-sys-" + Date.now(), role: "system", text: "[" + cmdResult.command + "] " + cmdResult.text,
          toolInvocations: [], streaming: false, createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, sysMsg]);
        if (cmdResult.type === "cmd-help") setShowHelp(true);
        setInput(""); setAttachments([]); return;
      }
    }

    if (!hasKey) { setShowSettings(true); return; }
    if (!engineRef.current) engineRef.current = new AgentEngine(makeProvider(apiKey));

    let constructedUserInput = userText;
    if (attachments.length > 0) {
      const preamble = "我附上以下本地文件（我已经读取了文本内容）：\n\n";
      const blocks = attachments.map((a, i) => {
        const body = a.text ? "```\n" + a.text + "\n```" : "[非文本文件]";
        return "【文件 " + (i + 1) + "：" + a.path + "】\n" + body;
      }).join("\n\n");
      constructedUserInput = (userText ? userText + "\n\n" : "") + preamble + blocks;
    }

    const userMsg: UIChatMessage = {
      id: "msg-" + Date.now(), role: "user", text: userText || finalUserText,
      toolInvocations: [], streaming: false, createdAt: Date.now(),
    };
    const startingMessages = [...messages, userMsg];
    setMessages(startingMessages);
    setIsRunning(true); setStatus("思考中..."); setAttachments([]); setInput("");

    const engine = engineRef.current!;
    try {
      let assistantReply = "";
      await engine.run(constructedUserInput, messages, {
        onStatus: setStatus,
        onNewMessage: (msg) => {
          const id = "msg-" + Date.now() + "-" + Math.random();
          setMessages((prev) => [...prev, { ...msg, id }]);
          return id;
        },
        onMessageUpdate: (msgId, partial) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === msgId) {
                const newText = partial.text ?? m.text;
                if (partial.text !== undefined) assistantReply = newText;
                return {
                  ...m, text: newText,
                  toolInvocations: (partial as { toolInvocations?: ToolInvocation[] }).toolInvocations ?? m.toolInvocations,
                  streaming: (partial as { streaming?: boolean }).streaming ?? m.streaming,
                };
              }
              return m;
            }),
          );
        },
      });
      const promptT = estimateTokens(constructedUserInput);
      const completionT = estimateTokens(assistantReply);
      const toolCalls = assistantReply ? 0 : startingMessages.flatMap((m) => m.toolInvocations || []).length;
      recordTurn({ userPrompt: constructedUserInput, assistantReply, toolCalls, promptTokens: promptT, completionTokens: completionT });
      const allText = [...startingMessages.map((m) => m.text), assistantReply].join(" ");
      setContextTokens(estimateTokens(allText));
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: "msg-err-" + Date.now(), role: "assistant", text: "⚠️ 出错：" + (e?.message || String(e)),
        toolInvocations: [], streaming: false, isError: true, createdAt: Date.now(),
      }]);
    }

    setMessages((prev) => prev.map((m) => m.role === "assistant" && m.streaming ? { ...m, streaming: false } : m));
    setIsRunning(false); setStatus("");

    const firstUserMsg = startingMessages.find((m) => m.role === "user");
    if (activeConv?.title === "新对话" && firstUserMsg) generateTitle(firstUserMsg.text, constructedUserInput);
  }

  async function generateTitle(userMsg: string, fullInput: string) {
    if (!apiKey) return;
    try {
      const client = makeProvider(apiKey);
      const prompt = "根据用户的第一条消息，生成一个简短的中文会话标题（不超过20个字，不要引号）。用户消息：" + userMsg.slice(0, 200) + "\n标题：";
      const res = await client.chat({ messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 30 });
      const rawTitle = res.choices?.[0]?.message?.content?.trim() ?? "";
      const title = rawTitle.replace(/^[""]+|[""]+$/g, "").slice(0, 24);
      if (title) persistActiveConversation(title);
    } catch { /* ignore */ }
  }

  function onStop() { engineRef.current?.requestStop(); setIsRunning(false); setStatus("已停止"); }
  function onKeySaved(key: string) { setApiKey(key); engineRef.current = new AgentEngine(makeProvider(key)); setShowSettings(false); }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }
  function startEditTitle() { setTitleDraft(activeConv?.title ?? "新对话"); setEditingTitle(true); }
  function commitEditTitle() {
    const t = titleDraft.trim();
    if (t && activeConv) handleRenameConversation(activeConv.id, t);
    setEditingTitle(false);
  }

  const activeGoalsForConv = useMemo(
    () => goals.filter((g) => g.conversationId === activeId || !g.conversationId),
    [goals, activeId],
  );

  return <AppUi
    theme={theme} toggle={toggle}
    conversations={conversations} activeId={activeId}
    onSelect={setActiveId} onNewConversation={handleNewConversation}
    onDelete={handleDeleteConversation} onRename={handleRenameConversation}
    messages={messages} input={input} setInput={setInput}
    isRunning={isRunning} status={status} hasKey={hasKey}
    showSettings={showSettings} setShowSettings={setShowSettings}
    showUsage={showUsage} setShowUsage={setShowUsage}
    showHelp={showHelp} setShowHelp={setShowHelp}
    attachments={attachments} setAttachments={setAttachments}
    onSend={onSend} onStop={onStop} onKeyDown={onKeyDown}
    onKeySaved={onKeySaved} handlePickWorkspace={handlePickWorkspace}
    handleAttachFile={handleAttachFile} workspace={workspace}
    editingTitle={editingTitle} titleDraft={titleDraft}
    setTitleDraft={setTitleDraft} startEditTitle={startEditTitle}
    commitEditTitle={commitEditTitle} rightPanelOpen={rightPanelOpen}
    setRightPanelOpen={setRightPanelOpen} goalMode={goalMode}
    setGoalMode={setGoalMode} goals={goals} todos={todos}
    activeGoalsForConv={activeGoalsForConv}
    setGoals={setGoals} setTodos={setTodos}
    textareaRef={textareaRef} scrollRef={scrollRef}
  />;
}

interface AppUiProps {
  theme: string; toggle: () => void;
  conversations: Conversation[]; activeId: string;
  onSelect: (id: string) => void; onNewConversation: () => void;
  onDelete: (id: string) => void; onRename: (id: string, title: string) => void;
  messages: UIChatMessage[]; input: string; setInput: (v: string) => void;
  isRunning: boolean; status: string; hasKey: boolean;
  showSettings: boolean; setShowSettings: (v: boolean) => void;
  showUsage: boolean; setShowUsage: (v: boolean) => void;
  showHelp: boolean; setShowHelp: (v: boolean) => void;
  attachments: Array<{ path: string; text?: string; imageDataUrl?: string }>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<{ path: string; text?: string; imageDataUrl?: string }>>>;
  onSend: () => void; onStop: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeySaved: (key: string) => void; handlePickWorkspace: () => void;
  handleAttachFile: () => void; workspace: string;
  editingTitle: boolean; titleDraft: string; setTitleDraft: (v: string) => void;
  startEditTitle: () => void; commitEditTitle: () => void;
  rightPanelOpen: boolean; setRightPanelOpen: (v: boolean) => void;
  goalMode: boolean; setGoalMode: (v: boolean) => void;
  goals: Goal[]; todos: TodoItem[];
  activeGoalsForConv: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
}

function AppUi(p: AppUiProps) {
  const activeConv = p.conversations.find((c) => c.id === p.activeId);
  const win = getWindowApi();
  return (
    <div className="h-full w-full flex flex-col" style={{ background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)", color: "var(--text)" }}>
      {/* 自定义标题栏 */}
      <div className="titlebar-drag shrink-0 h-9 px-4 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <img src="/icons/icon.png" className="w-5 h-5 titlebar-no-drag" alt="" />
          <span className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>AgnesWork</span>
        </div>
        <div className="flex items-center gap-1 titlebar-no-drag">
          <button
            onClick={async () => { try { await win.minimize(); } catch { /* noop */ } }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition"
            title="最小化">
            <svg width="12" height="2" viewBox="0 0 12 2"><rect width="12" height="2" rx="1" fill="currentColor" opacity="0.6"/></svg>
          </button>
          <button
            onClick={async () => { try { await win.toggleMaximize(); } catch { /* noop */ } }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition"
            title="最大化">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/></svg>
          </button>
          <button
            onClick={async () => { try { await win.close(); } catch { /* noop */ } }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 transition"
            title="关闭">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
      <Sidebar
        conversations={p.conversations} activeId={p.activeId}
        onSelect={p.onSelect} onNewConversation={p.onNewConversation}
        onDelete={p.onDelete} onRename={p.onRename}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 px-5 py-2 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
          <div className="min-w-0 flex items-center gap-3">
            <div className="min-w-0">
              {p.editingTitle ? (
                <input autoFocus value={p.titleDraft}
                  onChange={(e) => p.setTitleDraft(e.target.value)}
                  onBlur={p.commitEditTitle}
                  onKeyDown={(e) => { if (e.key === "Enter") p.commitEditTitle(); if (e.key === "Escape") p.commitEditTitle(); }}
                  className="text-[13.5px] font-semibold rounded-md px-2 py-1 focus:outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--text)" }} />
              ) : (
                <button onClick={p.startEditTitle}
                  className="text-[13.5px] font-semibold truncate text-left hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text)" }} title="点击重命名会话">
                  {activeConv?.title || "新对话"}
                </button>
              )}
              <div className="text-[11px] flex items-center gap-2 mt-0.5" style={{ color: "var(--text-3)" }}>
                <span>{p.messages.filter((m) => m.role === "user").length} 条用户提问</span>
                {p.activeGoalsForConv.length > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                    <TargetIcon className="w-3 h-3" /> {p.activeGoalsForConv.length} 个目标
                  </span>
                )}
              </div>
            </div>
          </div>
          <HeaderRight {...p} />
        </header>

        {p.status && (
          <div className="px-5 py-2 text-[11.5px] flex items-center gap-2"
            style={{ color: "var(--text-2)", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", animation: "blink 1.2s ease-in-out infinite" }} />
            <span>{p.status}</span>
            {p.workspace && isDesktopEnv() && <span style={{ color: "var(--text-4)" }}>· 工作目录：{p.workspace}</span>}
          </div>
        )}

        <div ref={p.scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollable">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {p.messages.length === 0 && <EmptyState setInput={p.setInput} />}
            {p.messages.filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system").map((m) => {
              if (m.role === "system") {
                return (
                  <div key={m.id} className="rounded-xl px-4 py-2.5 text-[12.5px] leading-relaxed mx-auto max-w-xl fade-in"
                    style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--text)", boxShadow: "var(--shadow-sm)", whiteSpace: "pre-wrap" }}>
                    <div className="text-[11px] font-medium mb-1" style={{ color: "var(--accent)" }}>
                      <span className="flex items-center gap-1"><SparkleIcon className="w-3 h-3" /> 系统</span>
                    </div>
                    {m.text}
                  </div>
                );
              }
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end fade-in">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff", boxShadow: "0 6px 20px -8px var(--accent)", whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </div>
                  </div>
                );
              }
              return <MessageBubble key={m.id} role={m.role as "user" | "assistant"} text={m.text} toolInvocations={m.toolInvocations} streaming={m.streaming} isError={m.isError} />;
            })}
          </div>
        </div>

        {p.attachments.length > 0 && (
          <div className="px-4 pb-1 flex flex-wrap gap-2">
            {p.attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                <PaperclipIcon className="w-3 h-3" />
                <span className="truncate max-w-[280px]">{a.path}</span>
                <button onClick={() => p.setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  style={{ color: "var(--text-4)" }} className="hover:opacity-80">×</button>
              </div>
            ))}
          </div>
        )}

        <footer className="shrink-0 px-4 pt-2 pb-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl transition-all overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid " + (p.hasKey ? "var(--border)" : "color-mix(in srgb, var(--warn) 40%, transparent)"), boxShadow: "var(--shadow-sm)" }}>
              <textarea ref={p.textareaRef} value={p.input}
                onChange={(e) => p.setInput(e.target.value)} onKeyDown={p.onKeyDown}
                rows={1}
                placeholder={
                  p.goalMode
                    ? "描述你要达成的目标，Agent 将自动拆解为里程碑…"
                    : p.hasKey
                    ? "输入消息，回车发送，Shift+回车换行。" + (isDesktopEnv() ? "可用回形针图标附加本地文件。" : "")
                    : "请先在右上角「设置」中填入你的 Agnes API Key..."
                }
                disabled={!p.hasKey || p.isRunning}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed max-h-[220px] focus:outline-none w-full"
                style={{ color: "var(--text)" }} />
              <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-2.5 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1">
                  {isDesktopEnv() && (
                    <IconButton title="附加本地文件" onClick={p.handleAttachFile}>
                      <PaperclipIcon className="w-4 h-4" />
                    </IconButton>
                  )}
                  <IconButton title="命令提示" onClick={() => p.setInput(p.input + (p.input.endsWith("/") ? "" : "/"))}>
                    <CommandIcon className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="工作目录" onClick={p.handlePickWorkspace}>
                    <FolderIcon className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="当前会话用量" onClick={() => p.setShowUsage(true)}>
                    <GaugeIcon className="w-4 h-4" />
                  </IconButton>
                  <button title="目标模式" onClick={() => p.setGoalMode(!p.goalMode)}
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg transition-all text-[11.5px] font-medium"
                    style={
                      p.goalMode
                        ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff", boxShadow: "0 4px 14px -4px var(--accent)" }
                        : { background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }
                    }>
                    <SparkleIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">交给Agent</span>
                    <span className="sm:hidden">目标</span>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {p.isRunning ? (
                    <button onClick={p.onStop}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all"
                      style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)" }}>
                      <StopIcon className="w-3.5 h-3.5" /> 停止
                    </button>
                  ) : (
                    <button onClick={p.onSend}
                      disabled={(!p.input.trim() && p.attachments.length === 0) || !p.hasKey}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff", boxShadow: "0 4px 14px -4px var(--accent)" }}>
                      {p.goalMode ? <><RocketIcon className="w-3.5 h-3.5" /> 创建目标</> : <><SendIcon className="w-3.5 h-3.5" /> 发送</>}
                      <ArrowRightIcon className="w-3 h-3 opacity-80" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-center" style={{ color: "var(--text-4)" }}>
              <span className="inline-flex items-center gap-1.5"><LayersIcon className="w-3 h-3" /> AgnesWork · 多模态桌面智能助手</span>
            </div>
          </div>
        </footer>
      </main>

      {p.rightPanelOpen && (
        <RightPanel goals={p.goals} todos={p.todos} conversationId={p.activeId}
          onAction={(kind, payload) => {
            if (kind === "update-goals") p.setGoals(payload as Goal[]);
            else if (kind === "add-goal") p.setGoals((prev) => [payload as Goal, ...prev]);
            else if (kind === "toggle-goal") p.setGoals((prev) => prev.map((g) => g.id === payload ? { ...g, status: g.status === "done" ? "active" : "done", progress: g.status === "done" ? 0 : 100, updatedAt: Date.now() } : g));
            else if (kind === "delete-goal") p.setGoals((prev) => prev.filter((g) => g.id !== payload));
            else if (kind === "update-todos") p.setTodos(payload as TodoItem[]);
          }} />
      )}
      </div>

      <SettingsPanel open={p.showSettings} onClose={() => p.setShowSettings(false)} onSaved={p.onKeySaved} />

      {p.showUsage && <UsageModal onClose={() => p.setShowUsage(false)} />}
      {p.showHelp && <HelpModal onClose={() => p.setShowHelp(false)} />}
    </div>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button title={title} onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all"
      style={{ color: "var(--text-3)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}>
      {children}
    </button>
  );
}

function HeaderRight(p: {
  hasKey: boolean; workspace: string; theme: string; toggle: () => void;
  setShowSettings: (v: boolean) => void; setShowUsage: (v: boolean) => void;
  setShowHelp: (v: boolean) => void; setRightPanelOpen: (v: boolean) => void;
  rightPanelOpen: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <UsagePill onOpen={() => p.setShowUsage(true)} />
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]"
        style={{
          background: p.hasKey ? "color-mix(in srgb, var(--ok) 12%, transparent)" : "color-mix(in srgb, var(--warn) 12%, transparent)",
          color: p.hasKey ? "var(--ok)" : "var(--warn)",
          border: "1px solid " + (p.hasKey ? "color-mix(in srgb, var(--ok) 30%, transparent)" : "color-mix(in srgb, var(--warn) 30%, transparent)"),
        }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.hasKey ? "var(--ok)" : "var(--warn)", animation: p.hasKey ? "none" : "blink 1.2s ease-in-out infinite" }} />
        {p.hasKey ? "已连接" : "未配置 Key"}
      </span>

      <button onClick={p.toggle}
        title="切换主题"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all"
        style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}>
        {p.theme === "dark" ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
      </button>

      <button onClick={() => p.setShowSettings(true)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all"
        title="设置"
        style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}>
        <SettingsIcon className="w-4 h-4" />
      </button>

      <button onClick={() => p.setShowHelp(true)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all"
        title="命令与工具帮助"
        style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}>
        <HelpIcon className="w-4 h-4" />
      </button>

      <button onClick={() => p.setRightPanelOpen(!p.rightPanelOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all"
        title={p.rightPanelOpen ? "关闭目标面板" : "打开目标面板"}
        style={
          p.rightPanelOpen
            ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 14px -4px var(--accent)" }
            : { background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }
        }
        onMouseEnter={(e) => {
          if (!p.rightPanelOpen) (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          if (!p.rightPanelOpen) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
        }}>
        <TargetIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">目标面板</span>
        <ChevronIcon className="w-3 h-3" style={{ transform: p.rightPanelOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
      </button>
    </div>
  );
}

function EmptyState({ setInput }: { setInput: (v: string) => void }) {
  const examples = [
    { label: "帮我画一张日落时的城市天际线，电影感", hint: "示例：生成图片" },
    { label: "先查看工作目录结构，再读一个 README 并总结", hint: "示例：查看工作目录" },
    { label: "做一个 5 秒的视频：一只猫在夕阳海滩上行走，电影感运镜", hint: "示例：生成视频" },
    { label: "写一段关于多模态 AI 的介绍，并保存到 workspace/intro.md", hint: "示例：写文件到本地" },
  ];
  return (
    <div className="mt-2 mb-2">
      <div className="rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="text-base font-semibold mb-1 grad-text">你好，我是 Agnes Agent</div>
        <div className="text-sm leading-relaxed space-y-1" style={{ color: "var(--text-2)" }}>
          <p>我可以：</p>
          <ul className="list-disc pl-5 space-y-0.5" style={{ color: "var(--text-2)" }}>
            <li>与你多轮对话聊天；</li>
            <li>调用 AI 生成图片 / 视频；</li>
            <li>在桌面端查看并读写你本地工作目录中的文件；</li>
            <li>切换「交给Agent」模式后，输入目标即可自动拆解里程碑。</li>
          </ul>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
          {examples.map((e) => (
            <button key={e.label} onClick={() => setInput(e.label)}
              className="text-left rounded-lg px-3 py-2 transition-all"
              style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)"; (ev.currentTarget as HTMLButtonElement).style.color = "var(--text)"; (ev.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-2)"; }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (ev.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; (ev.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}>
              <div className="font-medium text-[12.5px]" style={{ color: "var(--text)" }}>{e.hint}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>{e.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsageModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl fade-in"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[15px] font-semibold">用量与配额</div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
            ×
          </button>
        </div>
        <UsagePanel />
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[15px] font-semibold">命令与工具帮助</div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
            ×
          </button>
        </div>
        <div className="cmd-grid">
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>斜杠命令</h3>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/help</code> — 打开本面板</li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/clear</code> / <code style={codeStyle()}>/cls</code> — 清空当前会话</li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/theme</code> — 切换主题</li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/goal add</code> — 添加目标</li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/goal list</code> — 目标列表</li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/goal done</code> — 标记完成</li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/todo add</code> / <code style={codeStyle()}>/todo list</code></li>
              <li style={{ marginBottom: "4px" }}><code style={codeStyle()}>/compress</code> — 图片压缩</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>工具与能力（Agent 自主调用）</h3>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "4px" }}><strong style={{ color: "var(--accent)" }}>generate_image</strong> — 根据描述生成图片</li>
              <li style={{ marginBottom: "4px" }}><strong style={{ color: "var(--accent)" }}>image_to_image</strong> — 参考图像风格生成新图</li>
              <li style={{ marginBottom: "4px" }}><strong style={{ color: "var(--accent)" }}>read_text_file</strong> — 读取本地文本文件</li>
              <li style={{ marginBottom: "4px" }}><strong style={{ color: "var(--accent)" }}>list_directory</strong> — 列出工作目录</li>
              <li style={{ marginBottom: "4px" }}><strong style={{ color: "var(--accent)" }}>write_text_file</strong> — 写入本地文件</li>
              <li style={{ marginBottom: "4px" }}><strong style={{ color: "var(--accent)" }}>compress_image</strong> — 压缩图片（桌面端）</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-3 text-[11.5px] leading-relaxed" style={{ borderTop: "1px solid var(--border)", color: "var(--text-3)" }}>
          小贴士：以 <code style={codeStyle()}>/</code> 开头的输入会被视为命令，直接本地处理，不会发送给 AI。
        </div>
      </div>
    </div>
  );
}

function codeStyle(): React.CSSProperties {
  return {
    color: "var(--accent)",
    fontFamily: '"JetBrains Mono", "Menlo", "Consolas", monospace',
    fontSize: "11.5px",
    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
    padding: "1px 5px",
    borderRadius: "4px",
  };
}
