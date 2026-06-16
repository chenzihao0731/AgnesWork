// 工具注册表：基础工具 + 插件 + MCP 的动态组装

import type { LLMProvider } from "../../api/provider";
import type { ToolDefinition } from "../../api/types";
import { isDesktopEnv } from "../../api/fs";
import type { Plugin } from "../../storage/extensions";
import type { AgentTool } from "./types";

import { makeTextToImageTool, makeTextToVideoTool, makeImageToImageTool } from "./media";
import {
  makeListDirTool,
  makeReadTextTool,
  makeWriteTextTool,
  makeReadImageTool,
  makeCompressImageTool,
  makeCompressFilesTool,
} from "./filesystem";
import {
  makeListTodoTool,
  makeAddTodoTool,
  makeCompleteTodoTool,
  makeRemoveTodoTool,
} from "./todo";
import { makeListGoalsTool, makeAddGoalTool, makeCompleteGoalTool } from "./goals";
import { makeBrowserNavigateTool, makeBrowserScreenshotTool } from "./browser";
import { makeWebSearchTool } from "./websearch";
import { makePluginTool } from "./plugin";
import { buildMcpTools } from "./mcp";

export function buildToolRegistry(client: LLMProvider): Record<string, AgentTool> {
  const tools = [
    makeTextToImageTool(client),
    makeTextToVideoTool(client),
    makeImageToImageTool(client),
    makeListDirTool(),
    makeReadTextTool(),
    makeWriteTextTool(),
    makeReadImageTool(),
    makeListTodoTool(),
    makeAddTodoTool(),
    makeCompleteTodoTool(),
    makeRemoveTodoTool(),
    makeBrowserNavigateTool(),
    makeBrowserScreenshotTool(),
    makeWebSearchTool(),
    makeCompressImageTool(),
    makeCompressFilesTool(),
    makeListGoalsTool(),
    makeAddGoalTool(),
    makeCompleteGoalTool(),
  ];
  return Object.fromEntries(tools.map((t) => [t.definition.function.name, t]));
}

export function buildRuntimeRegistry(
  client: LLMProvider,
  extra: { plugins?: Plugin[] } = {}
): Record<string, AgentTool> {
  const base = buildToolRegistry(client);
  if (extra.plugins) {
    for (const p of extra.plugins) {
      if (!p.enabled) continue;
      if (p.type !== "http_api") continue;
      const tool = makePluginTool(p);
      base[tool.definition.function.name] = tool;
    }
  }
  const mcpTools = buildMcpTools();
  for (const t of mcpTools) {
    base[t.definition.function.name] = t;
  }
  return base;
}

export function getToolDefinitions(
  registry: Record<string, AgentTool>
): ToolDefinition[] {
  return Object.values(registry).map((t) => t.definition);
}

export function hasFileTools(): boolean {
  return isDesktopEnv();
}
