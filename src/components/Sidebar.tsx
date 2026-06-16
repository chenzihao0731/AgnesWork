import React, { useEffect, useState } from "react";
import {
  ChatIcon, TodoIcon, SkillIcon, PluginIcon, LinkIcon,
  PlusIcon, XIcon, EditIcon, TrashIcon, CheckCircleIcon,
  LayersIcon,
} from "./icons";
import { type Conversation } from "../lib/storage/config";
import { TodoPanel } from "./TodoPanel";
import { SkillsPanel } from "./SkillsPanel";
import { PluginsPanel } from "./PluginsPanel";
import { McPanel } from "./McPanel";
import { loadGoals, loadTodos } from "../lib/storage/extensions";

type Tab = "conversations" | "todos" | "skills" | "plugins" | "mcp";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
};

const TABS: Array<{
  key: Tab;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
}> = [
  { key: "conversations", label: "会话", Icon: ChatIcon },
  { key: "todos", label: "Todo", Icon: TodoIcon },
  { key: "skills", label: "Skills", Icon: SkillIcon },
  { key: "plugins", label: "插件", Icon: PluginIcon },
  { key: "mcp", label: "MCP", Icon: LinkIcon },
];

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
  onDelete,
  onRename,
}: SidebarProps) {
  const [tab, setTab] = useState<Tab>("conversations");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [stats, setStats] = useState({ goals: 0, todos: 0 });

  useEffect(() => {
    const refresh = () => {
      setStats({
        goals: loadGoals().length,
        todos: loadTodos().length,
      });
    };
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    const originalSetItem = Storage.prototype.setItem;
    return () => {
      window.removeEventListener("storage", handler);
      void originalSetItem;
    };
  }, []);

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      onRename(renamingId, renameText.trim());
    }
    setRenamingId(null);
    setRenameText("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameText("");
  };

  const startRename = (id: string, title: string) => {
    setRenamingId(id);
    setRenameText(title);
  };

  return (
    <aside
      className="h-full flex flex-col shrink-0 w-72 max-w-[20rem] min-w-[16rem] overflow-hidden"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* 顶部：品牌与 Tab */}
      <div
        className="px-4 pt-3.5 pb-3 flex items-center gap-2.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "#fff",
            boxShadow: "0 6px 18px -6px var(--accent)",
          }}
        >
          <LayersIcon className="w-5 h-5" />
        </div>
        <div
          className="text-[13.5px] font-semibold truncate"
          style={{ color: "var(--text)" }}
        >
          Agnes Agent
        </div>
      </div>

      {/* 第二行：Tab 切换 */}
      <div className="px-3 pt-3 pb-2 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.Icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="shrink-0 text-[11.5px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      color: "#fff",
                      boxShadow: "0 4px 12px -4px var(--accent)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--text-3)",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--surface-hover)";
                  e.currentTarget.style.color = "var(--text-2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-3)";
                }
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div
        className="flex-1 overflow-y-auto scrollable px-3 pb-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {tab === "conversations" && (
          <div className="space-y-2 pt-1">
            <button
              onClick={onNewConversation}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                boxShadow: "0 4px 12px -4px var(--accent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>新建会话</span>
            </button>

            {conversations.length === 0 ? (
              <div
                className="mt-6 flex flex-col items-center gap-2 py-6 rounded-xl"
                style={{
                  color: "var(--text-3)",
                  background: "var(--surface-2)",
                  border: "1px dashed var(--border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "#fff",
                  }}
                >
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
                <div className="text-[12px]">还没有会话</div>
                <div className="text-[11px]" style={{ color: "var(--text-4)" }}>
                  点击上方按钮创建第一个会话
                </div>
              </div>
            ) : (
              conversations.map((c) => {
                const active = c.id === activeId;
                const renaming = c.id === renamingId;
                return (
                  <div
                    key={c.id}
                    onClick={() => !renaming && onSelect(c.id)}
                    className="group rounded-lg px-3 py-2 cursor-pointer transition-all relative"
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: `1px solid ${
                        active ? "var(--accent)" : "transparent"
                      }`,
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                      paddingLeft: active ? "10px" : "12px",
                      borderLeft: active
                        ? "3px solid var(--accent)"
                        : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--surface-hover)";
                        e.currentTarget.style.border = "1px solid var(--border)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.border = "1px solid transparent";
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {renaming ? (
                        <input
                          autoFocus
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-[12px] rounded-md px-2 py-1 focus:outline-none"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--accent)",
                            color: "var(--text)",
                          }}
                        />
                      ) : (
                        <div
                          className="text-[12.5px] truncate font-medium flex-1 min-w-0"
                          style={{ color: active ? "var(--text)" : "var(--text-2)" }}
                        >
                          {c.title || "新对话"}
                        </div>
                      )}

                      {!renaming && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(c.id, c.title);
                            }}
                            className="p-1 rounded-md"
                            title="重命名"
                            style={{ color: "var(--text-3)" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "var(--accent)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "var(--text-3)")
                            }
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("删除该会话？")) onDelete(c.id);
                            }}
                            className="p-1 rounded-md"
                            title="删除"
                            style={{ color: "var(--text-3)" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "var(--danger)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "var(--text-3)")
                            }
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        {tab === "todos" && <TodoPanel />}
        {tab === "skills" && <SkillsPanel />}
        {tab === "plugins" && <PluginsPanel />}
        {tab === "mcp" && <McPanel />}
      </div>

      {/* 底部信息统计 */}
      <div
        className="px-4 py-2 flex items-center justify-between text-[11px]"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-4)",
          background: "var(--surface-2)",
        }}
      >
        <span className="flex items-center gap-2.5">
          <span>{conversations.length} 会话</span>
          <span>{stats.todos} Todo</span>
        </span>
        <span className="opacity-60">v1.0</span>
      </div>
    </aside>
  );
}
