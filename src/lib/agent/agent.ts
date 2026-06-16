import type { LLMProvider } from "../api/provider";
import type {
  ChatMessage,
  ToolCall,
  ToolDefinition,
} from "../api/types";
import {
  buildRuntimeRegistry,
  getToolDefinitions,
} from "./tools";
import {
  getActiveProfile,
  loadPlugins,
  loadMcpServers,
} from "../storage/extensions";
import type { UIChatMessage, ToolInvocation, AgentStreamCallbacks } from "./types";

export type { UIChatMessage, ToolInvocation, AgentStreamCallbacks } from "./types";

/** Agent 核心：编排 LLM <-> 工具的调用循环 */
export class AgentEngine {
  private client: LLMProvider;
  private aborted = false;

  constructor(client: LLMProvider) {
    this.client = client;
  }

  requestStop() {
    this.aborted = true;
  }

  /** 构建 system prompt：核心规则 + 动态工具列表（从 registry 生成）+ skill 提示 */
  private systemPrompt(
    extraPrompt: string[],
    toolDefs: ToolDefinition[]
  ): string {
    const lines: string[] = [];
    lines.push(
      "你是 Agnes Agent，一个运行在用户桌面上的多模态 AI 助手。\n"
    );

    // 动态从 tool registry 生成能力列表 — 新增工具无需手动维护这里
    lines.push("你的能力（通过 tool_calling 使用）：\n");
    for (const t of toolDefs) {
      // 取 description 第一句作为简要说明
      const brief = t.function.description.split(/[。．.]/)[0];
      lines.push(`- ${t.function.name}：${brief}\n`);
    }

    lines.push(
      "\n行为准则：\n" +
        "- 当用户要求画图 / 做视频 / 读取本地文件 / 写入文件 / 管理任务 时，主动调用对应工具。\n" +
        "- 不确定路径时，先调用 list_directory 查看结构，再决定下一步。\n" +
        "- 文件工具的参数必须在工作目录内。不要硬编码路径。\n" +
        "- 所有 image / video 生成工具的 prompt 请使用英文以获得更好效果。\n" +
        "- 调用工具后，根据 tool result 用中文给用户简洁的总结，并把图片/视频 URL 直接展示给用户。\n" +
        "- 不要虚构不存在的工具：任何工具名必须在提供的 tools 列表里。"
    );
    if (extraPrompt.length > 0) {
      lines.push("\n==== 额外指引（用户启用的 skills / plugins） ====");
      for (const p of extraPrompt) lines.push("· " + p);
    }
    return lines.join("");
  }

