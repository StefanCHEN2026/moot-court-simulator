// ============================================================
// 开发用 Mock 大模型服务（OpenAI 兼容）
//
// 无需真实 API Key 即可运行完整庭审流程，用于本地调试与回归验证。
//
//   node scripts/dev/mock-llm.mjs              # 默认监听 3200
//   PORT=3300 node scripts/dev/mock-llm.mjs
//
// 然后在另一个终端把应用指向它：
//   LLM_BASE_URL=http://localhost:3200/v1 LLM_API_KEY=test LLM_MODEL=mock pnpm dev
//
// 若同时设置了 MOCK_TOOL_CALL=1，则收到带 tools 的请求时会先发起一次
// 工具调用（用于验证 legal_search → MCP 的完整链路，配合 mock-mcp.mjs）。
// ============================================================

import { createServer } from 'http';

const PORT = Number(process.env.PORT || 3200);
const ENABLE_TOOL_CALL = process.env.MOCK_TOOL_CALL === '1';

const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.method !== 'POST' || !req.url.includes('/chat/completions')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'not found' } }));
      return;
    }

    let parsed = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      /* 忽略解析失败 */
    }

    const messages = parsed.messages || [];
    const tools = parsed.tools || [];
    const last = messages.length ? String(messages[messages.length - 1].content || '') : '';
    const toolMessages = messages.filter((m) => m.role === 'tool');

    // 1) 已开启工具调用、本次提供了工具、且尚未调用过 → 发起一次工具调用
    if (ENABLE_TOOL_CALL && tools.length > 0 && toolMessages.length === 0) {
      const tool = tools[0];
      const paramName = Object.keys(tool.function?.parameters?.properties || {})[0] || 'query';
      const args = { [paramName]: '民间借贷 逾期利息' };
      console.log(`[mock-llm] -> tool_call ${tool.function?.name}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 'mock-tool',
          object: 'chat.completion',
          model: parsed.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: { name: tool.function?.name, arguments: JSON.stringify(args) },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        })
      );
      return;
    }

    // 2) 普通回答；若刚收到工具结果，则把它带进回答里便于验证链路
    const isAward = last.includes('判决书') || last.includes('ARBITRAL AWARD');
    let content = isAward
      ? '判决书：本院认定原告主张成立，判令被告于本判决生效之日起十日内履行义务。如不服本判决，可在判决书送达之日起十五日内提起上诉。'
      : '本院已听取双方意见，现在继续审理。';

    if (toolMessages.length > 0) {
      const got = String(toolMessages[toolMessages.length - 1].content || '');
      console.log(`[mock-llm] <- tool result (${got.length} chars)`);
      content = `【已检索法条】${got.slice(0, 40)}……${content}`;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'mock',
        object: 'chat.completion',
        model: parsed.model,
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      })
    );
  });
});

server.listen(PORT, () => console.log(`[mock-llm] listening on http://localhost:${PORT}/v1`));
