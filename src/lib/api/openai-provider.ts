// OpenAI-Compatible Provider — 支持 OpenAI / DeepSeek / Ollama / Groq 等
// 任何兼容 OpenAI Chat Completions API 的服务都可以使用此 Provider

import type {
  ChatCompletionResponse,
  ChatCompletionChunk,
  ImageGenerationResponse,
} from "./types";
import type { LLMProvider, LLMChatRequest, LLMVideoRequest, LLMImageRequest } from "./provider";

export interface OpenAIConfig {
  apiKey: string;
  /** API Base URL，默认 https://api.openai.com/v1 */
  baseUrl?: string;
  /** 模型名，默认 gpt-4o */
  model?: string;
  /** 是否支持原生图片生成（DALL-E），默认 false */
  supportsImageGen?: boolean;
  /** 是否支持原生视频生成，默认 false */
  supportsVideoGen?: boolean;
}

export class OpenAICompatibleProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  public model: string;
  private supportsImageGen: boolean;
  private supportsVideoGen: boolean;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = config.model || "gpt-4o";
    this.supportsImageGen = config.supportsImageGen ?? false;
    this.supportsVideoGen = config.supportsVideoGen ?? false;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  // ============== CHAT ==============

  async chat(req: LLMChatRequest): Promise<ChatCompletionResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: req.model || this.model,
        ...req,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI API ${res.status}: ${body || res.statusText}`);
    }
    return (await res.json()) as ChatCompletionResponse;
  }

  async *chatStream(req: LLMChatRequest): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: req.model || this.model,
        ...req,
        stream: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI API ${res.status}: ${body || res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data) as ChatCompletionChunk;
            yield chunk;
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  }

  // ============== IMAGE ==============

  async generateImage(req: LLMImageRequest): Promise<ImageGenerationResponse> {
    if (this.supportsImageGen) {
      // 原生 DALL-E 风格图片生成
      const res = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model: (req as any).model || "dall-e-3",
          prompt: req.prompt,
          size: req.size || "1024x1024",
          n: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Image API ${res.status}: ${body}`);
      }
      return (await res.json()) as ImageGenerationResponse;
    } else {
      // 降级：使用 chat 模式让 LLM "生成"图片描述，但不返回真实图片
      throw new Error(
        "当前 Provider 不支持原生图片生成。请配置 supportsImageGen=true 或使用 Agnes Provider。"
      );
    }
  }

  async textToImage(prompt: string, size = "1024x1024"): Promise<string> {
    const res = await this.generateImage({
      prompt,
      size,
      model: "dall-e-3",
    } as LLMImageRequest);
    const first = res.data?.[0];
    if (!first?.url) throw new Error("Image generation returned no URL");
    return first.url;
  }

  // ============== VIDEO ==============

  async generateVideo(
    _req: LLMVideoRequest,
    _onProgress?: (progress: number, status: string) => void
  ): Promise<{ videoUrl: string; video_id: string }> {
    throw new Error(
      "当前 Provider 不支持视频生成。请使用 Agnes Provider。"
    );
  }
}
