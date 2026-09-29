// ============================================================
// LLM 客户端 — OpenAI 兼容接口（provider-agnostic）
//
// 配置来源与优先级：应用设置（/settings 页面写入 data/settings.json）
//                 > 环境变量 > 内置默认值。
// 详见 src/lib/settings/store.ts。
//
// 本模块仅通过 HTTP 调用大模型服务，不连接任何数据库、不构造 SQL。
//
// 兼容 OpenAI、DeepSeek、Moonshot、通义、豆包、Ollama、vLLM 等。
// ============================================================

import { MessageForLLM } from '@/types/court';
import { resolveLLMConfig, isLLMConfigured, type ResolvedLLMConfig } from '@/lib/settings/store';
import { assertSafeOutboundUrl } from '@/lib/net/outbound-url';

export { isLLMConfigured };
export type { ResolvedLLMConfig };

/** 多模态内容分片（OpenAI 格式） */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** 提供给模型的工具定义（OpenAI function calling 格式） */
export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** 模型返回的工具调用请求 */
export interface LLMToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** 工具执行器：入参为已解析的对象，返回给模型的文本结果 */
export type ToolExecutor = (toolName: string, toolParams: Record<string, unknown>) => Promise<string>;

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** 覆盖默认模型 */
  model?: string;
  /** 覆盖默认超时 */
  timeoutMs?: number;
  /** 可用工具；配合 toolRunner 使用 */
  tools?: LLMToolDefinition[];
  /** 工具执行器；提供后才会真正进入工具调用回环 */
  toolRunner?: ToolExecutor;
  /** 最多进行几轮工具调用，默认 2 */
  maxToolRounds?: number;
}

const DEFAULT_MAX_TOOL_ROUNDS = 2;

/**
 * 失败提示的前缀。Agent 的输出清洗逻辑会跳过以此开头的文本，
 * 否则提示信息中的括号、方括号等会被当作元文本删除。
 */
export const LLM_ERROR_PREFIX = 'AI 回复生成失败';

interface WireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[] | null;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
      tool_calls?: LLMToolCall[];
    };
    finish_reason?: string;
  }>;
  error?: { message?: string };
}

/** 由 baseUrl 得到 chat/completions 端点 */
function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL('chat/completions', base).toString();
}

async function postChatCompletion(
  wire: WireMessage[],
  config: ResolvedLLMConfig,
  model: string,
  options: ChatOptions
): Promise<ChatCompletionResponse> {
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload: Record<string, unknown> = {
      model,
      messages: wire,
      temperature: options.temperature ?? 0.7,
    };
    if (options.maxTokens) payload.max_tokens = options.maxTokens;
    if (options.tools?.length) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    const url = await assertSafeOutboundUrl(chatCompletionsUrl(config.baseUrl));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      // 上游响应体只写服务端日志，不回传给调用方，避免泄露上游细节
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      console.error('[LLM] 上游返回非 2xx:', response.status, detail);
      throw new Error(`LLM 请求失败（HTTP ${response.status}），详情见服务端日志`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    if (data.error?.message) {
      throw new Error(`LLM 返回错误：${data.error.message}`);
    }
    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`LLM 请求超时（${timeoutMs}ms）`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 解析模型给出的工具入参。
 * 结果作为对象交给执行器，由执行器决定如何安全地使用各字段，
 * 本客户端不对其做任何文本拼装。
 */
function parseToolParams(raw: string | undefined): Record<string, unknown> {
  const trimmed = raw?.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed) as Record<string, unknown>;
}

/**
 * 调用 LLM 并返回文本内容。失败时抛出异常。
 * 提供 tools + toolRunner 时会自动进行工具调用回环。
 * 面向庭审流程的调用请使用 {@link chat}。
 */
export async function chatCompletion(
  messages: LLMMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const config = await resolveLLMConfig();
  const model = options.model || config.model;

  if (!config.apiKey) {
    throw new Error('LLM_API_KEY 未配置，请在「设置」页面或环境变量中填写后重试');
  }

  const wire: WireMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const maxRounds = options.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  const toolRunner = options.toolRunner;
  const canUseTools = Boolean(options.tools?.length && toolRunner);

  for (let round = 0; ; round++) {
    const data = await postChatCompletion(wire, config, model, options);
    const message = data.choices?.[0]?.message;

    // 推理模型（如 DeepSeek R1）的思维链在 reasoning_content，正式输出在 content
    const content = typeof message?.content === 'string' ? message.content : '';
    const toolCalls = message?.tool_calls || [];

    if (!canUseTools || toolCalls.length === 0 || round >= maxRounds) {
      return content.trim() || '（模型未返回内容）';
    }

    // 回填 assistant 的 tool_calls，再逐个执行并追加 tool 结果
    wire.push({ role: 'assistant', content: content || null, tool_calls: toolCalls });
    for (const call of toolCalls) {
      let toolResult: string;
      try {
        const params = parseToolParams(call.function?.arguments);
        toolResult = await toolRunner!(call.function?.name, params);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error('[LLM] 工具调用失败:', call.function?.name, reason);
        toolResult = `工具执行失败：${reason}`;
      }
      wire.push({ role: 'tool', tool_call_id: call.id, content: toolResult });
    }
  }
}

/**
 * 面向庭审流程的便捷封装：出错时不抛出，而是返回一句可展示的提示文本，
 * 避免单次调用失败中断整场庭审。
 */
export async function chat(
  messages: MessageForLLM[],
  options: ChatOptions = {}
): Promise<string> {
  try {
    return await chatCompletion(messages as LLMMessage[], options);
  } catch (error: unknown) {
    console.error('[LLM] 调用失败:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return `${LLM_ERROR_PREFIX}：${errMsg}`;
  }
}
