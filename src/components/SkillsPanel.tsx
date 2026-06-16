import React, { useEffect, useState } from "react";
import {
  loadSkills,
  saveSkills,
  type Skill,
} from "../lib/storage/extensions";
import {
  SkillIcon,
  ImageIcon,
  VideoIcon,
  WrenchIcon,
  FileIcon,
  SearchIcon,
  BoltIcon,
} from "./icons";

function iconForSkill(s: Skill): React.ComponentType<{ className?: string; size?: number; stroke?: number; style?: React.CSSProperties }> {
  switch (s.id) {
    case "skill-design":
      return ImageIcon;
    case "skill-video":
      return VideoIcon;
    case "skill-dev":
      return WrenchIcon;
    case "skill-writer":
      return FileIcon;
    case "skill-research":
      return SearchIcon;
    default:
      return SkillIcon;
  }
}

export function SkillsPanel({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [items, setItems] = useState<Skill[]>(() => loadSkills());

  useEffect(() => {
    if (refreshSignal > 0) setItems(loadSkills());
  }, [refreshSignal]);

  useEffect(() => {
    saveTodosOrNot();
  }, [items]);

  function saveTodosOrNot() {
    saveSkills(items);
  }

  function toggle(id: string) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  const enabledCount = items.filter((s) => s.enabled).length;

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] px-1 leading-relaxed" style={{ color: "var(--text-3)" }}>
        已启用{" "}
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{enabledCount}</span> /{" "}
        {items.length} 个 Skill。启用后，Agent 会自动使用其关联的工具与 system prompt。
      </div>

      <div className="space-y-1">
        {items.map((s) => {
          const Icon = iconForSkill(s);
          return (
            <div
              key={s.id}
              className={`rounded-lg px-2.5 py-2 transition-all group`}
              style={{
                border: "1px solid",
                borderColor: s.enabled ? "var(--accent)" : "var(--border)",
                background: s.enabled ? "var(--surface)" : "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 8px -4px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = s.enabled
                  ? "var(--accent)"
                  : "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center"
                      style={{
                        background: s.enabled
                          ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                          : "var(--surface-2)",
                        color: s.enabled ? "#fff" : "var(--text-2)",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span
                      className="text-[12.5px] font-medium truncate"
                      style={{ color: s.enabled ? "var(--text)" : "var(--text-2)" }}
                    >
                      {s.name}
                    </span>
                    {s.builtin && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-2)",
                          color: "var(--text-3)",
                        }}
                      >
                        内置
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[10.5px] mt-1 leading-relaxed"
                    style={{ color: "var(--text-3)" }}
                  >
                    {s.description}
                  </div>
                  {s.toolIds.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.toolIds.map((t) => (
                        <span
                          key={t}
                          className="text-[9.5px] px-1.5 py-0.5 rounded"
                          style={{
                            background: s.enabled
                              ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                              : "var(--surface-2)",
                            color: s.enabled ? "var(--accent)" : "var(--text-3)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {s.extraSystemPrompt && (
                    <div
                      className="mt-1.5 text-[10px] rounded p-1.5 leading-relaxed flex gap-1.5 items-start"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-2)",
                        color: "var(--text-3)",
                      }}
                    >
                      <BoltIcon
                        className="w-3 h-3 shrink-0 mt-0.5"
                        style={{ color: "var(--accent)" }}
                      />
                      <span className="min-w-0">{s.extraSystemPrompt}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggle(s.id)}
                  className="relative w-9 h-5 rounded-full transition-all shrink-0"
                  style={{
                    background: s.enabled
                      ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                      : "var(--surface-2)",
                    border: "1px solid",
                    borderColor: s.enabled ? "var(--accent)" : "var(--border-2)",
                    boxShadow: s.enabled ? "0 2px 8px -2px var(--accent)" : "none",
                  }}
                  title={s.enabled ? "点击禁用" : "点击启用"}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform"
                    style={{
                      transform: s.enabled ? "translateX(16px)" : "translateX(0)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="text-[10px] pt-1.5 mt-1 leading-relaxed"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-4)",
        }}
      >
        提示：Skill 只是"工具集合 + 风格提示"，真正的工具在
        <span style={{ color: "var(--text-2)" }}> lib/agent/tools.ts </span>
        注册。启用 Skill 后，它在对话中会自动被 Agent 考虑。
      </div>
    </div>
  );
}
