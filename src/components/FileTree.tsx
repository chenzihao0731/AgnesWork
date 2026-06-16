import React, { useState } from "react";

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface FileTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  children: FileTreeNode[];
}

function buildTree(entries: FileEntry[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map = new Map<string, FileTreeNode>();

  for (const e of entries) {
    map.set(e.path, { ...e, children: [] });
  }
  for (const e of entries) {
    const node = map.get(e.path)!;
    const parentPath = e.path.replace(/[/\\][^/\\]+$/, "");
    if (parentPath && map.has(parentPath)) {
      map.get(parentPath)!.children.push(node);
    } else {
      root.push(node);
    }
  }
  root.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const n of root) {
    sortChildren(n);
  }
  return root;
}

function sortChildren(n: FileTreeNode) {
  n.children.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  n.children.forEach(sortChildren);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  defaultExpanded?: boolean;
}

function TreeNode({ node, depth, defaultExpanded }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 px-1.5 rounded-lg cursor-pointer select-none hover:bg-ink-800/60 group transition-colors ${
          node.is_dir ? "text-amber-200" : "text-ink-200"
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => hasChildren && setExpanded((v) => !v)}
        title={node.path}
      >
        {hasChildren ? (
          <span className="text-[10px] text-ink-400 w-4 text-center shrink-0 transition-transform duration-150" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            ▶
          </span>
        ) : (
          <span className="w-4 text-center shrink-0">
            {node.is_dir ? "📁" : iconForFile(node.name)}
          </span>
        )}
        <span className="truncate text-[13px] flex-1">{node.name}</span>
        {!node.is_dir && (
          <span className="text-[11px] text-ink-500 shrink-0">
            {formatSize(node.size)}
          </span>
        )}
        {node.is_dir && (
          <span className="text-[11px] text-ink-500 shrink-0">
            {node.children.length}项
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function iconForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    md: "📄", mdx: "📄",
    ts: "🔷", tsx: "⚛️", js: "🟨", jsx: "⚛️",
    json: "{ }", yaml: "⚙️", yml: "⚙️",
    html: "🌐", css: "🎨", scss: "🎨",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", webp: "🖼️", svg: "🖼️",
    mp4: "🎬", mov: "🎬", avi: "🎬", mkv: "🎬",
    mp3: "🎵", wav: "🎵", ogg: "🎵",
    pdf: "📕", doc: "📘", docx: "📘",
    zip: "📦", tar: "📦", gz: "📦", rar: "📦",
    sh: "💻", py: "🐍", rb: "💎", go: "🔵",
    rs: "🦀", java: "☕", cpp: "⚙️", c: "⚙️",
    txt: "📝", log: "📝",
  };
  return map[ext] ?? "📄";
}

/** 解析 list_directory tool result，返回文件树 */
export function parseFileTree(resultJson: string): { workspace: string; path: string; entries: FileEntry[] } | null {
  try {
    const parsed = JSON.parse(resultJson);
    if (parsed.success && Array.isArray(parsed.entries)) {
      return {
        workspace: parsed.workspace || "",
        path: parsed.path || "./",
        entries: parsed.entries,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/** 文件树组件 */
export function FileTree({
  resultJson,
}: {
  resultJson: string;
}) {
  const parsed = parseFileTree(resultJson);
  if (!parsed) return null;
  const { workspace, path, entries } = parsed;
  const tree = buildTree(entries);

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-900/60 overflow-hidden mt-2">
      <div className="px-3 py-2 border-b border-ink-800/60 bg-ink-800/30 flex items-center gap-2">
        <span className="text-[11px] text-ink-400">
          {workspace ? (
            <span>
              <span className="text-ink-300 font-mono">📂 {workspace}</span>
              <span className="text-ink-500"> / {path.replace(/^\.\//, "") || ""}</span>
            </span>
          ) : (
            <span>./{path.replace(/^\.\//, "")}</span>
          )}
          <span className="ml-2 text-ink-500">({entries.length} 项)</span>
        </span>
      </div>
      <div className="p-1.5 max-h-[320px] overflow-y-auto scrollable">
        {tree.length === 0 ? (
          <div className="text-[13px] text-ink-400 py-3 text-center">
            空目录
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              defaultExpanded={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
