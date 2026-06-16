import React, { useEffect, useMemo, useState } from "react";
import {
  loadMcpServers,
  saveMcpServers,
  makeMcpId,
  type McpServer,
} from "../lib/storage/extensions";
import {
  LinkIcon,
  PlusIcon,
  XIcon,
  EditIcon,
  RefreshIcon,
  BoltIcon,
  CheckCircleIcon,
  LightbulbIcon,
  TrashIcon,
  ChevronIcon,
  TargetIcon,
} from "./icons";

const baseInput = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "7px 9px",
  fontSize: 12,
  color: "var(--text)",
  outline: "none",
  width: "100%",
  lineHeight: 1.45,
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

type Draft = {
  id?: string;
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  mode: "http" | "sse" | "mock";
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  baseUrl: "",
  apiKey: "",
  mode: "http",
};

function modeBadge(mode: McpServer["mode"]): { label: string; accent: string } {
  switch (mode) {
    case "http":
      return { label: "HTTP", accent: "var(--accent)" };
    case "sse":
      return { label: "SSE", accent: "var(--ok)" };
    case "mock":
      return { label: "MOCK", accent: "var(--text-3)" };
  }
}

export function McPanel({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [servers, setServers] = useState<McpServer[]>(() => loadMcpServers());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, { ok: boolean; msg: string }>
  >({});
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (refreshSignal > 0) setServers(loadMcpServers());
  }, [refreshSignal]);

  useEffect(() => {
    saveMcpServers(servers);
  }, [servers]);

  function toggle(id: string) {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function remove(id: string) {
    if (!confirm("删除该 MCP 配置？")) return;
    setServers((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startAdd() {
    setDraft(emptyDraft);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(s: McpServer) {
    setDraft({
      id: s.id,
      name: s.name,
      description: s.description,
      baseUrl: s.baseUrl,
      apiKey: s.apiKey ?? "",
      mode: s.mode,
    });
    setAdding(false);
    setEditingId(s.id);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function commitDraft() {
    if (!draft.name.trim() || !draft.baseUrl.trim()) {
      alert("请至少填写名称与 Base URL");
      return;
    }
    if (draft.id) {
      setServers((prev) =>
        prev.map((s) =>
          s.id === draft.id
            ? {
                ...s,
                name: draft.name.trim(),
                description: draft.description.trim() || "(无描述)",
                baseUrl: draft.baseUrl.trim(),
                apiKey: draft.apiKey,
                mode: draft.mode,
              }
            : s,
        ),
      );
    } else {
      const s: McpServer = {
        id: makeMcpId(),
        name: draft.name.trim(),
        description: draft.description.trim() || "(无描述)",
        icon: "mcp",
        baseUrl: draft.baseUrl.trim(),
        apiKey: draft.apiKey || "",
        enabled: false,
        mode: draft.mode,
        createdAt: Date.now(),
      };
      setServers((prev) => [s, ...prev]);
    }
    cancelForm();
  }

  async function testServer(id: string) {
    setTestingId(id);
    const s = servers.find((x) => x.id === id);
    if (!s) return;
    try {
      if (s.mode === "mock") {
        await new Promise((r) => setTimeout(r, 500));
        setTestResult((prev) => ({
          ...prev,
          [id]: {
            ok: true,
            msg: "mock 测试通过，可用工具：memory_notes（读/写便签）、memory_clear（清空）",
          },
        }));
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`;
        const res = await fetch(s.baseUrl.replace(/\/$/, ""), {
          method: "GET",
          headers,
          mode: "cors",
        });
        setTestResult((prev) => ({
          ...prev,
          [id]: { ok: true, msg: `连通成功，HTTP ${res.status}` },
        }));
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : String(e);
      setTestResult((prev) => ({
        ...prev,
        [id]: {
          ok: false,
          msg: `测试失败：${msg}（浏览器直连可能被 CORS 拦截；桌面 App 模式下不受影响）`,
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  const enabledCount = useMemo(
    () => servers.filter((s) => s.enabled).length,
    [servers],
  );
  const showForm = adding || !!editingId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 简介区 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: 10,
          borderRadius: 10,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <LinkIcon
          size={14}
          style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            MCP 服务器
          </span>
          <span style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.55 }}>
            已启用{" "}
            <span
              style={{
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              {enabledCount}
            </span>{" "}
            / {servers.length}。启用后，Agent 会把它们提供的工具纳入对话，像内置工具一样调用。
          </span>
        </div>
      </div>

      {/* 新建按钮 / 表单 */}
      {!showForm && (
        <button
          type="button"
          onClick={startAdd}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            fontSize: 12,
            fontWeight: 500,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px dashed var(--border-2)",
            color: "var(--text-2)",
            background: "transparent",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent)";
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background =
              "color-mix(in srgb, var(--accent) 8%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-2)";
            e.currentTarget.style.borderColor = "var(--border-2)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <PlusIcon size={13} />
          添加 MCP 服务器
        </button>
      )}

      {showForm && (
        <ServerForm
          title={editingId ? "编辑 MCP 服务器" : "新增 MCP 服务器"}
          draft={draft}
          onChange={setDraft}
          onCancel={cancelForm}
          onSubmit={commitDraft}
        />
      )}

      {/* 服务器列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {servers.length === 0 && !showForm && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 8,
              padding: "22px 16px",
              borderRadius: 10,
              border: "1px dashed var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-4)",
            }}
          >
            <LightbulbIcon size={22} />
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              还没有配置任何 MCP 服务器。点击上方按钮添加一个。
            </div>
          </div>
        )}

        {servers.map((s) => {
          const isEditing = editingId === s.id;
          const testing = testingId === s.id;
          const result = testResult[s.id];
          const badge = modeBadge(s.mode);
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderRadius: 10,
                border: `1px solid ${
                  s.enabled
                    ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                    : "var(--border)"
                }`,
                background: s.enabled
                  ? "color-mix(in srgb, var(--accent) 6%, var(--surface))"
                  : "var(--surface)",
                padding: 12,
                transition: "all 150ms ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: s.enabled
                          ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                          : "var(--surface-2)",
                        color: s.enabled ? "var(--accent)" : "var(--text-2)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <LinkIcon size={13} />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: s.enabled ? "var(--text)" : "var(--text-2)",
                      }}
                    >
                      {s.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: `color-mix(in srgb, ${badge.accent} 14%, transparent)`,
                        color: badge.accent,
                        border: `1px solid color-mix(in srgb, ${badge.accent} 35%, transparent)`,
                      }}
                    >
                      {badge.label}
                    </span>
                    {s.enabled && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background:
                            "color-mix(in srgb, var(--ok) 14%, transparent)",
                          color: "var(--ok)",
                          border:
                            "1px solid color-mix(in srgb, var(--ok) 35%, transparent)",
                        }}
                      >
                        已启用
                      </span>
                    )}
                  </div>

                  {s.description && s.description !== "(无描述)" && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-3)",
                        lineHeight: 1.55,
                      }}
                    >
                      {s.description}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-4)",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.baseUrl}
                  </div>

                  {testing && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        alignSelf: "flex-start",
                        fontSize: 11,
                        color: "var(--text-2)",
                        background:
                          "color-mix(in srgb, var(--accent) 8%, transparent)",
                        border:
                          "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                        borderRadius: 8,
                        padding: "7px 10px",
                        marginTop: 2,
                      }}
                    >
                      <RefreshIcon
                        size={12}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      正在测试连接…
                    </div>
                  )}
                  {!testing && result && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "flex-start",
                        gap: 8,
                        alignSelf: "flex-start",
                        fontSize: 11,
                        color: result.ok ? "var(--ok)" : "var(--danger)",
                        background: result.ok
                          ? "color-mix(in srgb, var(--ok) 10%, transparent)"
                          : "color-mix(in srgb, var(--danger) 10%, transparent)",
                        border: `1px solid color-mix(in srgb, ${
                          result.ok ? "var(--ok)" : "var(--danger)"
                        } 25%, transparent)`,
                        borderRadius: 8,
                        padding: "7px 10px",
                        lineHeight: 1.55,
                        marginTop: 2,
                      }}
                    >
                      {result.ok ? (
                        <CheckCircleIcon size={12} />
                      ) : (
                        <TargetIcon size={12} />
                      )}
                      <span style={{ wordBreak: "break-word" }}>{result.msg}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => testServer(s.id)}
                    disabled={testing}
                    title="测试连通性"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      color: "var(--text-2)",
                      cursor: testing ? "not-allowed" : "pointer",
                      opacity: testing ? 0.6 : 1,
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!testing) {
                        e.currentTarget.style.color = "var(--accent)";
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--accent) 12%, transparent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-2)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--surface-2)";
                    }}
                  >
                    {testing ? (
                      <RefreshIcon
                        size={11}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <BoltIcon size={11} />
                    )}
                    {testing ? "测试中" : "测试"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : s.id)}
                    title={isEditing ? "收起编辑" : "编辑"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: `1px solid ${
                        isEditing ? "var(--accent)" : "var(--border)"
                      }`,
                      background: isEditing
                        ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                        : "var(--surface-2)",
                      color: isEditing ? "var(--accent)" : "var(--text-3)",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditing) {
                        e.currentTarget.style.color = "var(--accent)";
                        e.currentTarget.style.borderColor = "var(--accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditing) {
                        e.currentTarget.style.color = "var(--text-3)";
                        e.currentTarget.style.borderColor = "var(--border)";
                      }
                    }}
                  >
                    <EditIcon size={11} />
                    编辑
                    <ChevronIcon size={10} />
                  </button>

                  <label
                    title={s.enabled ? "点击禁用" : "点击启用"}
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: 36,
                      height: 20,
                      borderRadius: 999,
                      background: s.enabled ? "var(--accent)" : "var(--surface-2)",
                      border: `1px solid ${
                        s.enabled ? "var(--accent)" : "var(--border)"
                      }`,
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => toggle(s.id)}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer",
                        margin: 0,
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 1,
                        left: s.enabled ? 17 : 1,
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        background: s.enabled ? "var(--bg)" : "var(--text-2)",
                        transition: "all 150ms ease",
                        display: "block",
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    title="删除"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: "1px solid transparent",
                      background: "transparent",
                      color: "var(--text-4)",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--danger)";
                      e.currentTarget.style.background =
                        "color-mix(in srgb, var(--danger) 12%, transparent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-4)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              </div>

              {/* 展开编辑表单 */}
              {isEditing && (
                <ServerForm
                  title="编辑配置"
                  compact
                  draft={draft}
                  onChange={setDraft}
                  onCancel={() => setEditingId(null)}
                  onSubmit={commitDraft}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div
        style={{
          fontSize: 10.5,
          color: "var(--text-4)",
          paddingTop: 8,
          borderTop: "1px solid var(--border)",
          lineHeight: 1.6,
        }}
      >
        桌面模式下不受 CORS 限制；浏览器模式如果看到 CORS 报错，请切换到桌面 App。
      </div>
    </div>
  );
}

function ServerForm({
  title,
  compact,
  draft,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  compact?: boolean;
  draft: Draft;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        padding: compact ? 10 : 12,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LinkIcon size={12} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-3)",
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--danger)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-3)";
          }}
        >
          <XIcon size={14} />
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px",
          gap: 8,
        }}
      >
        <Labeled label="名称">
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="如：GitHub MCP"
            style={baseInput}
          />
        </Labeled>
        <Labeled label="模式">
          <select
            value={draft.mode}
            onChange={(e) =>
              onChange({
                ...draft,
                mode: e.target.value as Draft["mode"],
              })
            }
            style={{ ...baseInput, cursor: "pointer" }}
          >
            <option value="http">http</option>
            <option value="sse">sse</option>
            <option value="mock">mock</option>
          </select>
        </Labeled>
      </div>

      <Labeled label="Base URL" hint="如：http://localhost:3000/mcp">
        <input
          value={draft.baseUrl}
          onChange={(e) => onChange({ ...draft, baseUrl: e.target.value })}
          placeholder="http://host:port/mcp"
          style={{
            ...baseInput,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 11.5,
          }}
        />
      </Labeled>

      <Labeled label="API Key" hint="可选，以 Bearer 方式发送">
        <input
          value={draft.apiKey}
          onChange={(e) => onChange({ ...draft, apiKey: e.target.value })}
          placeholder="留空表示无需鉴权"
          style={{
            ...baseInput,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 11.5,
          }}
        />
      </Labeled>

      <Labeled label="描述">
        <input
          value={draft.description}
          onChange={(e) =>
            onChange({ ...draft, description: e.target.value })
          }
          placeholder="一句话描述这个 MCP 服务"
          style={baseInput}
        />
      </Labeled>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 6,
          marginTop: 2,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            fontSize: 11.5,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text-2)",
            cursor: "pointer",
            transition: "all 150ms ease",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text)";
            e.currentTarget.style.borderColor = "var(--border-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-2)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSubmit}
          style={{
            fontSize: 11.5,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--bg)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-2)";
            e.currentTarget.style.borderColor = "var(--accent-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
        >
          {draft.id ? "保存" : "添加"}
        </button>
      </div>
    </div>
  );
}

function Labeled({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--text-2)",
          fontWeight: 500,
          letterSpacing: 0.2,
        }}
      >
        {label}
        {hint && (
          <span style={{ color: "var(--text-4)", marginLeft: 6, fontWeight: 400 }}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export const McpPanel = McPanel;
