import React, { useState } from "react";
import { loadConfig, saveConfig } from "../lib/storage/config";
import { SettingsIcon } from "./icons";

export function SettingsPanel({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (key: string) => void;
}) {
  const current = loadConfig();
  const [apiKey, setApiKey] = useState(current.apiKey);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (!open) return null;

  const submit = () => {
    setSaving(true);
    saveConfig({ apiKey: apiKey.trim() });
    setTimeout(() => {
      setSaving(false);
      setJustSaved(true);
      onSaved(apiKey.trim());
      setTimeout(() => setJustSaved(false), 1500);
    }, 300);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl fade-in overflow-hidden"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            设置
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-3)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-3)";
            }}
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label
              className="block text-xs mb-1.5 font-medium"
              style={{ color: "var(--text-2)" }}
            >
              Agnes API Key
            </label>
            <input
              type="password"
              placeholder="agnes-xxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
              className="input w-full font-mono text-[13px]"
            />
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Key 仅保存在你本地浏览器的 localStorage 中，不会上传到任何服务器。
              获取 Key 请访问{" "}
              <a
                href="https://platform.agnes-ai.com"
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                platform.agnes-ai.com
              </a>
              。
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            {justSaved && (
              <span className="text-xs mr-2" style={{ color: "var(--ok)" }}>
                已保存
              </span>
            )}
            <button
              onClick={submit}
              disabled={saving || !apiKey.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                boxShadow: "0 4px 14px -4px var(--accent)",
              }}
            >
              {saving ? "保存中..." : "保存并使用"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
