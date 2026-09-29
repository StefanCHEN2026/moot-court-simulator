import { NextRequest, NextResponse } from 'next/server';
import { getPublicSettings, saveSettings } from '@/lib/settings/store';
import { SettingsPatch } from '@/lib/settings/types';

/** GET /api/settings — 读取设置（密钥只返回掩码提示） */
export async function GET() {
  try {
    return NextResponse.json(await getPublicSettings());
  } catch (error) {
    console.error('[API] 读取设置失败:', error);
    return NextResponse.json({ error: '读取设置失败' }, { status: 500 });
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** PUT /api/settings — 更新设置（省略的字段保持原值） */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as SettingsPatch;

    if (body.llm?.baseUrl && !isValidHttpUrl(body.llm.baseUrl)) {
      return NextResponse.json({ error: 'LLM_BASE_URL 必须是合法的 http(s) 地址' }, { status: 400 });
    }
    if (body.llm?.timeoutMs !== undefined && !(body.llm.timeoutMs > 0)) {
      return NextResponse.json({ error: 'LLM 超时必须是正数（毫秒）' }, { status: 400 });
    }

    const mcp = body.legalMcp;
    if (mcp?.endpoint && !isValidHttpUrl(mcp.endpoint)) {
      return NextResponse.json({ error: 'MCP 地址必须是合法的 http(s) 地址' }, { status: 400 });
    }
    if (mcp?.timeoutMs !== undefined && !(mcp.timeoutMs > 0)) {
      return NextResponse.json({ error: 'MCP 超时必须是正数（毫秒）' }, { status: 400 });
    }
    if (mcp?.maxCallsPerTurn !== undefined && !(mcp.maxCallsPerTurn >= 0)) {
      return NextResponse.json({ error: '每回合最大检索次数不能为负数' }, { status: 400 });
    }
    if (mcp?.headers != null) {
      if (typeof mcp.headers !== 'object' || Array.isArray(mcp.headers)) {
        return NextResponse.json({ error: '请求头必须是「名称: 值」的对象' }, { status: 400 });
      }
      for (const [name, value] of Object.entries(mcp.headers)) {
        if (typeof value !== 'string') {
          return NextResponse.json({ error: `请求头 ${name} 的值必须是字符串` }, { status: 400 });
        }
      }
    }

    await saveSettings(body);
    return NextResponse.json(await getPublicSettings());
  } catch (error) {
    console.error('[API] 保存设置失败:', error);
    return NextResponse.json({ error: '保存设置失败' }, { status: 500 });
  }
}
