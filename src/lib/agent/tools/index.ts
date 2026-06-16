// tools/ 目录的统一导出入口
// 与原 tools.ts 完全兼容 — agent.ts 通过 "./tools" 解析到此文件

export type { AgentTool, ToolRunContext } from "./types";
export { getToolDefinitions, hasFileTools } from "./registry";
export {
  buildToolRegistry,
  buildRuntimeRegistry,
} from "./registry";
