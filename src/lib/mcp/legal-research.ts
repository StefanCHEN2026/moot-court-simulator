// ============================================================
// 法律检索能力 — 把「法律数据库 MCP」包装成模型可调用的工具
//
// 关闭或未配置时不产生任何额外调用；配置后法官/对手 AI 可以调用
// legal_search 检索法条，检索结果由 MCP 服务返回并注入对话。
//
// 检索参数以对象形式传递，由 MCP 服务按其自身约定处理。
// ============================================================

import { McpHttpClient, McpTool } from './client';
import { readSettings } from '@/lib/settings/store';
import { LLMToolDefinition, ToolExecutor } from '@/lib/llm/client';

/** 暴露给模型的工具名（与后端 MCP 工具名解耦，保持提示词稳定） */
export const LEGAL_SEARCH_TOOL_NAME = 'legal_search';

export interface LegalResearchHandle {
  /** 提供给模型的工具定义 */
  tool: LLMToolDefinition;
  /** 工具执行器（含本次发言的调用次数上限） */
  run: ToolExecutor;
}

interface ResolvedMcp {
  client: McpHttpClient;
  endpoint: string;
  toolName: string;
  queryParam: string;
  maxCalls: number;
}

interface ToolCacheEntry {
  expiresAt: number;
  tool: McpTool | null;
}

// tools/list 结果缓存，避免每次发言都多一次往返
let toolsCache: ToolCacheEntry | null = null;
let toolsCacheKey = '';

/** 测试用：清空缓存 */
export function resetLegalResearchCache(): void {
  toolsCache = null;
  toolsCacheKey = '';
}

function inferQueryParam(tool: McpTool | null, configured?: string): string {
  if (configured) return configured;
  const schema = tool?.inputSchema;
  const required = schema?.required || [];
  for (const key of required) {
    if (schema?.properties?.[key]?.type === 'string') return key;
  }
  const props = schema?.properties || {};
  for (const [key, value] of Object.entries(props)) {
    if (value?.type === 'string') return key;
  }
  return 'query';
}

/** 读取配置；未启用或未填写地址时返回 null */
async function resolveMcp(): Promise<ResolvedMcp | null> {
  const { legalMcp } = await readSettings();
  if (!legalMcp.enabled || !legalMcp.endpoint) return null;

  const client = new McpHttpClient(
    legalMcp.endpoint,
    legalMcp.headers || {},
    legalMcp.timeoutMs ?? 20_000
  );
  return {
    client,
    endpoint: legalMcp.endpoint,
    toolName: legalMcp.toolName || '',
    queryParam: legalMcp.queryParam || '',
    maxCalls: legalMcp.maxCallsPerTurn ?? 2,
  };
}

/** 取得目标 MCP 工具（带 60 秒缓存） */
async function resolveTool(mcp: ResolvedMcp): Promise<McpTool | null> {
  const cacheKey = `${mcp.endpoint}|${mcp.toolName}`;
  if (toolsCache && toolsCacheKey === cacheKey && toolsCache.expiresAt > Date.now()) {
    return toolsCache.tool;
  }

  await mcp.client.initialize();
  const tools = await mcp.client.listTools();
  const chosen = mcp.toolName
    ? tools.find((t) => t.name === mcp.toolName) || null
    : tools[0] || null;

  toolsCache = { tool: chosen, expiresAt: Date.now() + 60_000 };
  toolsCacheKey = cacheKey;
  return chosen;
}

/**
 * 创建法律检索能力。未启用/未配置/连接失败时返回 null，
 * 调用方应退化为「不带工具」的普通对话。
 */
export async function createLegalResearch(): Promise<LegalResearchHandle | null> {
  const mcp = await resolveMcp();
  if (!mcp) return null;

  let tool: McpTool | null;
  try {
    tool = await resolveTool(mcp);
  } catch (error) {
    console.error('[LegalResearch] 连接 MCP 失败:', error);
    return null;
  }
  if (!tool) {
    console.error('[LegalResearch] MCP 未提供可用工具');
    return null;
  }

  const queryParam = inferQueryParam(tool, mcp.queryParam || undefined);
  const toolSchema: LLMToolDefinition = {
    type: 'function',
    function: {
      name: LEGAL_SEARCH_TOOL_NAME,
      description:
        '检索法律数据库，获取与问题相关的法律法规条文原文。' +
        '在需要引用具体法条、确认条文内容或条款序号时调用。' +
        `后端工具：${tool.name}${tool.description ? `（${tool.description}）` : ''}`,
      parameters: {
        type: 'object',
        properties: {
          [queryParam]: {
            type: 'string',
            description: '检索关键词或法律问题，例如「民间借贷 逾期利息」',
          },
        },
        required: [queryParam],
      },
    },
  };

  let used = 0;
  const run: ToolExecutor = async (toolName, params) => {
    if (toolName !== LEGAL_SEARCH_TOOL_NAME) {
      return `未知工具：${toolName}`;
    }
    if (used >= mcp.maxCalls) {
      return '本次发言的法律检索次数已用完，请基于已有信息作答。';
    }
    const query = params[queryParam];
    if (typeof query !== 'string' || !query.trim()) {
      return '检索失败：缺少检索关键词。';
    }
    used += 1;
    try {
      const text = await mcp.client.callTool(tool.name, { [queryParam]: query });
      return text.slice(0, 4000);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error('[LegalResearch] 检索失败:', reason);
      return `法律检索失败：${reason}`;
    }
  };

  return { tool: toolSchema, run };
}

/** 设置页「测试连接」：返回可用的工具名列表 */
export async function testLegalMcp(): Promise<{ ok: boolean; tools?: string[]; error?: string }> {
  const mcp = await resolveMcp();
  if (!mcp) {
    return { ok: false, error: '尚未启用或未填写 MCP 地址' };
  }
  try {
    resetLegalResearchCache();
    const tool = await resolveTool(mcp);
    if (!tool) return { ok: false, error: '连接成功，但服务未提供任何工具' };
    return { ok: true, tools: [tool.name] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
