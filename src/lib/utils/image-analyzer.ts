// ============================================================
// 图片证据分析 — 调用多模态模型
//
// 需要在「设置」页面或环境变量中配置识图模型（LLM_VISION_MODEL）。
// imageUrl 可以是公网可访问的 URL，或 base64 data URL——本地存储的
// 图片必须使用 data URL，因为远端模型无法访问本机地址。
// ============================================================

import { chatCompletion } from '@/lib/llm/client';
import { resolveLLMConfig } from '@/lib/settings/store';

const ANALYSIS_PROMPT = `你是一位专业的法律证据分析专家。请仔细分析这张图片证据，并提供以下格式的分析结果：

1. **图片内容概述**：简要描述图片中展示的内容
2. **证据关键信息**：提取图片中与案件相关的关键文字、数据、人物、物品等信息
3. **证明目的分析**：分析该证据可能支持或反驳的案件事实
4. **证据可信度评估**：评估该图片作为证据的可信度和证明力

请用专业、客观的法律语言描述，不需要添加任何推理过程或思考说明，直接输出分析结论。`;

/**
 * 使用多模态大模型分析图片证据
 * @param imageUrl 图片地址或 base64 data URL
 */
export async function analyzeImage(imageUrl: string): Promise<string> {
  const { visionModel } = await resolveLLMConfig();
  if (!visionModel) {
    throw new Error('未配置识图模型（LLM_VISION_MODEL），无法进行图片识别');
  }

  return chatCompletion(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    { model: visionModel, temperature: 0.3 }
  );
}
