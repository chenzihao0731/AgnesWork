import React, { useEffect, useMemo, useState } from "react";
import {
  loadMcpServers,
  saveMcpServers,
  makeMcpId,
  type McpServer,
} from "../lib/storage/extensions";

export function McpPanel({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [servers, setServers] = useState<McpServer[]>(() => loadMcpServers());
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [id: string]: string }>({});
  const [draft, setDraft] = useState<Partial<McpServer>>({
    name: "",
    description: "",
    icon: "🔗",
    baseUrl: "",
    apiKey: "",
    mode: "http",
  });

  useEffect(() => {
    if (refreshSignal > 0) setServers(loadMcpServers());
  }, [refreshSignal]);

  useEffect(() => {
    saveMcpServers(servers);
  }, [servers]);

  function toggle(id: string) {
    setServers((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function remove(id: string) {
    if (!confirm("删除该 MCP 配置？")) return;
    setServers((prev) => prev.filter((s) => s.id !== id));
  }

  function commitDraft() {
    if (!draft.name?.trim() || !draft.baseUrl?.trim()) {
      alert("请至少填写名称与 Base URL");
      return;
    }
    const s: McpServer = {
      id: makeMcpId(),
      name: draft.name.trim(),
      description: draft.description?.trim() || "(无描述)",
      icon: draft.icon || "🔗",
      baseUrl: draft.baseUrl.trim(),
      apiKey: draft.apiKey || "",
      enabled: false,
      mode: (draft.mode as "http" | "sse" | "mock") || "http",
      createdAt: Date.now(),
    };
    setServers((prev) => [s, ...prev]);
    setAdding(false);
    setDraft({ name: "", description: "", icon: "🔗", baseUrl: "", apiKey: "", mode: "http" });
  }

  async function testServer(id: string) {
    setTestingId(id);
    const s = servers.find((x) => x.id === id);
    if (!s) return;
    try {
      if (s.mode === "mock") {
        // 模拟：等 500ms 返回 2 个工具
        await new Promise((r) => setTimeout(r, 500));
        setTestResult((prev) => ({ ...prev, [id]: "✓ mock 测试通过，可用工具：memory_notes（读/写便签）、memory_clear（清空）" }));
      } else {
        // 简单地 ping 一下 baseUrl（可能会被 CORS 拒绝，但能测连通性）
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`;
        const res = await fetch(s.baseUrl.replace(/\/$/, ""), {
          method: "GET",
          headers,
          mode: "cors",
        });
        setTestResult((prev) => ({ ...prev, [id]: `✓ 连通成功，HTTP ${res.status}` }));
      }
    } catch (e: any) {
      setTestResult((prev) => ({
        ...prev,
        [id]: `✗ 测试失败：${e?.message || String(e)}（浏览器直连可能被 CORS 拦截；桌面 App 模式下不受影响）`,
      }));
    } finally {
      setTestingId(null);
    }
  }

  const enabledCount = useMemo(() => servers.filter((s) => s.enabled).length, [servers]);

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-ink-400 px-1 leading-relaxed">
        <span className="text-white font-medium">{enabledCount}</span> 个 MCP 服务已启用。
        启用后，Agent 会把它们提供的工具纳入对话，像内置工具一样调用。
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-[11.5px] px-2 py-1.5 rounded-md border border-dashed border-ink-700/80 text-ink-300 hover:text-white hover:border-white/40 hover:bg-ink-800/40 transition-all"
        >
          ＋ 添加 MCP 服务
        </button>
      )}

      {adding && (
        <div className="rounded-lg border border-white/20 bg-ink-900/80 p-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]">{draft.icon}</span>
            <input
              value={draft.name || ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="名称（如 'GitHub MCP'）"
              className="flex-1 text-[12px] bg-ink-950 border border-ink-800 rounded px-2 py-1 text-white focus:outline-none focus:border-white/40"
            />
            <select
              value={draft.mode}
              onChange={(e) => setDraft({ ...draft, mode: e.target.value as any })}
              className="text-[11px] bg-ink-950 border border-ink-800 rounded px-1 py-1 text-white"
            >
              <option value="http">http</option>
              <option value="sse">sse</option>
              <option value="mock">mock</option>
            </select>
          </div>
          <input
            value={draft.baseUrl || ""}
            onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
            placeholder="Base URL（例：http://localhost:3000/mcp）"
            className="w-full text-[11.5px] bg-ink-950 border border-ink-800 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-white/40"
          />
          <input
            value={draft.apiKey || ""}
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            placeholder="API Key（可选，以 Bearer 方式发送）"
            className="w-full text-[11.5px] bg-ink-950 border border-ink-800 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-white/40"
          />
          <input
            value={draft.description || ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="一句话描述这个 MCP 服务"
            className="w-full text-[11.5px] bg-ink-950 border border-ink-800 rounded px-2 py-1 text-white focus:outline-none focus:border-white/40"
          />
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setAdding(false)}
              className="text-[11px] px-2 py-1 rounded text-ink-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={commitDraft}
              className="text-[11px] px-2 py-1 rounded bg-white text-ink-900 font-medium hover:bg-ink-100"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* Server 列表 */}
      <div className="space-y-1">
        {servers.length === 0 && !adding && (
          <div className="text-center text-[11px] text-ink-500 py-4">
            没有配置 MCP 服务
          </div>
        )}
        {servers.map((s) => (
          <div
            key={s.id}
            className={`rounded-lg border transition-all p-2 ${
              s.enabled
                ? "border-white/30 bg-ink-800/60"
                : "border-ink-800/60 bg-ink-900/40 hover:bg-ink-800/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px]">{s.icon}</span>
                  <span className={`text-[12.5px] font-medium ${s.enabled ? "text-white" : "text-ink-200"}`}>
                    {s.name}
                  </span>
                  <span className="text-[9px] text-ink-500 px-1.5 rounded bg-ink-800/80 border border-ink-700/60">
                    {s.mode}
                  </span>
                </div>
                <div className="text-[10.5px] text-ink-400 mt-1 leading-relaxed">
                  {s.description}
                </div>
                <div className="text-[10px] text-ink-500 mt-1 font-mono truncate">
                  📡 {s.baseUrl}
                </div>
                {testResult[s.id] && (
                  <div
                    className={`text-[10px] mt-1 px-2 py-1 rounded leading-relaxed ${
                      testResult[s.id].startsWith("✓")
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    }`}
                  >
                    {testResult[s.id]}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => testServer(s.id)}
                  disabled={testingId === s.id}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-300 hover:text-white hover:bg-ink-700"
                  title="测试连通性"
                >
                  {testingId === s.id ? "…" : "test"}
                </button>
                <button
                  onClick={() => toggle(s.id)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    s.enabled ? "bg-emerald-500" : "bg-ink-700"
                  }`}
                  title={s.enabled ? "点击禁用" : "点击启用"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      s.enabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="text-[11px] text-ink-500 hover:text-rose-300 px-1"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-ink-500 pt-1 border-t border-ink-800/40 leading-relaxed">
        💡 桌面模式下不受 CORS 限制；浏览器模式如果看到 CORS 报错，请切换到桌面 App。
      </div>
    </div>
  );
}
