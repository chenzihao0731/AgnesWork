// ===== Agnes API 类型定义 =====

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentBlock[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ContentBlock {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "required" | { type: "function"; function: { name: string } };
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant" | "tool";
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: "stop" | "tool_calls" | "length" | null;
  }>;
}

// ===== Image API =====
export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  size: string;
  image?: string[];
  return_base64?: boolean;
  extra_body?: {
    response_format?: "url" | "b64_json";
  };
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// ===== Video API =====
export interface VideoCreateRequest {
  model: string;
  prompt: string;
  image?: string | string[];
  mode?: string;
  height?: number;
  width?: number;
  num_frames?: number;
  frame_rate?: number;
  num_inference_steps?: number;
  seed?: number;
  negative_prompt?: string;
  extra_body?: {
    image?: string[];
    mode?: string;
  };
}

export interface VideoTaskResponse {
  id: string;
  task_id: string;
  video_id: string;
  object: "video";
  model: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  created_at: number;
  seconds?: string;
  size?: string;
}

export interface VideoResultResponse {
  id: string;
  video_id: string;
  model: string;
  object: "video";
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  seconds?: string;
  size?: string;
  remixed_from_video_id?: string;
  error?: { message: string } | null;
}
