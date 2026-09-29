import { NextRequest, NextResponse } from 'next/server';
import { getSession, subscribeSSE } from '@/lib/court/session-manager';
import { SSEEvent } from '@/types/court';

interface CourtGlobal {
  __courtRecentEvents?: Map<string, SSEEvent[]>;
}

declare const global: CourtGlobal;

/** GET /api/sessions/[sessionId]/stream — SSE 消息流 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: '会话不存在' },
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 重发最近的事件
      const recentEvents = global.__courtRecentEvents?.get(sessionId);
      if (recentEvents) {
        for (const event of recentEvents) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {}
        }
      }

      // 发送初始连接确认
      const connectEvent: SSEEvent = {
        type: 'system',
        payload: { message: 'SSE连接已建立', sessionId },
        timestamp: Date.now(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`));

      // 发送当前状态
      const stateEvent: SSEEvent = {
        type: 'system',
        payload: session.getState(),
        timestamp: Date.now(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(stateEvent)}\n\n`));

      // 订阅后续事件
      const unsubscribe = subscribeSSE(sessionId, (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (err) {
          console.error('[SSE] 发送事件失败:', err);
          unsubscribe();
        }
      });

      // 心跳保活
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30000);

      // 客户端断开时清理
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
