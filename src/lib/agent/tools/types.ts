// 工具系统共享类型

import type { ToolDefinition } from "../../api/types";

/** 工具执行上下文 */
export interface ToolRunContext {
  onProgress: (progress: number, status?: string) => void;
  onInfo: (text: string) => void;
}

/** Agent 工具 */
export interface AgentTool {
  definition: ToolDefinition;
  run: (
    args: Record<string, unknown>,
    ctx: ToolRunContext
  ) => Promise<string>; // 返回 tool result（JSON 字符串）
}