  /** 主函数：接收用户输入，驱动整个循环。返回最终的 assistant 文本。 */
  async run(
    userInput: string,
    conversationHistory: UIChatMessage[],
    cb: AgentStreamCallbacks
  ): Promise<void> {
    this.aborted = false;

    // 0. 读取运行时配置：skills / plugins / mcp
    const profile = getActiveProfile();
    const plugins = loadPlugins();
    const enabledHttpPlugins = plugins.filter((p) => p.enabled && p.type === "http_api");
    const enabledSimplePlugins = plugins.filter((p) => p.enabled && p.type === "simple");

    // 运行时工具注册表：基础 + plugin(http_api) + mcp
    const runtimeRegistry = buildRuntimeRegistry(this.client, {
      plugins: enabledHttpPlugins,
    });
    const toolDefs = getToolDefinitions(runtimeRegistry);

    // 收集额外的 system prompt（skills + simple plugins）
    const extraPrompts: string[] = [];
    for (const p of profile.extraSystemPrompts) extraPrompts.push(p);
    for (const p of enabledSimplePlugins) {
      if (p.systemPrompt) {
        extraPrompts.push(`[plugin:${p.name}] ${p.systemPrompt}`);
      }
    }

    // 1. 构造发送给 LLM 的消息数组（system prompt 从 toolDefs 动态生成工具列表）
    const messages: ChatMessage[] = [
      { role: "system", content: this.systemPrompt(extraPrompts, toolDefs) },
    ];

    // 把历史转为 API message（把 tool 调用转成 tool_calls + tool 消息）
    for (const m of conversationHistory) {
      if (m.isError) continue;
      if (m.role === "user") {
        messages.push({ role: "user", content: m.text });
      } else if (m.role === "assistant") {
        // 有 tool 调用 -> 需要拆成：assistant（tool_calls）+ 多条 tool 消息
        if (m.toolInvocations.length > 0) {
          const tool_calls: ToolCall[] = m.toolInvocations.map((inv) => ({
            id: inv.id,
            type: "function",
            function: {
              name: inv.name,
              arguments: JSON.stringify(inv.args),
            },
          }));
          messages.push({
            role: "assistant",
            content: m.text,
            tool_calls,
          });
          // 每条 tool_call 后追加一条 tool 结果消息
          for (const inv of m.toolInvocations) {
            // B3 修复：使用 != null 判断而非 ||，避免 falsy 值被误判为错误
            messages.push({
              role: "tool",
              tool_call_id: inv.id,
              content:
                inv.resultJson != null
                  ? inv.resultJson
                  : JSON.stringify({
                      error: inv.errorText || "tool failed",
                    }),
            });
          }
        } else {
          messages.push({ role: "assistant", content: m.text });
        }
      }
    }

    // 追加本次用户输入
    messages.push({ role: "user", content: userInput });

    cb.onStatus("思考中...");

    // 2. 循环：LLM 可能多次请求工具调用，最多 10 轮防死循环
    const maxRounds = 10;
    let currentAssistantId: string | null = null;
    const currentToolInvs: ToolInvocation[] = [];
    let accumulatedText = "";

    for (let round = 0; round < maxRounds; round++) {
      if (this.aborted) break;

      const toolCalls: ToolCall[] = [];
      let roundText = "";
      let firstChunkForRound = true;

      cb.onStatus(round === 0 ? "正在回复..." : "继续思考...");

      // 流式调用 LLM
      try {
        for await (const chunk of this.client.chatStream({
          messages,
          tools: toolDefs,
          tool_choice: "auto",
          temperature: 0.6,
          max_tokens: 4096,  // 给工具调用留足空间
        })) {
          if (this.aborted) break;
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // 文本增量
          if (typeof delta.content === "string" && delta.content) {
            roundText += delta.content;
            accumulatedText += delta.content;

            if (firstChunkForRound && roundText.length > 0) {
              currentAssistantId = this.ensureAssistantMessage(
                currentAssistantId,
                accumulatedText,
                currentToolInvs,
                cb
              );
              firstChunkForRound = false;
            } else if (currentAssistantId) {
              cb.onMessageUpdate(currentAssistantId, {
                text: accumulatedText,
              });
            }
          }

          // tool_calls
          if (delta.tool_calls && delta.tool_calls.length > 0) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              while (toolCalls.length <= idx) {
                toolCalls.push({
                  id: "",
                  type: "function",
                  function: { name: "", arguments: "" },
                });
              }
              if (tc.id) toolCalls[idx].id = tc.id;
              if (tc.function?.name)
                toolCalls[idx].function.name += tc.function.name;
              if (tc.function?.arguments)
                toolCalls[idx].function.arguments += tc.function.arguments;
            }
          }
        }
      } catch (err) {
        const msg = (err as Error).message || String(err);
        if (!currentAssistantId) {
          currentAssistantId = cb.onNewMessage({
            id: "",
            role: "assistant",
            text: `⚠️ API 调用失败: ${msg}`,
            toolInvocations: [],
            streaming: false,
            isError: true,
            createdAt: Date.now(),
          });
        } else {
          cb.onMessageUpdate(currentAssistantId, {
            text: accumulatedText + `\n\n⚠️ 出错了: ${msg}`,
            streaming: false,
            isError: true,
          });
        }
        cb.onStatus("已停止");
        return;
      }

      if (this.aborted) break;

      // 本轮无工具调用 -> 结束循环
      if (toolCalls.length === 0) {
        if (!currentAssistantId) {
          currentAssistantId = this.ensureAssistantMessage(
            null,
            accumulatedText,
            currentToolInvs,
            cb
          );
        }
        if (currentAssistantId) {
          cb.onMessageUpdate(currentAssistantId, {
            streaming: false,
            text: accumulatedText,
          });
        }
        cb.onStatus("完成");
        return;
      }

      // 3. 有工具调用 -> 先把"正在调用工具"的状态反映到 UI
      cb.onStatus(`准备调用 ${toolCalls.length} 个工具...`);

      if (!currentAssistantId) {
        currentAssistantId = this.ensureAssistantMessage(
          null,
          accumulatedText,
          currentToolInvs,
          cb
        );
      }

      // 4. 执行工具调用
      const runResults: Array<{
        toolCallId: string;
        toolName: string;
        toolArgs: Record<string, unknown>;
        resultJson: string;
        error?: string;
        inv: ToolInvocation;
      }> = [];

