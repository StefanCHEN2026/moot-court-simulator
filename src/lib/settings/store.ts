// ============================================================
// 应用设置 — 读写与配置解析
//
// 文件位置：SETTINGS_FILE 或 ./data/settings.json
// 解析优先级：settings 文件 > 环境变量 > 内置默认值
//
// 安全：密钥（LLM apiKey、MCP headers 值）只写不读——
// 对外接口只返回「是否已配置」和掩码提示，绝不回传明文。
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';
import {
  AppSettings,
  LegalMcpSettings,
  LLMSettings,
  PublicSettings,
  SettingsPatch,
} from './types';

const SETTINGS_FILE = process.env.SETTINGS_FILE
  ? path.resolve(process.env.SETTINGS_FILE)
  : path.join(process.cwd(), 'data', 'settings.json');

/** LLM 内置默认值 */
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 60_000;

const DEFAULT_LEGAL_MCP: LegalMcpSettings = {
  enabled: false,
  queryParam: 'query',
  timeoutMs: 20_000,
  maxCallsPerTurn: 2,
};

export interface ResolvedLLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  timeoutMs: number;
}

let cache: AppSettings | null = null;

function emptySettings(): AppSettings {
  return { llm: {}, legalMcp: { ...DEFAULT_LEGAL_MCP } };
}

/** 归一化，保证 legalMcp 各字段有默认值 */
function normalize(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const legalMcp = { ...DEFAULT_LEGAL_MCP, ...(raw?.legalMcp || {}) };
  return { llm: { ...(raw?.llm || {}) }, legalMcp };
}

export function invalidateSettingsCache(): void {
  cache = null;
}

/** 读取设置（进程内缓存） */
export async function readSettings(): Promise<AppSettings> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    cache = normalize(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    cache = emptySettings();
  }
  return cache;
}

/**
 * 更新设置。省略的字段保持原值；
 * legalMcp.headers 传 null 表示清空，省略表示保持不变。
 */
export async function saveSettings(patch: SettingsPatch): Promise<AppSettings> {
  const current = await readSettings();

  // headers 单独处理：省略 = 保持不变，null = 清空，对象 = 整体覆盖
  const { headers: headersPatch, ...mcpRest } = patch.legalMcp ?? {};

  const next: AppSettings = {
    llm: { ...current.llm, ...(patch.llm || {}) },
    legalMcp: { ...current.legalMcp, ...mcpRest },
  };

  if (headersPatch === null) delete next.legalMcp.headers;
  else if (headersPatch !== undefined) next.legalMcp.headers = headersPatch;

  // 空字符串视为「清除该字段」，避免写入空值覆盖环境变量
  for (const key of Object.keys(next.llm) as (keyof LLMSettings)[]) {
    if (next.llm[key] === '') delete next.llm[key];
  }
  next.legalMcp = normalize({ legalMcp: next.legalMcp }).legalMcp;
  if (next.legalMcp.endpoint === '') delete next.legalMcp.endpoint;
  if (next.legalMcp.toolName === '') delete next.legalMcp.toolName;

  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf-8');
  cache = next;
  return next;
}

/** 解析出实际生效的 LLM 配置：settings > env > 默认 */
export async function resolveLLMConfig(): Promise<ResolvedLLMConfig> {
  const { llm } = await readSettings();
  const timeout = llm.timeoutMs ?? Number(process.env.LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  return {
    baseUrl: (llm.baseUrl || process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    apiKey: llm.apiKey || process.env.LLM_API_KEY || '',
    model: llm.model || process.env.LLM_MODEL || DEFAULT_MODEL,
    visionModel: llm.visionModel || process.env.LLM_VISION_MODEL || undefined,
    timeoutMs: Number(timeout) || DEFAULT_TIMEOUT_MS,
  };
}

/** 是否已配置 LLM 密钥 */
export async function isLLMConfigured(): Promise<boolean> {
  return Boolean((await resolveLLMConfig()).apiKey);
}

/** 掩码：只暴露后 4 位 */
function maskSecret(value: string | undefined): { set: boolean; hint: string } {
  if (!value) return { set: false, hint: '' };
  const tail = value.length > 4 ? value.slice(-4) : '';
  return { set: true, hint: tail ? `••••${tail}` : '••••' };
}

/** 对外设置视图（不含任何密钥明文） */
export async function getPublicSettings(): Promise<PublicSettings> {
  const settings = await readSettings();
  const resolved = await resolveLLMConfig();
  const key = maskSecret(resolved.apiKey);

  return {
    llm: {
      baseUrl: resolved.baseUrl,
      model: resolved.model,
      visionModel: resolved.visionModel || '',
      timeoutMs: resolved.timeoutMs,
      apiKeySet: key.set,
      apiKeyHint: key.hint,
    },
    legalMcp: {
      enabled: settings.legalMcp.enabled,
      endpoint: settings.legalMcp.endpoint || '',
      toolName: settings.legalMcp.toolName || '',
      queryParam: settings.legalMcp.queryParam || 'query',
      timeoutMs: settings.legalMcp.timeoutMs ?? DEFAULT_LEGAL_MCP.timeoutMs!,
      maxCallsPerTurn: settings.legalMcp.maxCallsPerTurn ?? DEFAULT_LEGAL_MCP.maxCallsPerTurn!,
      headerNames: Object.keys(settings.legalMcp.headers || {}),
    },
  };
}
