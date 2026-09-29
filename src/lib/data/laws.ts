// ============================================================
// 法规数据加载 — 从本地 JSON 读取（替代原数据库实现）
//
// 数据目录：LAWS_DATA_DIR（默认 ./data/laws）
//   domestic.json     国内法律法规
//   arbitration.json  国际仲裁规则
// 详见 data/laws/README.md。
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';

export interface LawChapter {
  id: string;
  name: string;
  /** 条文列表，形如 ["第一条 为了……", "第二条 ……"] */
  articles: string[];
}

export interface LawEntry {
  id: string;
  name: string;
  chapters: LawChapter[];
}

export type LawKind = 'domestic' | 'arbitration';

const LAWS_DIR = process.env.LAWS_DATA_DIR
  ? path.resolve(process.env.LAWS_DATA_DIR)
  : path.join(process.cwd(), 'data', 'laws');

/**
 * 加载指定类别的法规数据。
 * 数据文件不存在时返回空数组（法规面板为空，不影响庭审主流程）。
 */
export async function loadLaws(kind: LawKind): Promise<LawEntry[]> {
  const file = path.join(LAWS_DIR, `${kind}.json`);
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf-8');
  } catch {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`法规数据格式错误：${file} 应为数组`);
  }
  return parsed as LawEntry[];
}
