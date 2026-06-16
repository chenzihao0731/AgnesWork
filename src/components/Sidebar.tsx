import React from "react";
import { ChatIcon, SkillIcon, PluginIcon, LinkIcon, MoonIcon, SunIcon, SettingsIcon, HelpIcon } from "./icons";

export type Tab = "conversations" | "skills" | "plugins" | "mcp";

const TABS: Array<{
  key: Tab;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
}> = [
  { key: "conversations", label: "会话", Icon: ChatIcon },
  { key: "skills", label: "Skills", Icon: SkillIcon },
  { key: "plugins", label: "插件", Icon: PluginIcon },
  { key: "mcp", label: "MCP", Icon: LinkIcon },
];

type SidebarProps = {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  theme: string;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
};

export function Sidebar({ tab, onTabChange, theme, onToggleTheme, onOpenSettings, onOpenHelp }: SidebarProps) {
  const btnBase: React.CSSProperties = {
    background: "var(--surface-2)",
    color: "var(--text-2)",
    border: "1px solid var(--border)",
  };

  return (
    <aside
      className="h-full flex flex-col shrink-0 overflow-hidden"
      style={{
        width: "180px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* 图标+文字列表 */}
      <div className="flex-1 flex flex-col gap-0.5 pt-3 px-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.Icon;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-[13px] font-medium"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      color: "#fff",
                      boxShadow: "0 4px 14px -4px var(--accent)",
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
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 底部工具按钮 */}
      <div className="pb-3 px-2 pt-2 flex flex-col gap-1"
        style={{ borderTop: "1px solid var(--border)" }}>
        <button onClick={onToggleTheme}
          title="切换主题"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] font-medium"
          style={{ background: "transparent", color: "var(--text-3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text-2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-3)"; }}>
          {theme === "dark" ? <SunIcon className="w-4 h-4 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
          <span>{theme === "dark" ? "浅色模式" : "深色模式"}</span>
        </button>

        <button onClick={onOpenSettings}
          title="设置"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] font-medium"
          style={{ background: "transparent", color: "var(--text-3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text-2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-3)"; }}>
          <SettingsIcon className="w-4 h-4 shrink-0" />
          <span>设置</span>
        </button>

        <button onClick={onOpenHelp}
          title="命令与工具帮助"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] font-medium"
          style={{ background: "transparent", color: "var(--text-3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text-2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-3)"; }}>
          <HelpIcon className="w-4 h-4 shrink-0" />
          <span>帮助</span>
        </button>

        <div className="text-[10px] px-3 pt-1" style={{ color: "var(--text-4)" }}>v1.0</div>
      </div>
    </aside>
  );
}
