import { NextRequest, NextResponse } from 'next/server';
import { loadLaws } from '@/lib/data/laws';

/**
 * GET /api/laws — 返回法规条文
 * ?type=arbitration 返回国际仲裁规则，否则返回国内法律法规。
 * 数据来自本地 JSON（见 data/laws/README.md），未配置时返回空数组。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'domestic';

    const laws = await loadLaws(type === 'arbitration' ? 'arbitration' : 'domestic');
    return NextResponse.json(laws);
  } catch (err) {
    console.error('[API] 读取法规数据失败:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '读取法规数据失败' },
      { status: 500 }
    );
  }
}
