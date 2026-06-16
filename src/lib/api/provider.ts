// LLM Provider 抽象接口 — 支持 Agnes AI / OpenAI / DeepSeek / Ollama 等
// AgentEngine 和 tools 依赖此接口，而非具体实现

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoCreateRequest,
} from "./types";

export interface LLMProvider {
  /** 流式聊天（SSE iterator），Agent 推理循环核心 */
  chatStream(req: LLMChatRequest): AsyncGenerator<ChatCompletionChunk, void, unknown>;

  /** 非流式聊天，用于标题生成等一次性任务 */
  chat(req: LLMChatRequest): Promise<ChatCompletionResponse>;

  /** 文生图 → 返回图片 URL */
  textToImage(prompt: string, size?: string): Promise<string>;

  /** 视频生成 → 返回 videoUrl + video_id */
  generateVideo(
    req: LLMVideoRequest,
    onProgress?: (progress: number, status: string) => void
  ): Promise<{ videoUrl: string; video_id: string }>;

  /** 通用图片生成 → 返回完整响应（图生图等场景） */
  generateImage(req: LLMImageRequest): Promise<ImageGenerationResponse>;
}

/** 扩展的聊天请求（允许覆盖 model） */
export type LLMChatRequest = Omit<ChatCompletionRequest, "model" | "stream"> & {
  model?: string;
  stream?: boolean;
};

/** 扩展的视频请求 */
export type LLMVideoRequest = Omit<VideoCreateRequest, "model"> & {
  model?: string;
};

/** 扩展的图片请求 */
export type LLMImageRequest = Omit<ImageGenerationRequest, "model"> & {
  model?: string;
};
