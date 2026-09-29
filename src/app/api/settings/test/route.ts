import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/llm/client';
import { resolveLLMConfig } from '@/lib/settings/store';
import { testLegalMcp } from '@/lib/mcp/legal-research';

/**
 * POST /api/settings/test — 连通性测试
 * body: { target: 'llm' | 'legalMcp' }
 */
export async function POST(request: NextRequest) {
  let target = '';
  try {
    const body = (await request.json()) as { target?: string };
    target = body.target || '';
  } catch {
    return NextResponse.json({ ok: false, error: '请求体必须是 JSON' }, { status: 400 });
  }

  if (target === 'llm') {
    try {
      const config = await resolveLLMConfig();
      const reply = await chatCompletion([{ role: 'user', content: '回复"ok"两个字符即可。' }], {
        maxTokens: 16,
        temperature: 0,
        timeoutMs: Math.min(config.timeoutMs, 20_000),
      });
      return NextResponse.json({
        ok: true,
        detail: `模型 ${config.model} 连接正常`,
        sample: reply.slice(0, 80),
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (target === 'legalMcp') {
    const result = await testLegalMcp();
    return NextResponse.json({
      ok: result.ok,
      detail: result.ok ? `可用工具：${(result.tools || []).join(', ')}` : undefined,
      error: result.error,
    });
  }

  return NextResponse.json({ ok: false, error: 'target 必须为 llm 或 legalMcp' }, { status: 400 });
}
