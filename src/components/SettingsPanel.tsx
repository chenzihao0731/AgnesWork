import React, { useState } from "react";
import {
  loadConfig,
  saveConfig,
  getDefaultProvider,
  getProviderPreset,
  type ProviderType,
  type ProviderConfig,
} from "../lib/storage/config";
import {
  SettingsIcon, CloseIcon, ChevronDownIcon, EyeIcon, EyeOffIcon,
} from "./icons";

const PROVIDER_OPTIONS: Array<{ value: ProviderType; label: string; desc: string }> = [
  { value: "agnes", label: "Agnes AI", desc: "默认供应商，支持文生图" },
  { value: "openai", label: "OpenAI", desc: "GPT-4o / GPT-4o-mini" },
  { value: "deepseek", label: "DeepSeek", desc: "deepseek-chat / deepseek-coder" },
  { value: "ollama", label: "Ollama", desc: "本地模型，无需 API Key" },
  { value: "custom", label: "自定义", desc: "兼容 OpenAI 格式的任意服务" },
];

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
  const defaultProvider = getDefaultProvider();
  const [provider, setProvider] = useState<ProviderConfig>(current.provider ?? defaultProvider);
  const [apiKey, setApiKey] = useState(current.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("general");

  if (!open) return null;

  const onProviderTypeChange = (type: ProviderType) => {
    const preset = getProviderPreset(type);
    setProvider((prev) => ({ ...prev, ...preset, type, apiKey: prev.apiKey }));
  };

  const updateProvider = (field: keyof ProviderConfig, value: string | number | boolean) => {
    setProvider((prev) => ({ ...prev, [field]: value }));
  };

  const submit = () => {
    setSaving(true);
    const trimmedApiKey = apiKey.trim();
    saveConfig({
      apiKey: trimmedApiKey,
      provider: { ...provider, apiKey: provider.apiKey || trimmedApiKey },
    });
    setTimeout(() => {
      setSaving(false);
      setJustSaved(true);
      onSaved(trimmedApiKey);
      setTimeout(() => setJustSaved(false), 1500);
    }, 300);
  };

  const sections = [
    { id: "general", label: "通用设置", icon: SettingsIcon },
    { id: "provider", label: "模型配置", icon: ChevronDownIcon },
    { id: "advanced", label: "高级设置", icon: SettingsIcon },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl fade-in overflow-hidden flex"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "85vh",
        }}
      >
        {/* 左侧导航 */}
        <div
          className="w-48 flex-shrink-0 flex flex-col py-4"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <div className="px-4 pb-4 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              设置
            </h2>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
              配置你的 AI 助手
            </p>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all"
                style={{
                  background: activeSection === s.id ? "var(--accent)" : "transparent",
                  color: activeSection === s.id ? "#fff" : "var(--text-2)",
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== s.id) e.currentTarget.style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== s.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </nav>
          <div className="px-4 pt-3 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
              AgnesWork v1.0
            </p>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 顶部栏 */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h3 className="text-[14px] font-medium" style={{ color: "var(--text)" }}>
              {sections.find((s) => s.id === activeSection)?.label}
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 滚动内容区 */}
          <div className="flex-1 overflow-y-auto scrollable px-5 py-5">
            {activeSection === "general" && (
              <div className="space-y-5">
                {/* API Key */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder="输入你的 API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="input w-full font-mono text-[13px] pr-10"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all"
                      style={{ color: "var(--text-3)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
                    >
                      {showApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                    Key 仅保存在本地，不会上传到任何服务器。
                  </p>
                </div>

                {/* 当前供应商 */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    当前供应商
                  </label>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-bold"
                      style={{
                        background: provider.type === "agnes"
                          ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                          : "var(--surface-3)",
                        color: provider.type === "agnes" ? "#fff" : "var(--text)",
                      }}
                    >
                      {provider.type === "agnes" ? "A" : provider.type[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                        {PROVIDER_OPTIONS.find((o) => o.value === provider.type)?.label ?? "未知"}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
                        {provider.model || "未设置模型"}
                      </div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                      style={{
                        background: apiKey ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: apiKey ? "var(--ok)" : "var(--danger)",
                      }}
                    >
                      {apiKey ? "已配置" : "未配置"}
                    </div>
                  </div>
                </div>

                {/* 工作目录 */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    工作目录
                  </label>
                  <input
                    type="text"
                    placeholder="C:\Users\...\workspace"
                    value={provider.workspacePath}
                    onChange={(e) => updateProvider("workspacePath", e.target.value)}
                    className="input w-full text-[13px]"
                  />
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                    Agent 读写文件的默认目录
                  </p>
                </div>
              </div>
            )}

            {activeSection === "provider" && (
              <div className="space-y-5">
                {/* 供应商选择 */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    选择供应商
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onProviderTypeChange(opt.value)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: provider.type === opt.value ? "var(--accent)" : "var(--surface-2)",
                          border: `1px solid ${provider.type === opt.value ? "var(--accent)" : "var(--border)"}`,
                          color: provider.type === opt.value ? "#fff" : "var(--text)",
                        }}
                        onMouseEnter={(e) => {
                          if (provider.type !== opt.value) e.currentTarget.style.background = "var(--surface-3)";
                        }}
                        onMouseLeave={(e) => {
                          if (provider.type !== opt.value) e.currentTarget.style.background = "var(--surface-2)";
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                          style={{
                            background: provider.type === opt.value
                              ? "rgba(255,255,255,0.2)"
                              : "var(--surface-3)",
                            color: provider.type === opt.value ? "#fff" : "var(--text)",
                          }}
                        >
                          {opt.value[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium">{opt.label}</div>
                          <div
                            className="text-[11px] truncate"
                            style={{ color: provider.type === opt.value ? "rgba(255,255,255,0.7)" : "var(--text-3)" }}
                          >
                            {opt.desc}
                          </div>
                        </div>
                        {provider.type === opt.value && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.3)" }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key（供应商专用） */}
                {provider.type !== "ollama" && (
                  <div>
                    <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                      {provider.type === "agnes" ? "Agnes API Key" : "API Key"}
                    </label>
                    <input
                      type="password"
                      placeholder={provider.type === "agnes" ? "agnes-xxxxxxxxxxxxxxxxxxxx" : "sk-..."}
                      value={provider.apiKey}
                      onChange={(e) => updateProvider("apiKey", e.target.value)}
                      className="input w-full font-mono text-[13px]"
                    />
                  </div>
                )}

                {/* Base URL */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    API Base URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={provider.baseUrl}
                    onChange={(e) => updateProvider("baseUrl", e.target.value)}
                    className="input w-full font-mono text-[13px]"
                  />
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                    {provider.type === "agnes" ? "留空使用默认地址" : "OpenAI 兼容格式的 API 地址"}
                  </p>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    模型名称
                  </label>
                  <input
                    type="text"
                    placeholder={provider.type === "openai" ? "gpt-4o" : provider.type === "deepseek" ? "deepseek-chat" : "模型名称"}
                    value={provider.model}
                    onChange={(e) => updateProvider("model", e.target.value)}
                    className="input w-full font-mono text-[13px]"
                  />
                </div>

                {/* 图片生成 */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                      支持图片生成
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      启用后可以使用文生图功能
                    </div>
                  </div>
                  <button
                    onClick={() => updateProvider("supportsImageGen", !provider.supportsImageGen)}
                    className="w-11 h-6 rounded-full transition-all flex items-center px-0.5"
                    style={{
                      background: provider.supportsImageGen ? "var(--accent)" : "var(--surface-3)",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full transition-all shadow-sm"
                      style={{
                        background: "#fff",
                        transform: provider.supportsImageGen ? "translateX(20px)" : "translateX(0)",
                      }}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeSection === "advanced" && (
              <div className="space-y-5">
                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
                      温度 (Temperature)
                    </label>
                    <span
                      className="text-[12px] font-mono px-2 py-0.5 rounded-md"
                      style={{ background: "var(--surface-2)", color: "var(--text)" }}
                    >
                      {provider.temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={provider.temperature}
                    onChange={(e) => updateProvider("temperature", parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                  <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                    <span>精确 (0)</span>
                    <span>平衡 (0.7)</span>
                    <span>创意 (2.0)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    最大输出长度 (Max Tokens)
                  </label>
                  <input
                    type="number"
                    min={256}
                    max={32768}
                    step={256}
                    value={provider.maxTokens}
                    onChange={(e) => updateProvider("maxTokens", parseInt(e.target.value) || 4096)}
                    className="input w-full font-mono text-[13px]"
                  />
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                    单次回复的最大 token 数
                  </p>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-[12px] mb-2 font-medium" style={{ color: "var(--text-2)" }}>
                    系统提示词 (System Prompt)
                  </label>
                  <textarea
                    placeholder="留空使用默认提示词。你可以自定义 AI 的角色和行为..."
                    value={provider.systemPrompt}
                    onChange={(e) => updateProvider("systemPrompt", e.target.value)}
                    rows={4}
                    className="input w-full text-[13px] resize-none"
                    style={{ lineHeight: "1.6" }}
                  />
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                    自定义 AI 助手的角色设定和行为规则
                  </p>
                </div>

                {/* 危险操作 */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <label className="block text-[12px] mb-3 font-medium" style={{ color: "var(--danger)" }}>
                    危险操作
                  </label>
                  <button
                    onClick={() => {
                      if (confirm("确定要清除所有本地数据吗？此操作不可恢复。")) {
                        localStorage.clear();
                        location.reload();
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "var(--danger)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                  >
                    清除所有本地数据
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div
            className="flex items-center justify-end gap-2 px-5 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}
          >
            {justSaved && (
              <span className="text-[12px] mr-2" style={{ color: "var(--ok)" }}>
                已保存
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: "var(--surface-3)", color: "var(--text-2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--border)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-3)"; }}
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                boxShadow: "0 4px 14px -4px var(--accent)",
              }}
            >
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
