// ============================================================
// 本地文件访问 API — GET /api/files/<key>
// 用于展示上传的图片证据、案件文档等本地存储文件。
// ============================================================

import { NextResponse } from 'next/server';
import { readFile } from '@/lib/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const storageKey = (key || []).map(decodeURIComponent).join('/');

  if (!storageKey) {
    return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
  }

  try {
    const { data, contentType } = await readFile(storageKey);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}
