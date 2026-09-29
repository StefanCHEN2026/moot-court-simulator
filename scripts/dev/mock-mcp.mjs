// ============================================================
// 开发用 Mock MCP 服务（Streamable HTTP / JSON-RPC 2.0）
//
// 模拟一个「法律数据库」MCP：提供 search_law 工具，返回示例法条。
// 用于在没有真实法律数据库时验证 MCP 接入与 legal_search 工具链路。
//
//   node scripts/dev/mock-mcp.mjs            # 默认 3300，端点为 /mcp
//   PORT=3400 node scripts/dev/mock-mcp.mjs
// ============================================================

import { createServer } from 'http';

const PORT = Number(process.env.PORT || 3300);

const ARTICLES = [
  {
    law: '中华人民共和国民法典',
    article: '第六百七十五条',
    text: '借款人应当按照约定的期限返还借款。对借款期限没有约定或者约定不明确，依据本法第五百一十条的规定仍不能确定的，借款人可以随时返还；贷款人可以催告借款人在合理期限内返还。',
  },
  {
    law: '中华人民共和国民法典',
    article: '第五百七十七条',
    text: '当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。',
  },
  {
    law: '中华人民共和国民事诉讼法',
    article: '第六十七条',
    text: '当事人对自己提出的主张，有责任提供证据。',
  },
];

const TOOLS = [
  {
    name: 'search_law',
    description: '检索法律法规条文原文',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '检索关键词，例如「民间借贷 逾期利息」' },
      },
      required: ['query'],
    },
  },
];

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
  });
}

const server = createServer(async (req, res) => {
  const body = await readBody(req);

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  let msg = {};
  try {
    msg = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid json' }));
    return;
  }

  const respond = (payload, headers = {}) => {
    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(payload === undefined ? '' : JSON.stringify(payload));
  };

  console.log(`[mock-mcp] ${msg.method}${msg.id === undefined ? ' (notification)' : ''}`);

  switch (msg.method) {
    case 'initialize':
      respond(
        {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'mock-legal-db', version: '0.1.0' },
          },
        },
        { 'Mcp-Session-Id': 'mock-session' }
      );
      return;

    case 'notifications/initialized':
      // 通知无返回值
      res.writeHead(202, { 'Mcp-Session-Id': 'mock-session' });
      res.end();
      return;

    case 'tools/list':
      respond({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } });
      return;

    case 'tools/call': {
      const query = msg.params?.arguments?.query ?? '';
      console.log(`[mock-mcp] tools/call search_law query=${JSON.stringify(query)}`);
      const text = ARTICLES.map((a) => `${a.law}${a.article}：${a.text}`).join('\n');
      respond({
        jsonrpc: '2.0',
        id: msg.id,
        result: { content: [{ type: 'text', text }] },
      });
      return;
    }

    default:
      respond({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `method not found: ${msg.method}` },
      });
  }
});

server.listen(PORT, () => console.log(`[mock-mcp] listening on http://localhost:${PORT}/mcp`));