      for (const tc of toolCalls) {
        const tool = runtimeRegistry[tc.function.name];
        if (!tool) {
          const errMsg = `Unknown tool: ${tc.function.name}`;
          const inv: ToolInvocation = {
            id: tc.id || `unknown_${Date.now()}`,
            name: tc.function.name || "unknown",
            args: {},
            status: "error",
            progress: 0,
            infoText: errMsg,
            artifacts: [],
          };
          currentToolInvs.push(inv);
          runResults.push({
            toolCallId: inv.id,
            toolName: inv.name,
            toolArgs: {},
            resultJson: JSON.stringify({ error: errMsg }),
            error: errMsg,
            inv,
          });
          if (currentAssistantId)
            cb.onMessageUpdate(currentAssistantId, {
              toolInvocations: [...currentToolInvs],
            });
          continue;
        }

        // 解析参数
        let toolArgs: Record<string, unknown> = {};
        let argsParseFailed = false;
        try {
          toolArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          argsParseFailed = true;
        }

        const infoPrefix = argsParseFailed ? "⚠️ 参数解析失败，" : "";
        const inv: ToolInvocation = {
          id: tc.id || `${tc.function.name}_${Date.now()}`,
          name: tc.function.name,
          args: toolArgs,
          status: "running",
          progress: 0,
          infoText: `${infoPrefix}启动中...`,
          artifacts: [],
        };
        currentToolInvs.push(inv);
        if (currentAssistantId)
          cb.onMessageUpdate(currentAssistantId, {
            toolInvocations: [...currentToolInvs],
          });

        if (argsParseFailed) {
          const errText = `failed to parse arguments: ${tc.function.arguments}`;
          inv.status = "error";
          inv.errorText = errText;
          inv.infoText = `⚠️ 参数解析失败`;
          inv.resultJson = JSON.stringify({ error: errText });
          runResults.push({
            toolCallId: inv.id,
            toolName: inv.name,
            toolArgs: {},
            resultJson: inv.resultJson,
            error: errText,
            inv,
          });
          if (currentAssistantId)
            cb.onMessageUpdate(currentAssistantId, {
              toolInvocations: [...currentToolInvs],
            });
          continue;
        }

        try {
          cb.onStatus(`执行: ${tc.function.name}`);
          const resultJson = await tool.run(toolArgs, {
            onProgress: (p, s) => {
              inv.progress = p;
              if (s) inv.infoText = s;
              if (currentAssistantId)
                cb.onMessageUpdate(currentAssistantId, {
                  toolInvocations: [...currentToolInvs],
                });
            },
            onInfo: (text) => {
              inv.infoText = text;
              if (currentAssistantId)
                cb.onMessageUpdate(currentAssistantId, {
                  toolInvocations: [...currentToolInvs],
                });
            },
          });

          // 解析产物（图片/视频 URL）
          try {
            const parsed = JSON.parse(resultJson);
            if (parsed.image_url) {
              inv.artifacts.push({ kind: "image", url: parsed.image_url });
            }
            if (parsed.video_url) {
              inv.artifacts.push({ kind: "video", url: parsed.video_url });
            }
            if (parsed.image_data_url) {
              inv.artifacts.push({ kind: "image", url: parsed.image_data_url });
            }
          } catch {
            // ignore parse
          }

          inv.status = "success";
          inv.progress = 100;
          inv.resultJson = resultJson;
          runResults.push({
            toolCallId: inv.id,
            toolName: inv.name,
            toolArgs,
            resultJson,
            inv,
          });
        } catch (e) {
          const errText = (e as Error).message || String(e);
          inv.status = "error";
          inv.errorText = errText;
          inv.resultJson = JSON.stringify({ error: errText });
          runResults.push({
            toolCallId: inv.id,
            toolName: inv.name,
            toolArgs,
            resultJson: inv.resultJson,
            error: errText,
            inv,
          });
        }
        if (currentAssistantId)
          cb.onMessageUpdate(currentAssistantId, {
            toolInvocations: [...currentToolInvs],
          });
      }

      // 5. 把 tool_calls 追加到 LLM messages
      messages.push({
        role: "assistant",
        content: roundText,
        tool_calls: toolCalls.map((tc) => ({
          id: currentToolInvs[toolCalls.indexOf(tc)]?.id || tc.id,
          type: "function",
          function: tc.function,
        })),
      });

      for (const r of runResults) {
        messages.push({
          role: "tool",
          tool_call_id: r.toolCallId,
          content: r.resultJson,
        });
      }
    }

    // 超过最大轮次，收尾
    if (currentAssistantId) {
      cb.onMessageUpdate(currentAssistantId, {
        text: accumulatedText,
        streaming: false,
        toolInvocations: currentToolInvs,
      });
    }
    cb.onStatus("完成");
  }

  /** 确保存在一条 assistant 消息，并返回其 id */
  private ensureAssistantMessage(
    existingId: string | null,
    text: string,
    invs: ToolInvocation[],
    cb: AgentStreamCallbacks
  ): string {
    if (existingId) {
      cb.onMessageUpdate(existingId, { text, toolInvocations: [...invs] });
      return existingId;
    }
    const newMsg: UIChatMessage = {
      id: "",
      role: "assistant",
      text,
      toolInvocations: invs,
      streaming: true,
      createdAt: Date.now(),
    };
    return cb.onNewMessage(newMsg);
  }
}

/** 把 API chunk 里 tool_calls 的索引字段补充到类型里（我们在运行时需要） */
declare module "../api/types" {
  interface ToolCall {
    index?: number;
  }
}
