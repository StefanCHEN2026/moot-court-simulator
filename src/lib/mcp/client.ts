// ============================================================
// 极简 MCP 客户端 — Streamable HTTP (JSON-RPC 2.0)
//
// 只实现本项目需要的三个方法：initialize / tools/list / tools/call。
// 请求参数一律以结构化对象传递，客户端不做任何查询文本拼装。
//
// 协议参考：Model Context Protocol 2024-11-05
// ============================================================

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: JsonRpcError;
}

const PROTOCOL_VERSION = '2024-11-05';
const CLIENT_INFO = { name: 'moot-court-simulator', version: '0.1.0' };

/** 从响应体解析 JSON-RPC 结果，兼容普通 JSON 与 SSE 两种返回 */
function parseRpcResponse(raw: string, contentType: string): JsonRpcResponse | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (contentType.includes('text/event-stream') || trimmed.startsWith('event:') || trimmed.startsWith('data:')) {
    const payloads: string[] = [];
    for (const line of trimmed.split('\n')) {
      const value = line.startsWith('data:') ? line.slice(5).trim() : '';
      if (value) payloads.push(value);
    }
    // 取最后一个能解析出 result/error 的载荷
    for (let i = payloads.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(payloads[i]) as JsonRpcResponse;
        if (parsed.result !== undefined || parsed.error !== undefined) return parsed;
      } catch {
        // 忽略无法解析的载荷
      }
    }
    return null;
  }

  try {
    return JSON.parse(trimmed) as JsonRpcResponse;
  } catch {
    return null;
  }
}

export class McpHttpClient {
  private sessionId: string | null = null;
  private nextId = 1;

  constructor(
    private readonly endpoint: string,
    private readonly extraHeaders: Record<string, string> = {},
    private readonly timeoutMs: number = 20_000
  ) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...this.extraHeaders,
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    return headers;
  }

  private async rpc(
    method: string,
    params: Record<string, unknown> | undefined,
    expectResult: boolean
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const id = this.nextId++;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        signal: controller.signal,
      });

      const sessionId = response.headers.get('mcp-session-id');
      if (sessionId) this.sessionId = sessionId;

      const text = await response.text().catch(() => '');

      if (!response.ok) {
        console.error('[MCP] 请求返回非 2xx:', response.status, text.slice(0, 300));
        throw new Error(`MCP 请求失败（HTTP ${response.status}）`);
      }

      // 通知类请求（如 notifications/initialized）通常无响应体
      if (!expectResult && !text.trim()) return undefined;

      const parsed = parseRpcResponse(text, response.headers.get('content-type') || '');
      if (!parsed) {
        if (!expectResult) return undefined;
        throw new Error('MCP 返回内容无法解析');
      }
      if (parsed.error) {
        throw new Error(`MCP 错误（${parsed.error.code}）：${parsed.error.message}`);
      }
      return parsed.result;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MCP 请求超时（${this.timeoutMs}ms）`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 建立会话 */
  async initialize(): Promise<void> {
    await this.rpc(
      'initialize',
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: CLIENT_INFO,
      },
      true
    );
    // 按协议补发 initialized 通知；服务端可能返回 202 无正文
    await this.rpc('notifications/initialized', undefined, false);
  }

  /** 列出可用工具 */
  async listTools(): Promise<McpTool[]> {
    const result = (await this.rpc('tools/list', {}, true)) as { tools?: McpTool[] } | undefined;
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  /** 调用工具，把返回内容拼成纯文本 */
  async callTool(name: string, params: Record<string, unknown>): Promise<string> {
    const result = await this.rpc('tools/call', { name, arguments: params }, true);
    return stringifyToolResult(result);
  }
}

/** 把 tools/call 的返回结果转成文本 */
function stringifyToolResult(result: unknown): string {
  if (result == null) return '（工具无返回内容）';

  if (typeof result === 'string') return result;

  const content = (result as { content?: unknown }).content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (typeof item === 'string') {
        parts.push(item);
        continue;
      }
      const block = item as { type?: string; text?: string; resource?: { text?: string } };
      if (typeof block.text === 'string') parts.push(block.text);
      else if (typeof block.resource?.text === 'string') parts.push(block.resource.text);
      else if (block.type) parts.push(`[${block.type}]`);
    }
    if (parts.length) return parts.join('\n');
  }

  try {
    return JSON.stringify(result);
  } catch {
    return '（工具返回内容无法序列化）';
  }
}
