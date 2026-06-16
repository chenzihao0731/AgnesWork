import React from "react";
import type { ToolInvocation } from "../lib/agent/agent";
import { FileTree } from "./FileTree";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { WrenchIcon, FolderOpenIcon, ImageIcon, VideoIcon } from "./icons";

interface ToolCallCardProps {
  inv: ToolInvocation;
}

function ToolIcon({ name }: { name: string }) {
  const common = "w-3.5 h-3.5";
  if (name === "list_directory" || name === "read_text_file")
    return <FolderOpenIcon className={common} />;
  if (name === "read_image_file") return <ImageIcon className={common} />;
  if (name === "generate_image" || name === "image_to_image")
    return <ImageIcon className={common} />;
  if (name === "generate_video") return <VideoIcon className={common} />;
  return <WrenchIcon className={common} />;
}

function ToolCallCard({ inv }: ToolCallCardProps) {
  const isRunning = inv.status === "running";
  const isSuccess = inv.status === "success";
  const isError = inv.status === "error";
  const pct = Math.max(0, Math.min(100, inv.progress || 0));

  return (
    <div
      className="rounded-xl p-3 space-y-2 mt-2"
      style={{
        background: "var(--surface)",
        border: `1px solid ${isError ? "color-mix(in srgb, var(--danger) 40%, transparent)" : "var(--border)"}`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0"
            style={{
              background: `color-mix(in srgb, var(--accent) 15%, transparent)`,
              color: "var(--accent)",
            }}
          >
            <ToolIcon name={inv.name} />
          </span>
          <div className="min-w-0">
            <div
              className="text-[12.5px] font-mono font-medium truncate"
              style={{ color: "var(--text)" }}
            >
              {inv.name}
            </div>
            {inv.infoText && (
              <div
                className="text-[11px] leading-relaxed mt-0.5"
                style={{ color: "var(--text-3)" }}
              >
                {inv.infoText}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {isRunning && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--warn)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full tool-blink"
                style={{ background: "var(--warn)" }}
              />
              <span className="tabular-nums font-medium">{pct}%</span>
            </span>
          )}
          {isSuccess && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--ok)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--ok)" }}
              />
              <span className="font-medium">完成</span>
            </span>
          )}
          {isError && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--danger)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--danger)" }}
              />
              <span className="font-medium">失败</span>
            </span>
          )}
        </div>
      </div>

      {/* 参数预览 */}
      {inv.args && typeof inv.args.prompt === "string" && inv.args.prompt && (
        <div
          className="text-[11.5px] rounded-md p-2"
          style={{
            background: "var(--surface-2)",
            border: `1px solid ${isError ? "color-mix(in srgb, var(--danger) 25%, transparent)" : "var(--border)"}`,
            color: "var(--text-3)",
          }}
        >
          <span
            className="font-mono"
            style={{ color: "var(--text-4)" }}
          >
            prompt:{" "}
          </span>
          <span
            className="break-words leading-relaxed"
            style={{ color: "var(--text-2)" }}
          >
            {String(inv.args.prompt).slice(0, 200)}
            {String(inv.args.prompt).length > 200 ? "…" : ""}
          </span>
        </div>
      )}

      {/* 其他关键参数 */}
      {inv.args &&
        Object.entries(inv.args)
          .filter(([k]) => k !== "prompt" && k !== "path")
          .slice(0, 2)
          .map(([k, v]) => (
            <div
              key={k}
              className="text-[11.5px]"
              style={{
                color: "var(--text-3)",
              }}
            >
              <span className="font-mono" style={{ color: "var(--text-4)" }}>
                {k}:{" "}
              </span>
              <span style={{ color: "var(--text-2)" }}>
                {String(v).slice(0, 80)}
              </span>
            </div>
          ))}

      {/* 进度条（仅运行中） */}
      {isRunning && (
        <div className="progress-bar">
          <span className="fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* 文件树（list_directory） */}
      {inv.name === "list_directory" && inv.resultJson && (
        <FileTree resultJson={inv.resultJson} />
      )}

      {/* 产物展示（图/视频） */}
      {inv.artifacts && inv.artifacts.length > 0 && (
        <div className="grid grid-cols-1 gap-2 pt-1">
          {inv.artifacts.map((a, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden"
              style={{
                border: `1px solid ${isError ? "color-mix(in srgb, var(--danger) 25%, transparent)" : "var(--border)"}`,
                background: "var(--surface-2)",
              }}
            >
              {a.kind === "image" ? (
                <img
                  src={a.url}
                  alt="generated"
                  className="w-full h-auto max-h-[400px] object-contain"
                  loading="lazy"
                />
              ) : (
                <video
                  src={a.url}
                  controls
                  playsInline
                  className="w-full max-h-[400px] object-contain bg-black"
                  preload="metadata"
                />
              )}
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block text-[11px] truncate px-2.5 py-2 border-t"
                style={{
                  color: "var(--text-3)",
                  borderColor: "var(--border)",
                }}
              >
                {a.url.length > 100 ? a.url.slice(0, 100) + "…" : a.url}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 错误文本 */}
      {isError && inv.errorText && (
        <div
          className="text-[12px] rounded-md p-2.5 leading-relaxed"
          style={{
            color: "var(--danger)",
            background: "color-mix(in srgb, var(--danger) 10%, transparent)",
            border: `1px solid color-mix(in srgb, var(--danger) 25%, transparent)`,
          }}
        >
          {inv.errorText}
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  text: string;
  toolInvocations?: ToolInvocation[];
  streaming?: boolean;
  isError?: boolean;
}

export function MessageBubble({
  role,
  text,
  toolInvocations,
  streaming,
  isError,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-3 max-w-full ${isUser ? "justify-end" : "justify-start"} fade-in`}
    >
      {!isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold self-start mt-0.5"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "#fff",
            boxShadow: "0 4px 14px -4px var(--accent)",
          }}
        >
          AI
        </div>
      )}

      <div className={`flex-1 ${isUser ? "max-w-[85%]" : "max-w-full"}`}>
        {/* 文字内容 */}
        {text ? (
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${streaming && !isUser ? "stream-cursor" : ""}`}
            style={{
              background: isUser
                ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                : isError
                ? "color-mix(in srgb, var(--danger) 10%, transparent)"
                : "var(--surface)",
              color: isUser ? "#fff" : "var(--text)",
              border: `1px solid ${
                isUser
                  ? "transparent"
                  : isError
                  ? "color-mix(in srgb, var(--danger) 30%, transparent)"
                  : "var(--border)"
              }`,
              boxShadow: isUser ? "0 4px 14px -4px var(--accent)" : "var(--shadow-sm)",
            }}
          >
            {isUser ? (
              text
            ) : (
              <MarkdownRenderer content={text} />
            )}
          </div>
        ) : null}

        {/* 工具调用卡片 */}
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="mt-1 space-y-1">
            {toolInvocations.map((inv) => (
              <ToolCallCard key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold self-start mt-0.5"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-2)",
            border: "1px solid var(--border)",
          }}
        >
          我
        </div>
      )}
    </div>
  );
}
