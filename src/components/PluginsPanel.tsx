import React, { useEffect, useState } from "react";
import {
  loadPlugins,
  savePlugins,
  makePluginId,
  type Plugin,
} from "../lib/storage/extensions";
import { PluginIcon, LinkIcon, PlusIcon, XIcon, BoltIcon, SettingsIcon } from "./icons";

export function PluginsPanel({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [items, setItems] = useState<Plugin[]>(() => loadPlugins());
  const [editingNew, setEditingNew] = useState<boolean>(false);
  const [draft, setDraft] = useState<Partial<Plugin>>({
    type: "simple",
  });

  useEffect(() => {
    if (refreshSignal > 0) setItems(loadPlugins());
  }, [refreshSignal]);

  useEffect(() => {
    savePlugins(items);
  }, [items]);

  function toggle(id: string) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }

  function remove(id: string) {
    if (!confirm("删除该插件？")) return;
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function startAdd(type: "simple" | "http_api") {
    setDraft({
      type,
      name: type === "http_api" ? "新 API 插件" : "新提示插件",
      description: "",
      systemPrompt: type === "simple" ? "" : undefined,
      api:
        type === "http_api"
          ? {
              url: "https://api.example.com/endpoint",
              method: "GET" as const,
              headers: {},
              bodyTemplate: "",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "用户输入" },
                },
                required: ["query"],
              },
            }
          : undefined,
    });
    setEditingNew(true);
  }

  function commitDraft() {
    if (!draft.name?.trim()) {
      alert("请填写插件名称");
      return;
    }
    const p: Plugin = {
      id: makePluginId(),
      name: draft.name.trim(),
      description: draft.description?.trim() || "(无描述)",
      type: draft.type as "simple" | "http_api",
      enabled: false,
      systemPrompt: draft.type === "simple" ? draft.systemPrompt || "" : undefined,
      api: draft.type === "http_api" ? draft.api : undefined,
      createdAt: Date.now(),
    };
    setItems((prev) => [p, ...prev]);
    setEditingNew(false);
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#fff",
            }}
          >
            <PluginIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
              插件管理
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
              共 {items.length} 个插件
            </div>
          </div>
        </div>
      </div>

      {/* 添加按钮 */}
      {!editingNew && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => startAdd("simple")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium transition-all"
            style={{
              background: "var(--bg)",
              color: "var(--text-2)",
              border: "1px dashed var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg)";
              e.currentTarget.style.color = "var(--text-2)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <PlusIcon className="w-4 h-4" />
            提示插件
          </button>
          <button
            onClick={() => startAdd("http_api")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium transition-all"
            style={{
              background: "var(--bg)",
              color: "var(--text-2)",
              border: "1px dashed var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg)";
              e.currentTarget.style.color = "var(--text-2)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <PlusIcon className="w-4 h-4" />
            HTTP 插件
          </button>
        </div>
      )}

      {editingNew && (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  color: "#fff",
                }}
              >
                {draft.type === "http_api" ? (
                  <LinkIcon className="w-3.5 h-3.5" />
                ) : (
                  <PluginIcon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                {draft.type === "http_api" ? "新增 HTTP 插件" : "新增提示插件"}
              </span>
            </div>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-2)",
                border: "1px solid var(--border)",
              }}
            >
              <BoltIcon className="w-3 h-3" />
              {draft.type}
            </span>
          </div>

          <div className="space-y-1">
            <label
              className="block text-[11px] font-medium"
              style={{ color: "var(--text-2)" }}
            >
              名称
            </label>
            <input
              value={draft.name || ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="插件名"
              className="input text-[13px]"
            />
          </div>

          <div className="space-y-1">
            <label
              className="block text-[11px] font-medium"
              style={{ color: "var(--text-2)" }}
            >
              描述
            </label>
            <input
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="一句话描述：这个插件是做什么的？"
              className="input text-[12.5px]"
            />
          </div>

          {draft.type === "simple" ? (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between">
                <label
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-2)" }}
                >
                  System Prompt
                </label>
                <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                  影响 AI 在整个对话中的行为
                </span>
              </div>
              <textarea
                value={draft.systemPrompt || ""}
                onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                placeholder="在此写入 system prompt..."
                rows={4}
                className="input text-[12.5px] font-mono leading-relaxed"
              />
            </div>
          ) : (
            <div
              className="rounded-lg p-3 space-y-3"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between">
                <label
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-2)" }}
                >
                  接口地址
                </label>
                <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                  Agent 会在对话中调用该 API
                </span>
              </div>
              <div className="flex items-stretch gap-2">
                <select
                  value={draft.api?.method || "GET"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      api: {
                        ...(draft.api || {}),
                        method: e.target.value as "GET" | "POST",
                      },
                    })
                  }
                  className="input text-[12px] font-mono"
                  style={{ width: "auto", flexShrink: 0, padding: "0.5rem 0.75rem" }}
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>
                <input
                  value={draft.api?.url || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      api: { ...(draft.api || {}), url: e.target.value },
                    })
                  }
                  placeholder="https://api.example.com/endpoint"
                  className="input text-[12.5px] font-mono flex-1"
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-2)" }}
                >
                  Input Schema（JSON）
                </label>
                <textarea
                  value={JSON.stringify(draft.api?.inputSchema || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setDraft({ ...draft, api: { ...(draft.api || {}), inputSchema: parsed } });
                    } catch {
                      // 允许用户输入过程中临时无效
                    }
                  }}
                  placeholder='{ "properties": { "q": { "type": "string" } } }'
                  rows={5}
                  className="input text-[11.5px] font-mono leading-tight"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setEditingNew(false)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-2)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-2)";
                e.currentTarget.style.background = "var(--surface-2)";
              }}
            >
              <XIcon className="w-3.5 h-3.5" />
              取消
            </button>
            <button
              onClick={commitDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                boxShadow: "0 4px 14px -4px var(--accent)",
              }}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              添加
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && !editingNew && (
          <div
            className="text-center py-12 rounded-xl"
            style={{
              color: "var(--text-3)",
              background: "var(--bg)",
              border: "1px dashed var(--border)",
            }}
          >
            <div className="text-[36px] mb-2"></div>
            <div className="text-[13px] font-medium mb-1" style={{ color: "var(--text-2)" }}>
              还没有自定义插件
            </div>
            <div className="text-[11px]">
              点击上方按钮添加提示插件或 HTTP 插件
            </div>
          </div>
        )}
        {items.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-4 transition-all"
            style={{
              background: p.enabled ? "var(--surface)" : "var(--bg)",
              border: "1px solid var(--border)",
              opacity: p.enabled ? 1 : 0.85,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.borderColor = "var(--border-2)";
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = p.enabled ? "var(--surface)" : "var(--bg)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.opacity = p.enabled ? "1" : "0.85";
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: p.enabled
                        ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                        : "var(--surface-2)",
                      color: p.enabled ? "#fff" : "var(--text-2)",
                    }}
                  >
                    {p.type === "http_api" ? (
                      <LinkIcon className="w-4 h-4" />
                    ) : (
                      <PluginIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] font-medium truncate"
                        style={{ color: p.enabled ? "var(--text)" : "var(--text-2)" }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0"
                        style={{
                          background: "var(--surface-2)",
                          color: "var(--text-3)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {p.type}
                      </span>
                    </div>
                    <div
                      className="text-[11px] mt-0.5 leading-relaxed"
                      style={{ color: "var(--text-3)" }}
                    >
                      {p.description}
                    </div>
                  </div>
                </div>
                {p.type === "simple" && p.systemPrompt && (
                  <div
                    className="mt-2 text-[11px] leading-relaxed rounded-lg p-2.5 font-mono"
                    style={{
                      color: "var(--text-3)",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {p.systemPrompt.slice(0, 160)}
                    {p.systemPrompt.length > 160 ? "…" : ""}
                  </div>
                )}
                {p.type === "http_api" && p.api && (
                  <div
                    className="mt-2 text-[11px] leading-relaxed rounded-lg p-2.5 font-mono"
                    style={{
                      color: "var(--text-3)",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        background: "var(--surface-2)",
                        color: p.api.method === "POST" ? "var(--warn)" : "var(--ok)",
                      }}
                    >
                      {p.api.method}
                    </span>
                    {p.api.url}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggle(p.id)}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={{
                    background: p.enabled
                      ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                      : "var(--surface-3)",
                    boxShadow: p.enabled ? "0 2px 8px -2px var(--accent)" : "none",
                  }}
                  title={p.enabled ? "点击禁用" : "点击启用"}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                    style={{
                      transform: p.enabled ? "translateX(20px)" : "translateX(0)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    color: "var(--text-3)",
                    border: "1px solid transparent",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--danger)";
                    e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 12%, transparent)";
                    e.currentTarget.style.borderColor =
                      "color-mix(in srgb, var(--danger) 30%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-3)";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                  title="删除"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="text-[11px] pt-3 mt-4 leading-relaxed rounded-lg px-4 py-3"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
        }}
      >
        <span className="inline-flex items-center gap-1 mr-1">
          <SettingsIcon className="w-3.5 h-3.5" />
        </span>
        <span style={{ color: "var(--text-2)", fontWeight: 500 }}>说明：</span>
        simple 型：只注入 system prompt。http_api 型：在对话中让 Agent 调用你的外部 API（会把响应当 tool result 处理）。
      </div>
    </div>
  );
}
