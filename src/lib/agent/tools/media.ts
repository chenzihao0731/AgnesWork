// 媒体工具：图片/视频生成

import type { LLMProvider } from "../../api/provider";
import type { AgentTool } from "./types";

export function makeTextToImageTool(client: LLMProvider): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "generate_image",
        description:
          "根据文字描述生成一张图片。当用户要求画图、设计配图、生成视觉素材时使用。" +
          "返回一个可访问的图片 URL 和 prompt 摘要。",
        parameters: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "图片描述，必须是英文。建议包含：主体 + 场景 + 视觉风格 + 光照 + 构图。",
            },
            size: {
              type: "string",
              description: '输出尺寸，默认 "1024x768"。可选 "1024x768" / "768x1024" / "1024x1024"',
              default: "1024x768",
            },
          },
          required: ["prompt"],
        },
      },
    },
    async run(args, ctx) {
      const prompt = String(args.prompt || "").trim();
      const size = String(args.size || "1024x768");
      if (!prompt) throw new Error("prompt is required");
      ctx.onInfo(`正在生成: ${prompt.slice(0, 80)}...`);
      const url = await client.textToImage(prompt, size);
      ctx.onProgress(100, "completed");
      return JSON.stringify({
        success: true,
        image_url: url,
        prompt,
        size,
      });
    },
  };
}

export function makeTextToVideoTool(client: LLMProvider): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "generate_video",
        description:
          "根据文本描述生成一段视频。视频生成较慢（数十秒），需要等待。" +
          "返回一个可播放的视频 URL。",
        parameters: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "视频描述（英文）。建议包含 [主体] + [动作] + [场景] + [镜头] + [光照] + [风格]。",
            },
            duration_seconds: {
              type: "number",
              description: "时长，默认 5 秒。可选 3 / 5 / 10 / 18。",
              default: 5,
            },
            frame_rate: {
              type: "number",
              description: "帧率，默认 24。",
              default: 24,
            },
            aspect_ratio: {
              type: "string",
              description: '宽高比，默认 "16:9"。可选 "16:9" / "9:16" / "1:1"',
              default: "16:9",
            },
          },
          required: ["prompt"],
        },
      },
    },
    async run(args, ctx) {
      const prompt = String(args.prompt || "").trim();
      const duration = Number(args.duration_seconds) || 5;
      const frameRate = Number(args.frame_rate) || 24;

      let numFrames = Math.round(duration * frameRate);
      numFrames = Math.round((numFrames - 1) / 8) * 8 + 1;
      numFrames = Math.max(9, Math.min(441, numFrames));

      let width = 1152;
      let height = 768;
      const ratio = String(args.aspect_ratio || "16:9");
      if (ratio === "9:16") { width = 768; height = 1152; }
      else if (ratio === "1:1") { width = 896; height = 896; }

      if (!prompt) throw new Error("prompt is required");
      ctx.onInfo(`启动视频任务（${numFrames}帧 @ ${frameRate}fps，${width}x${height}）`);
      const { videoUrl, video_id } = await client.generateVideo(
        { prompt, num_frames: numFrames, frame_rate: frameRate, width, height },
        (progress, status) => ctx.onProgress(progress, status)
      );
      ctx.onProgress(100, "completed");
      return JSON.stringify({
        success: true,
        video_url: videoUrl,
        video_id,
        prompt,
        actual_duration_seconds: +(numFrames / frameRate).toFixed(2),
      });
    },
  };
}

export function makeImageToImageTool(client: LLMProvider): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "image_to_image",
        description:
          "基于一张参考图片 + 文本描述，生成一张新图片。参考图片必须是公开可达的 URL。",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "描述如何变化（英文）" },
            reference_image_url: {
              type: "string",
              description: "参考图片的公开 URL（https:// 或 data:image/...）",
            },
            size: {
              type: "string",
              description: '输出尺寸，默认 "1024x768"',
              default: "1024x768",
            },
          },
          required: ["prompt", "reference_image_url"],
        },
      },
    },
    async run(args, ctx) {
      const prompt = String(args.prompt || "").trim();
      const refUrl = String(args.reference_image_url || "").trim();
      const size = String(args.size || "1024x768");
      if (!prompt || !refUrl) throw new Error("缺少参数");
      ctx.onInfo("基于参考图生成新图片...");
      const res = await client.generateImage({
        prompt,
        size,
        image: [refUrl],
        extra_body: { response_format: "url" },
      });
      const first = res.data?.[0];
      if (!first?.url) throw new Error("图片失败");
      ctx.onProgress(100, "completed");
      return JSON.stringify({
        success: true,
        image_url: first.url,
        reference_image_url: refUrl,
        prompt,
      });
    },
  };
}
