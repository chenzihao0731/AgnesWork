import React, { useEffect, useMemo, useState } from "react";
import { CheckSquareIcon, SquareIcon, TrashIcon } from "./icons";
import {
  loadTodos,
  saveTodos,
  type TodoItem,
} from "../lib/storage/extensions";

export function TodoPanel() {
  const [items, setItems] = useState<TodoItem[]>(() => loadTodos());
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  useEffect(() => {
    saveTodos(items);
  }, [items]);

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    if (filter === "active") return sorted.filter((i) => !i.done);
    if (filter === "done") return sorted.filter((i) => i.done);
    return sorted;
  }, [items, filter]);

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;

  function toggleDone(id: string) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  function clearDone() {
    if (!confirm("清空已完成的所有任务？")) return;
    setItems((prev) => prev.filter((t) => !t.done));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* 过滤器 + 统计 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "active", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: filter === f ? "var(--accent)" : "var(--border)",
                background: filter === f ? "var(--accent-soft)" : "transparent",
                color: filter === f ? "var(--accent)" : "var(--text-3)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f === "all" ? "全部" : f === "active" ? "进行中" : "已完成"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: "var(--text-4)" }}>
          {doneCount}/{totalCount}
        </span>
      </div>

      {/* 列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ padding: "16px 8px", textAlign: "center", color: "var(--text-4)", fontSize: 12 }}>
            暂无任务
          </div>
        )}
        {filtered.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: t.done ? "transparent" : "var(--surface-2)",
              opacity: t.done ? 0.5 : 1,
              transition: "background 0.15s",
            }}
          >
            <button
              onClick={() => toggleDone(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: t.done ? "var(--ok)" : "var(--text-3)",
                padding: 0,
              }}
            >
              {t.done ? <CheckSquareIcon className="w-4 h-4" /> : <SquareIcon className="w-4 h-4" />}
            </button>
            <span
              style={{
                flex: 1,
                fontSize: 12.5,
                color: "var(--text)",
                textDecoration: t.done ? "line-through" : "none",
              }}
            >
              {t.title}
            </span>
            <button
              onClick={() => remove(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-4)",
                padding: 0,
                opacity: 0.6,
              }}
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 清空已完成 */}
      {doneCount > 0 && (
        <button
          onClick={clearDone}
          style={{
            fontSize: 11,
            color: "var(--text-4)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            textAlign: "left",
          }}
        >
          清空已完成 ({doneCount})
        </button>
      )}
    </div>
  );
}
