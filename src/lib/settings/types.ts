// ============================================================
// 应用设置 — 类型定义
//
// 设置保存在本地 JSON 文件（默认 data/settings.json），优先级高于
// 环境变量：settings 文件 > 环境变量 > 内置默认值。
// 密钥类字段只写不读，接口返回时一律掩码。
// ============================================================

/** 大模型接入配置 */
export interface LLMSettings {
  /** OpenAI 兼容服务地址，如 https://api.deepseek.com/v1 */
  baseUrl?: string;
  /** 服务商密钥 */
  apiKey?: string;
  /** 文本模型 */
  model?: string;
  /** 多模态模型（用于图片证据识图），留空则关闭识图 */
  visionModel?: string;
  /** 单次请求超时（毫秒） */
  timeoutMs?: number;
}

/** 法律数据库 MCP 配置 */
export interface LegalMcpSettings {
  /** 是否启用法律检索能力 */
  enabled: boolean;
  /** MCP 服务地址（Streamable HTTP / JSON-RPC） */
  endpoint?: string;
  /** 自定义请求头，如 { "Authorization": "Bearer xxx" } */
  headers?: Record<string, string>;
  /** 要调用的工具名；留空则自动使用 tools/list 返回的第一个工具 */
  toolName?: string;
  /** 查询参数名，默认 query */
  queryParam?: string;
  /** 单次检索超时（毫秒） */
  timeoutMs?: number;
  /** 单次庭审中最多检索次数 */
  maxCallsPerTurn?: number;
}

export interface AppSettings {
  llm: LLMSettings;
  legalMcp: LegalMcpSettings;
}

/** 对外返回的设置（密钥只返回「是否已配置」与掩码提示） */
export interface PublicLLMSettings {
  baseUrl: string;
  model: string;
  visionModel: string;
  timeoutMs: number;
  apiKeySet: boolean;
  apiKeyHint: string;
}

export interface PublicLegalMcpSettings {
  enabled: boolean;
  endpoint: string;
  toolName: string;
  queryParam: string;
  timeoutMs: number;
  maxCallsPerTurn: number;
  /** 已配置的请求头名称（值不返回） */
  headerNames: string[];
}

export interface PublicSettings {
  llm: PublicLLMSettings;
  legalMcp: PublicLegalMcpSettings;
}

/** PUT /api/settings 的入参：字段省略表示保持原值 */
export interface SettingsPatch {
  llm?: Partial<LLMSettings>;
  legalMcp?: Partial<Omit<LegalMcpSettings, 'headers'>> & {
    headers?: Record<string, string> | null;
  };
}
