// tools.ts → 已重构为 tools/ 目录
// 此文件保留向后兼容：re-export 所有内容
// agent.ts 通过 "./tools" 解析到此文件，再转发到 tools/index.ts

export type { AgentTool, ToolRunContext } from "./tools/index";
export {
  buildToolRegistry,
  buildRuntimeRegistry,
  getToolDefinitions,
  hasFileTools,
} from "./tools/index";
