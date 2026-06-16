import type {
  ChatCompletionResponse,
  ChatCompletionChunk,
  ImageGenerationResponse,
  VideoTaskResponse,
  VideoResultResponse,
} from "./types";
import type { LLMProvider, LLMChatRequest, LLMVideoRequest, LLMImageRequest } from "./provider";

const BASE_URL = "https://apihub.agnes-ai.com";

export class AgnesApiClient implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  updateApiKey(key: string) {
    this.apiKey = key;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /** 通用 fetch 包装 */
  private async request<T>(
    url: string,
    init: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { ...this.headers(), ...(init.headers || {}) },
    });

    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // ignore
      }
      throw new Error(`Agnes API ${res.status}: ${body || res.statusText}`);
    }
    return (await res.json()) as T;
  }

  // ============== CHAT ==============

  async chat(req: LLMChatRequest): Promise<ChatCompletionResponse> {
    return this.request<ChatCompletionResponse>(
      `${this.baseUrl}/v1/chat/completions`,
      {
        method: "POST",
        body: JSON.stringify({ model: "agnes-2.0-flash", ...req }),
      }
    );
  }

  /** 流式聊天，返回一个 async iterator */
  async *chatStream(req: LLMChatRequest): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        stream: true,
        ...req,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Agnes API ${res.status}: ${body}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE: 每个 event 以 \n\n 分隔
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
            // 忽略解析失败的行
          }
        }
      }
    }
  }

  // ============== IMAGE ==============

  async generateImage(req: LLMImageRequest): Promise<ImageGenerationResponse> {
    return this.request<ImageGenerationResponse>(
      `${this.baseUrl}/v1/images/generations`,
      {
        method: "POST",
        body: JSON.stringify({ model: "agnes-image-2.1-flash", ...req }),
      }
    );
  }

  /** 便捷方法：文生图（返回 URL） */
  async textToImage(prompt: string, size = "1024x768"): Promise<string> {
    const res = await this.generateImage({
      prompt,
      size,
      extra_body: { response_format: "url" },
    });
    const first = res.data?.[0];
    if (!first?.url) throw new Error("Image generation returned no URL");
    return first.url;
  }

  // ============== VIDEO ==============

  async createVideoTask(req: LLMVideoRequest): Promise<VideoTaskResponse> {
    return this.request<VideoTaskResponse>(`${this.baseUrl}/v1/videos`, {
      method: "POST",
      body: JSON.stringify({ model: "agnes-video-v2.0", ...req }),
    });
  }

  async getVideoResult(videoId: string): Promise<VideoResultResponse> {
    return this.request<VideoResultResponse>(
      `${this.baseUrl}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=agnes-video-v2.0`,
      { method: "GET" }
    );
  }

  /** 创建视频任务并轮询到完成，返回视频 URL */
  async generateVideo(
    req: LLMVideoRequest,
    onProgress?: (progress: number, status: string) => void
  ): Promise<{ videoUrl: string; video_id: string }> {
    const task = await this.createVideoTask(req);
    const videoId = task.video_id;
    // 轮询：视频生成比较慢，3 秒一次，最多 600 秒
    const maxIter = 200;
    for (let i = 0; i < maxIter; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const result = await this.getVideoResult(videoId);
      onProgress?.(result.progress, result.status);
      if (result.status === "completed") {
        if (!result.remixed_from_video_id)
          throw new Error("Video completed but no URL");
        return { videoUrl: result.remixed_from_video_id, video_id: videoId };
      }
      if (result.status === "failed") {
        throw new Error(result.error?.message || "Video generation failed");
      }
    }
    throw new Error("Video generation timed out");
  }
}

/** 单例 client 实例（由 AgentContext 管理） */
export const globalApiClient = {
  _instance: null as AgnesApiClient | null,
  get(): AgnesApiClient {
    if (!this._instance) throw new Error("API key not configured");
    return this._instance;
  },
  init(apiKey: string) {
    this._instance = new AgnesApiClient(apiKey);
  },
  has(): boolean {
    return !!this._instance;
  },
};
