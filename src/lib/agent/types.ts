// Agent 层共享类型

/** UI 层消息（比 API message 多一些元数据） */
export interface UIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string; // 累积的文本（流式）
  toolInvocations: ToolInvocation[]; // 本轮调用过的工具
  streaming: boolean; // 是否正在流式输出
  isError?: boolean;
  createdAt: number;
}

/** UI 层记录的工具调用 */
export interface ToolInvocation {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "success" | "error";
  progress: number;
  infoText: string;
  resultJson?: string;
  errorText?: string;
  /** 可视化产物（图/视频 URL） */
  artifacts: Array<{ kind: "image" | "video"; url: string }>;
}

/** 给流式回调的数据结构 */
export interface AgentStreamCallbacks {
  onMessageUpdate: (msgId: string, partial: Partial<UIChatMessage>) => void;
  onNewMessage: (msg: UIChatMessage) => string; // 返回消息 id
  onStatus: (text: string) => void;
}
