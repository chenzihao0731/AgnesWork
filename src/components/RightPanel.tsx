import React, { useMemo, useState } from "react";
import {
  type Goal,
  type TodoItem,
  saveGoals,
  type Milestone,
  saveTodos,
  makeMilestoneId,
} from "../lib/storage/extensions";
import {
  TargetIcon,
  PlusIcon,
  CheckSquareIcon,
  SquareIcon,
  TrashIcon,
  CheckCircleIcon,
  TodoIcon,
  LightbulbIcon,
  RocketIcon,
} from "./icons";

interface RightPanelProps {
  goals: Goal[];
  todos: TodoItem[];
  conversationId?: string;
  onAction?: (type: string, payload?: any) => void;
}

function computeProgress(g: Goal): number {
  const ms = g.milestones ?? [];
  if (ms.length === 0) return g.progress ?? 0;
  const done = ms.filter((m) => m.done).length;
  return Math.round((done / ms.length) * 100);
}

export function RightPanel({
  goals,
  todos,
  conversationId,
  onAction,
}: RightPanelProps) {
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>(
    {},
  );

  const sessionGoals = useMemo(
    () =>
      goals.filter(
        (g) =>
          (conversationId && g.conversationId === conversationId) ||
          (!conversationId && !g.conversationId),
      ),
    [goals, conversationId],
  );

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active"),
    [goals],
  );

  const activeTodos = useMemo(() => todos.filter((t) => !t.done), [todos]);

  function emitUpdateGoals(next: Goal[]) {
    if (onAction) onAction("update-goals", next);
    else saveGoals(next);
  }

  function emitUpdateTodos(next: TodoItem[]) {
    if (onAction) onAction("update-todos", next);
    else saveTodos(next);
  }

  function toggleGoal(id: string) {
    const next = goals.map((g) =>
      g.id === id
        ? {
            ...g,
            status: (g.status === "done" ? "active" : "done") as Goal["status"],
            progress: g.status === "done" ? 0 : 100,
            updatedAt: Date.now(),
          }
        : g,
    );
    emitUpdateGoals(next);
  }

  function deleteGoal(id: string) {
    if (!confirm("删除该目标？")) return;
    emitUpdateGoals(goals.filter((g) => g.id !== id));
  }

  function cyclePriority(id: string) {
    const order: Goal["priority"][] = ["normal", "high", "low"];
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    const idx = order.indexOf(g.priority);
    const next = order[(idx + 1) % order.length];
    emitUpdateGoals(
      goals.map((x) =>
        x.id === id ? { ...x, priority: next, updatedAt: Date.now() } : x,
      ),
    );
  }

  function addMilestone(goalId: string) {
    const text = (milestoneDrafts[goalId] || "").trim();
    if (!text) return;
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const nextMs: Milestone[] = [
      ...(g.milestones ?? []),
      { id: makeMilestoneId(), text, done: false },
    ];
    emitUpdateGoals(
      goals.map((x) =>
        x.id === goalId
          ? { ...x, milestones: nextMs, updatedAt: Date.now() }
          : x,
      ),
    );
    setMilestoneDrafts((prev) => ({ ...prev, [goalId]: "" }));
  }

  function toggleMilestone(goalId: string, msId: string) {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const nextMs = (g.milestones ?? []).map((m) =>
      m.id === msId ? { ...m, done: !m.done } : m,
    );
    emitUpdateGoals(
      goals.map((x) =>
        x.id === goalId
          ? { ...x, milestones: nextMs, updatedAt: Date.now() }
          : x,
      ),
    );
  }

  function deleteMilestone(goalId: string, msId: string) {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    emitUpdateGoals(
      goals.map((x) =>
        x.id === goalId
          ? {
              ...x,
              milestones: (x.milestones ?? []).filter((m) => m.id !== msId),
              updatedAt: Date.now(),
            }
          : x,
      ),
    );
  }

  function toggleTodo(id: string) {
    emitUpdateTodos(
      todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  function deleteTodo(id: string) {
    emitUpdateTodos(todos.filter((t) => t.id !== id));
  }

  return (
    <aside className="right-panel-card">
      <div className="right-panel-header">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#fff",
            }}
          >
            <TargetIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              目标与进度
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
              {activeGoals.length} 个活跃目标 · {activeTodos.length} 项待办
            </div>
          </div>
        </div>
        <div
          className="text-[10.5px] flex items-center gap-1"
          style={{ color: "var(--text-3)" }}
        >
          <RocketIcon className="w-3 h-3" />
          <span>聚焦</span>
        </div>
      </div>

      <div className="right-panel-body">
        {/* 区块 1：当前会话关联的目标 */}
        <section>
          <div className="right-section-title">
            <TargetIcon className="w-3 h-3" />
            <span>当前会话</span>
            <span style={{ marginLeft: "auto", opacity: 0.7 }}>
              {sessionGoals.length}
            </span>
          </div>

          {sessionGoals.length === 0 && (
            <div className="right-empty">
              <LightbulbIcon
                className="w-4 h-4 mx-auto mb-1"
                style={{ opacity: 0.6 }}
              />
              切换「交给Agent」自动为当前会话创建目标。
            </div>
          )}

          {sessionGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              draft={milestoneDrafts[g.id] || ""}
              onDraftChange={(text) =>
                setMilestoneDrafts((prev) => ({ ...prev, [g.id]: text }))
              }
              onToggle={() => toggleGoal(g.id)}
              onDelete={() => deleteGoal(g.id)}
              onCyclePriority={() => cyclePriority(g.id)}
              onAddMilestone={() => addMilestone(g.id)}
              onToggleMilestone={(msId) => toggleMilestone(g.id, msId)}
              onDeleteMilestone={(msId) => deleteMilestone(g.id, msId)}
            />
          ))}
        </section>

        {/* 区块 2：活跃目标列表 */}
        <section>
          <div className="right-section-title">
            <CheckSquareIcon className="w-3 h-3" />
            <span>活跃目标</span>
            <span style={{ marginLeft: "auto", opacity: 0.7 }}>
              {activeGoals.length}
            </span>
          </div>

          {activeGoals.length === 0 && (
            <div className="right-empty">尚无活跃目标。</div>
          )}

          {activeGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              draft={milestoneDrafts[g.id] || ""}
              onDraftChange={(text) =>
                setMilestoneDrafts((prev) => ({ ...prev, [g.id]: text }))
              }
              onToggle={() => toggleGoal(g.id)}
              onDelete={() => deleteGoal(g.id)}
              onCyclePriority={() => cyclePriority(g.id)}
              onAddMilestone={() => addMilestone(g.id)}
              onToggleMilestone={(msId) => toggleMilestone(g.id, msId)}
              onDeleteMilestone={(msId) => deleteMilestone(g.id, msId)}
            />
          ))}
        </section>

        {/* 区块 3：活跃 Todo 列表 */}
        <section>
          <div className="right-section-title">
            <TodoIcon className="w-3 h-3" />
            <span>待办事项</span>
            <span style={{ marginLeft: "auto", opacity: 0.7 }}>
              {activeTodos.length}
            </span>
          </div>

          {activeTodos.length === 0 && (
            <div className="right-empty">尚无待办。</div>
          )}

          {activeTodos.map((t) => (
            <div key={t.id} className="right-todo-item">
              <button
                onClick={() => toggleTodo(t.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-4)",
                  padding: 0,
                }}
                title="标记完成"
              >
                <SquareIcon className="w-4 h-4" />
              </button>
              <span
                style={{
                  flex: 1,
                  fontSize: "12.5px",
                  color: "var(--text-2)",
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}
              >
                {t.title}
              </span>
              <button
                onClick={() => deleteTodo(t.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-4)",
                  padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--danger)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-4)")
                }
                title="删除"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
}

