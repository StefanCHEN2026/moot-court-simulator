// ============================================================
// 开庭次数统计 — 本地 JSON 持久化（替代原数据库实现）
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';

const STATS_FILE = process.env.STATS_FILE
  ? path.resolve(process.env.STATS_FILE)
  : path.join(process.cwd(), 'data', 'stats.json');

// 串行化读改写，避免并发递增相互覆盖
let writeChain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  return run;
}

async function read(): Promise<{ totalTrials: number }> {
  try {
    const raw = await fs.readFile(STATS_FILE, 'utf-8');
    const data = JSON.parse(raw) as { totalTrials?: number };
    return { totalTrials: Number(data.totalTrials) || 0 };
  } catch {
    return { totalTrials: 0 };
  }
}

/** 读取累计开庭次数 */
export async function getTrialCount(): Promise<number> {
  return (await read()).totalTrials;
}

/** 开庭次数 +1，返回更新后的值 */
export async function incrementTrialCount(): Promise<number> {
  return serialize(async () => {
    const current = await read();
    const next = current.totalTrials + 1;
    await fs.mkdir(path.dirname(STATS_FILE), { recursive: true });
    await fs.writeFile(STATS_FILE, JSON.stringify({ totalTrials: next }, null, 2), 'utf-8');
    return next;
  });
}
