// ============================================================
// 文件存储 — 本地文件系统实现（默认，无需任何云服务）
//
// 上传的文件写入 UPLOAD_DIR（默认 ./data/uploads），通过
// /api/files/<key> 对外提供访问；需要接入远端大模型识图时，
// 会转换成 base64 data URL 直接内联到请求中。
//
// 如需接入 S3 / OSS 等对象存储，可在此模块中新增实现并导出同签名函数。
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'data', 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain; charset=utf-8',
};

export interface SavedFile {
  /** 存储键（相对 UPLOAD_DIR 的路径，统一使用 / 分隔） */
  key: string;
  /** 可直接用于 <img src> 的访问地址 */
  url: string;
}

/** 归一化并校验存储键，阻止路径穿越 */
function resolveKeyPath(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  const root = path.resolve(UPLOAD_DIR);
  const target = path.resolve(root, normalized);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`非法的存储路径: ${key}`);
  }
  return target;
}

/** 根据扩展名推断 MIME 类型 */
export function guessContentType(key: string): string {
  const ext = key.toLowerCase().split('.').pop() || '';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

/** 生成对外访问地址 */
export function getPublicUrl(key: string): string {
  const encoded = key
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `/api/files/${encoded}`;
}

/** 保存文件到本地磁盘，返回存储键与访问地址 */
export async function saveFile(buffer: Buffer, key: string): Promise<SavedFile> {
  const target = resolveKeyPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return { key: key.replace(/\\/g, '/').replace(/^\/+/, ''), url: getPublicUrl(key) };
}

/** 读取文件内容 */
export async function readFile(key: string): Promise<{ data: Buffer; contentType: string }> {
  const target = resolveKeyPath(key);
  const data = await fs.readFile(target);
  return { data, contentType: guessContentType(key) };
}

/**
 * 转换为 base64 data URL。
 * 远端大模型无法访问本机 localhost 地址，因此识图场景必须内联图片内容。
 */
export async function getFileAsDataUrl(key: string): Promise<string> {
  const { data, contentType } = await readFile(key);
  return `data:${contentType};base64,${data.toString('base64')}`;
}