interface GoalCardProps {
  goal: Goal;
  draft: string;
  onDraftChange: (text: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onCyclePriority: () => void;
  onAddMilestone: () => void;
  onToggleMilestone: (msId: string) => void;
  onDeleteMilestone: (msId: string) => void;
}

function GoalCard({
  goal,
  draft,
  onDraftChange,
  onToggle,
  onDelete,
  onCyclePriority,
  onAddMilestone,
  onToggleMilestone,
  onDeleteMilestone,
}: GoalCardProps) {
  const progress = computeProgress(goal);
  const isDone = goal.status === "done";

  return (
    <div className={"right-goal-card" + (isDone ? " done" : "")}>
      <div className="right-goal-title-row">
        <button
          onClick={onToggle}
          title={isDone ? "重新激活" : "标记完成"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: isDone ? "var(--ok)" : "var(--text-4)",
            padding: 0,
            flexShrink: 0,
          }}
        >
          {isDone ? (
            <CheckCircleIcon className="w-4 h-4" />
          ) : (
            <SquareIcon className="w-4 h-4" />
          )}
        </button>

        <div className="right-goal-title">{goal.title}</div>

        <button
          onClick={onCyclePriority}
          className={"goal-priority " + goal.priority}
          title="切换优先级"
        >
          {goal.priority === "high"
            ? "高"
            : goal.priority === "normal"
              ? "普通"
              : "低"}
        </button>

        <button
          onClick={onDelete}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-4)",
            padding: 0,
            transition: "color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "var(--danger)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-4)")
          }
          title="删除目标"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {goal.description && (
        <div className="right-goal-desc">{goal.description}</div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          color: "var(--text-3)",
        }}
      >
        <div
          style={{
            flex: 1,
            height: "4px",
            background: "var(--surface)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: progress + "%",
              height: "100%",
              background:
                "linear-gradient(90deg, var(--accent), var(--accent-2))",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{progress}%</span>
      </div>

      {(goal.milestones ?? []).length > 0 && (
        <div className="right-milestone-list">
          {(goal.milestones ?? []).map((m) => (
            <div
              key={m.id}
              className={"right-milestone-item" + (m.done ? " done" : "")}
            >
              <button
                onClick={() => onToggleMilestone(m.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: m.done ? "var(--ok)" : "var(--text-4)",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                {m.done ? (
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                ) : (
                  <SquareIcon className="w-3.5 h-3.5" />
                )}
              </button>
              <span
                className={
                  "right-milestone-text" + (m.done ? " done" : "")
                }
              >
                {m.text}
              </span>
              <button
                onClick={() => onDeleteMilestone(m.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-4)",
                  padding: 0,
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--danger)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-4)")
                }
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <PlusIcon
          className="w-3.5 h-3.5"
          style={{ color: "var(--text-4)", flexShrink: 0 }}
        />
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAddMilestone();
          }}
          placeholder="添加里程碑…"
          className="right-add-ms-input"
        />
        {draft.trim().length > 0 && (
          <button
            onClick={onAddMilestone}
            style={{
              fontSize: "10.5px",
              padding: "3px 8px",
              borderRadius: "6px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            添加
          </button>
        )}
      </div>
    </div>
  );
}
