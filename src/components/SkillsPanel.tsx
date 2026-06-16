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
    <div className="space-y-4">
      {/* 头部统计 */}
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
            <SkillIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
              技能管理
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
              已启用{" "}
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{enabledCount}</span> /{" "}
              {items.length} 个 Skill
            </div>
          </div>
        </div>
        <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
          启用后 Agent 会自动使用
        </div>
      </div>

      {/* 技能列表 */}
      <div className="space-y-2">
        {items.map((s) => {
          const Icon = iconForSkill(s);
          return (
            <div
              key={s.id}
              className="rounded-xl px-4 py-3 transition-all group"
              style={{
                border: "1px solid",
                borderColor: s.enabled ? "var(--accent)" : "var(--border)",
                background: s.enabled ? "var(--surface)" : "var(--bg)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px -4px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = s.enabled ? "var(--accent)" : "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
                      style={{
                        background: s.enabled
                          ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                          : "var(--surface-2)",
                        color: s.enabled ? "#fff" : "var(--text-2)",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[13px] font-medium truncate"
                          style={{ color: s.enabled ? "var(--text)" : "var(--text-2)" }}
                        >
                          {s.name}
                        </span>
                        {s.builtin && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              color: "var(--text-3)",
                            }}
                          >
                            内置
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[11px] mt-0.5 leading-relaxed"
                        style={{ color: "var(--text-3)" }}
                      >
                        {s.description}
                      </div>
                    </div>
                  </div>

                  {s.toolIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.toolIds.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-md"
                          style={{
                            background: s.enabled
                              ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                              : "var(--surface-2)",
                            color: s.enabled ? "var(--accent)" : "var(--text-3)",
                            border: `1px solid ${s.enabled ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--border)"}`,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.extraSystemPrompt && (
                    <div
                      className="mt-2 text-[11px] rounded-lg p-2.5 leading-relaxed flex gap-2 items-start"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text-2)",
                      }}
                    >
                      <BoltIcon
                        className="w-3.5 h-3.5 shrink-0 mt-0.5"
                        style={{ color: "var(--accent)" }}
                      />
                      <span className="min-w-0">{s.extraSystemPrompt}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggle(s.id)}
                  className="relative w-11 h-6 rounded-full transition-all shrink-0"
                  style={{
                    background: s.enabled
                      ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                      : "var(--surface-3)",
                    boxShadow: s.enabled ? "0 2px 8px -2px var(--accent)" : "none",
                  }}
                  title={s.enabled ? "点击禁用" : "点击启用"}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                    style={{
                      transform: s.enabled ? "translateX(20px)" : "translateX(0)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div
        className="text-[11px] pt-3 mt-4 leading-relaxed rounded-lg px-4 py-3"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
        }}
      >
        <span style={{ color: "var(--text-2)", fontWeight: 500 }}>提示：</span>
        Skill 只是"工具集合 + 风格提示"，真正的工具在{" "}
        <span style={{ color: "var(--text-2)", fontFamily: "monospace" }}>lib/agent/tools.ts</span>{" "}
        注册。启用 Skill 后，它在对话中会自动被 Agent 考虑。
      </div>
    </div>
  );
}
