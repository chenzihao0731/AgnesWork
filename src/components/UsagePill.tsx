import React from "react";
import { useUsage } from "../lib/usage";
import { CoinIcon, StackIcon, BoltIcon } from "./icons";

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function UsagePill({ onOpen }: { onOpen?: () => void }) {
  const u = useUsage();
  const pct = Math.min(
    100,
    Math.round((u.currentConversationContext / u.contextLimit) * 100),
  );

  return (
    <button
      onClick={onOpen}
      className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg text-[12px] transition-all"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
      }}
      title={`今日 ${formatNum(u.today.totalTokens)} token · 上下文 ${formatNum(u.currentConversationContext)} / ${formatNum(u.contextLimit)}`}
    >
      {/* 今日 token */}
      <span className="flex items-center gap-1.5">
        <CoinIcon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
        <span className="tabular-nums font-medium" style={{ color: "var(--text)" }}>
          {formatNum(u.today.totalTokens)}
        </span>
        <span>今日</span>
      </span>

      <span style={{ width: 1, height: 12, background: "var(--border)" }} />

      {/* 上下文用量 */}
      <span className="flex items-center gap-1.5">
        <StackIcon className="w-3.5 h-3.5" />
        <span className="tabular-nums font-medium" style={{ color: "var(--text)" }}>
          {formatNum(u.currentConversationContext)}
        </span>
        <span className="hidden sm:inline">/ {formatNum(u.contextLimit)}</span>
        <span className="flex items-center w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
          <span
            className="h-full"
            style={{
              width: `${pct}%`,
              background:
                pct > 85
                  ? "var(--danger)"
                  : "linear-gradient(90deg, var(--accent), var(--accent-2))",
              transition: "width 0.4s ease",
            }}
          />
        </span>
      </span>

      <span style={{ width: 1, height: 12, background: "var(--border)" }} />

      {/* 轮次 */}
      <span className="hidden md:flex items-center gap-1.5">
        <BoltIcon className="w-3.5 h-3.5" />
        <span className="tabular-nums">{u.today.turns}</span>
        <span className="hidden lg:inline">轮</span>
      </span>
    </button>
  );
}

/** 详情弹窗（简洁版） */
export function UsagePanel() {
  const u = useUsage();
  const ctxPct = Math.min(100, (u.currentConversationContext / u.contextLimit) * 100);
  const dailyPct = Math.min(100, (u.today.totalTokens / 200000) * 100); // 假设每日 200k 为"参考上限"

  return (
    <div className="p-5 space-y-4 text-sm">
      <div>
        <div className="text-base font-semibold mb-1">用量概览</div>
        <div style={{ color: "var(--text-3)" }}>
          模型：<span style={{ color: "var(--text)" }}>{u.modelName}</span> · 估算值，与服务端实际计费可能有细微差异
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          icon={<CoinIcon className="w-4 h-4" />}
          label="今日 Token"
          value={formatNum(u.today.totalTokens)}
          sub={`输入 ${formatNum(u.today.promptTokens)} · 输出 ${formatNum(u.today.completionTokens)}`}
          pct={dailyPct}
          hint="参考上限 200K / 日"
        />
        <StatCard
          icon={<StackIcon className="w-4 h-4" />}
          label="当前会话上下文"
          value={formatNum(u.currentConversationContext)}
          sub={`上限约 ${formatNum(u.contextLimit)} token`}
          pct={ctxPct}
          hint={ctxPct > 80 ? "上下文较长，可能触发摘要/裁剪" : "上下文健康"}
        />
        <StatCard
          icon={<BoltIcon className="w-4 h-4" />}
          label="今日轮次"
          value={String(u.today.turns)}
          sub={`工具调用 ${u.today.toolCalls} 次`}
          pct={Math.min(100, (u.today.turns / 50) * 100)}
          hint="参考上限 50 轮 / 日"
        />
        <StatCard
          icon={<CoinIcon className="w-4 h-4" />}
          label="累计 Token"
          value={formatNum(u.totalTokens)}
          sub={`自本地记录开始`}
          pct={Math.min(100, (u.totalTokens / 2_000_000) * 100)}
          hint=""
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  pct,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  pct: number;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: "var(--text-2)" }}>
          <span style={{ color: "var(--accent)" }}>{icon}</span>
          <span className="text-[12px]">{label}</span>
        </div>
        <div className="text-[11px]" style={{ color: "var(--text-4)" }}>
          {Math.round(pct)}%
        </div>
      </div>
      <div className="text-xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>
        {value}
      </div>
      {sub && <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{sub}</div>}
      <div className="progress-bar !h-1">
        <span className="fill" style={{ width: `${pct}%` }} />
      </div>
      {hint && (
        <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{hint}</div>
      )}
    </div>
  );
}
