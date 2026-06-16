import React, { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  XIcon,
  CheckSquareIcon,
  SquareIcon,
  TargetIcon,
  TrashIcon,
  LightbulbIcon,
  CheckCircleIcon,
  RocketIcon,
  EditIcon,
  ChevronIcon,
} from "./icons";
import {
  loadGoals,
  saveGoals,
  makeGoalId,
  type Goal,
  type Milestone,
  makeMilestoneId,
} from "../lib/storage/extensions";

function priorityMeta(priority: Goal["priority"]) {
  if (priority === "high") return { label: "高", color: "var(--danger)" };
  if (priority === "normal") return { label: "普通", color: "var(--accent)" };
  return { label: "低", color: "var(--text-3)" };
}

function computeProgress(goal: Goal): number {
  const milestones = goal.milestones ?? [];
  if (milestones.length === 0) return goal.progress ?? 0;
  const done = milestones.filter((m) => m.done).length;
  return Math.round((done / milestones.length) * 100);
}

const FILTERS: { key: "all" | "active" | "done"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "done", label: "已完成" },
];

export function GoalsPanel() {
  const [items, setItems] = useState<Goal[]>(() => loadGoals());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Goal["priority"]>("normal");
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  useEffect(() => {
    saveGoals(items);
  }, [items]);

  const sorted = useMemo<Goal[]>(() => {
    const order = { active: 0, done: 1, dropped: 2 } as const;
    const pOrder: Record<Goal["priority"], number> = { high: 0, normal: 1, low: 2 };
    const list = [...items].sort((a, b) => {
      const s = (order[a.status] ?? 0) - (order[b.status] ?? 0);
      if (s !== 0) return s;
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return b.createdAt - a.createdAt;
    });
    if (filter === "active") return list.filter((i) => i.status === "active");
    if (filter === "done") return list.filter((i) => i.status === "done");
    return list;
  }, [items, filter]);

  const activeCount = items.filter((i) => i.status === "active").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const overall =
    items.length > 0
      ? Math.round(items.reduce((sum, g) => sum + computeProgress(g), 0) / items.length)
      : 0;

  function addGoal() {
    const t = title.trim();
    if (!t) return;
    const goal: Goal = {
      id: makeGoalId(),
      title: t,
      description: description.trim() || undefined,
      status: "active",
      priority,
      progress: 0,
      milestones: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setItems((prev) => [goal, ...prev]);
    setTitle("");
    setDescription("");
    setPriority("normal");
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    setItems((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: Date.now() } : g)),
    );
  }

  function toggleStatus(id: string) {
    const goal = items.find((g) => g.id === id);
    if (!goal) return;
    const isActive = goal.status === "active";
    updateGoal(id, {
      status: isActive ? "done" : "active",
      progress: isActive ? 100 : computeProgress(goal),
    });
  }

  function removeGoal(id: string) {
    if (!confirm("删除该目标？")) return;
    setItems((prev) => prev.filter((g) => g.id !== id));
  }

  function cyclePriority(id: string) {
    const order: Goal["priority"][] = ["low", "normal", "high"];
    const current = items.find((g) => g.id === id);
    if (!current) return;
    const idx = order.indexOf(current.priority);
    updateGoal(id, { priority: order[(idx + 1) % order.length] });
  }

  function addMilestone(goalId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const goal = items.find((g) => g.id === goalId);
    if (!goal) return;
    const ms: Milestone = { id: makeMilestoneId(), text: trimmed, done: false };
    updateGoal(goalId, { milestones: [...(goal.milestones ?? []), ms] });
  }

  function toggleMilestone(goalId: string, milestoneId: string) {
    const goal = items.find((g) => g.id === goalId);
    if (!goal) return;
    const milestones = (goal.milestones ?? []).map((m) =>
      m.id === milestoneId ? { ...m, done: !m.done } : m,
    );
    updateGoal(goalId, { milestones });
  }

  function removeMilestone(goalId: string, milestoneId: string) {
    const goal = items.find((g) => g.id === goalId);
    if (!goal) return;
    updateGoal(goalId, {
      milestones: (goal.milestones ?? []).filter((m) => m.id !== milestoneId),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 顶部创建区 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 10,
          borderRadius: 10,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TargetIcon size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
            新目标
          </span>
        </div>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addGoal();
            }
          }}
          placeholder="目标标题…（回车创建）"
          rows={1}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            fontSize: 12.5,
            borderRadius: 8,
            padding: "8px 10px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            outline: "none",
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选描述 / Agent 会基于它拆解里程碑"
          rows={2}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            fontSize: 11.5,
            borderRadius: 8,
            padding: "8px 10px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
            outline: "none",
            lineHeight: 1.55,
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "inline-flex", gap: 4 }}>
            {(["low", "normal", "high"] as const).map((p) => {
              const active = priority === p;
              const meta = priorityMeta(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    fontSize: 10.5,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: `1px solid ${active ? meta.color : "var(--border)"}`,
                    background: active ? meta.color : "var(--surface)",
                    color: active ? "var(--bg)" : "var(--text-3)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    fontWeight: 500,
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addGoal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 500,
              boxShadow: "0 4px 10px -4px var(--accent)",
              transition: "all 150ms ease",
            }}
          >
            <RocketIcon size={13} />
            创建
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2px",
        }}
      >
        <div style={{ display: "inline-flex", gap: 4 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 10.5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--bg)" : "var(--text-3)",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  fontWeight: 500,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 10.5, color: "var(--text-4)" }}>
          共 {items.length} 个目标
        </span>
      </div>

      {/* 列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "24px 16px",
              borderRadius: 10,
              border: "1px dashed var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-4)",
              textAlign: "center",
            }}
          >
            <LightbulbIcon size={22} />
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              还没有目标。描述你的目标后，Agent 会自动帮你拆解里程碑。
            </div>
          </div>
        )}

        {sorted.map((g) => {
          const isDone = g.status === "done";
          const meta = priorityMeta(g.priority);
          const progress = computeProgress(g);
          const editing = editingGoalId === g.id;
          const milestones = g.milestones ?? [];
          return (
            <div
              key={g.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 10,
                borderRadius: 10,
                background: "var(--surface)",
                border: `1px solid ${isDone ? "var(--ok-soft)" : "var(--border)"}`,
                opacity: isDone ? 0.85 : 1,
                transition: "all 150ms ease",
              }}
            >
              {/* 标题行 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => toggleStatus(g.id)}
                  style={{
                    marginTop: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: isDone ? "var(--ok)" : "var(--text-4)",
                    transition: "color 150ms ease",
                  }}
                  title={isDone ? "标记为进行中" : "标记为已完成"}
                >
                  {isDone ? <CheckSquareIcon size={16} /> : <SquareIcon size={16} />}
                </button>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDone ? "var(--text-3)" : "var(--text)",
                      textDecoration: isDone ? "line-through" : "none",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {g.title}
                  </div>
                  {g.description && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-3)",
                        lineHeight: 1.55,
                      }}
                    >
                      {g.description}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => cyclePriority(g.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 999,
                        border: `1px solid ${meta.color}`,
                        background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                        color: meta.color,
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "all 150ms ease",
                      }}
                      title="点击调整优先级"
                    >
                      {meta.label}
                      <ChevronIcon size={9} />
                    </button>
                    <span style={{ fontSize: 10.5, color: "var(--text-4)" }}>
                      {progress}%
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--text-4)" }}>·</span>
                    <span style={{ fontSize: 10.5, color: "var(--text-4)" }}>
                      {new Date(g.createdAt).toLocaleDateString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setEditingGoalId(editing ? null : g.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: `1px solid ${editing ? "var(--accent)" : "var(--border)"}`,
                      background: editing ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--surface-2)",
                      color: editing ? "var(--accent)" : "var(--text-3)",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                    title={editing ? "收起编辑" : "编辑目标"}
                  >
                    <EditIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGoal(g.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
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
                    title="删除目标"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              </div>

              {/* 进度条 */}
              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "var(--surface-2)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                    transition: "width 250ms ease",
                  }}
                />
              </div>

              {/* 里程碑 */}
              {milestones.length > 0 && (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {milestones.map((m) => (
                    <li
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleMilestone(g.id, m.id)}
                        style={{
                          marginTop: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          color: m.done ? "var(--ok)" : "var(--text-4)",
                          transition: "color 150ms ease",
                        }}
                      >
                        {m.done ? <CheckCircleIcon size={14} /> : <SquareIcon size={14} />}
                      </button>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 11.5,
                          color: m.done ? "var(--text-4)" : "var(--text-2)",
                          textDecoration: m.done ? "line-through" : "none",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {m.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(g.id, m.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: "none",
                          background: "transparent",
                          color: "var(--text-4)",
                          cursor: "pointer",
                          opacity: 0,
                          transition: "all 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--danger)";
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-4)";
                          e.currentTarget.style.opacity = "0";
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.opacity = "0";
                        }}
                        title="删除里程碑"
                      >
                        <XIcon size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 新增里程碑 */}
              <MilestoneAdder onAdd={(text) => addMilestone(g.id, text)} />

              {/* 编辑展开 */}
              {editing && (
                <GoalEditor
                  goal={g}
                  onCancel={() => setEditingGoalId(null)}
                  onSave={(patch) => {
                    updateGoal(g.id, patch);
                    setEditingGoalId(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 底部统计 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
          fontSize: 10.5,
          color: "var(--text-4)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <TargetIcon size={12} />
          {activeCount} 进行中 · {doneCount} 完成
        </span>
        <span>总体进度 {overall}%</span>
      </div>
    </div>
  );
}

function MilestoneAdder({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  function submit() {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          padding: "4px 6px",
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: "var(--text-4)",
          cursor: "pointer",
          alignSelf: "flex-start",
          transition: "color 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-4)";
        }}
      >
        <PlusIcon size={12} /> 添加里程碑
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setText("");
          }
        }}
        onBlur={() => {
          if (text.trim()) submit();
          setOpen(false);
        }}
        placeholder="里程碑内容"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 11.5,
          borderRadius: 6,
          padding: "6px 8px",
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          color: "var(--text)",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      <button
        type="button"
        onClick={submit}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10.5,
          padding: "5px 8px",
          borderRadius: 6,
          border: "1px solid var(--accent)",
          background: "var(--accent)",
          color: "var(--bg)",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        <CheckCircleIcon size={12} />
      </button>
    </div>
  );
}

function GoalEditor({
  goal,
  onCancel,
  onSave,
}: {
  goal: Goal;
  onCancel: () => void;
  onSave: (patch: Partial<Goal>) => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [priority, setPriority] = useState<Goal["priority"]>(goal.priority);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        borderRadius: 8,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>
        编辑目标
      </span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        style={{
          boxSizing: "border-box",
          width: "100%",
          fontSize: 12.5,
          padding: "6px 8px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="描述"
        rows={2}
        style={{
          boxSizing: "border-box",
          width: "100%",
          resize: "none",
          fontSize: 11.5,
          padding: "6px 8px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-2)",
          outline: "none",
          fontFamily: "inherit",
          lineHeight: 1.55,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "inline-flex", gap: 4 }}>
          {(["low", "normal", "high"] as const).map((p) => {
            const active = priority === p;
            const meta = priorityMeta(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                style={{
                  fontSize: 10.5,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: `1px solid ${active ? meta.color : "var(--border)"}`,
                  background: active ? meta.color : "transparent",
                  color: active ? "var(--bg)" : "var(--text-3)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                title: title.trim() || goal.title,
                description: description.trim() || undefined,
                priority,
              })
            }
            style={{
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
