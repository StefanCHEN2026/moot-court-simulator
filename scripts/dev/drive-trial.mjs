// ============================================================
// 庭审流程回归脚本：自动扮演用户把一场庭审理到宣判
//
// 配合 scripts/dev/mock-llm.mjs 使用，无需真实 API Key 即可验证
// 「流程能否走完、是否产出判决、接口是否报错」。
//
// 用法（先启动 mock-llm 与应用的 dev 服务）：
//   node scripts/dev/drive-trial.mjs
//   CASE_TYPE=criminal ROLE=defendant node scripts/dev/drive-trial.mjs
//   CASE_TYPE=arbitration ROLE=claimant BASE=http://localhost:5000 node scripts/dev/drive-trial.mjs
// ============================================================

const BASE = process.env.BASE || 'http://localhost:5000';
const ROLE = process.env.ROLE || 'plaintiff';
const CASE_TYPE = process.env.CASE_TYPE || 'civil';
const MAX_TURNS = Number(process.env.MAX_TURNS || 60);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : {} };
  } catch (e) {
    return { status: -1, json: {}, error: e.message };
  }
}

async function getState(sessionId) {
  try {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}`);
    const text = await res.text();
    if (!res.ok || !text) return { broken: true, httpStatus: res.status, raw: text };
    return { httpStatus: res.status, ...JSON.parse(text) };
  } catch (e) {
    return { broken: true, raw: e.message };
  }
}

async function main() {
  const created = await post('/api/sessions', {
    caseType: CASE_TYPE,
    caseName: CASE_TYPE === 'arbitration' ? 'Award Smoke Test' : '流程回归测试',
    caseDescription:
      CASE_TYPE === 'arbitration'
        ? 'Smoke test: claimant seeks payment under a sale contract.'
        : '回归测试用案件，原告主张被告违约。',
    userRole: ROLE,
  });

  const sessionId = created.json.sessionId;
  if (!sessionId) {
    console.error('创建会话失败:', JSON.stringify(created));
    process.exit(1);
  }
  console.log(`sessionId=${sessionId} caseType=${CASE_TYPE} userRole=${ROLE}`);

  const errors = [];
  let userTurns = 0;
  let lastKey = '';

  for (let i = 0; i < MAX_TURNS; i++) {
    await sleep(1200);
    const s = await getState(sessionId);

    if (s.broken) {
      errors.push(`会话状态不可读（HTTP ${s.httpStatus}）`);
      console.log(`  !! 会话状态不可读 —— 会话已损坏`);
      break;
    }

    const key = `${s.status}|${s.currentPhase}|${s.currentSubPhase}|${s.currentSpeaker}|${s.messages.length}`;
    if (key !== lastKey) {
      console.log(
        `  status=${s.status} phase=${s.currentPhase}/${s.currentSubPhase} speaker=${s.currentSpeaker} msgs=${s.messages.length}`
      );
      lastKey = key;
    }

    if (s.status === 'completed') break;

    if (s.currentSpeaker === ROLE) {
      userTurns++;
      const r = await post('/api/messages', {
        sessionId,
        action: { type: 'speak', content: `（${ROLE}发言第${userTurns}次）我方坚持诉请。` },
      });
      if (!r.json.success) {
        errors.push(`第 ${userTurns} 次发言失败: HTTP ${r.status} ${JSON.stringify(r.json)}`);
        console.log(`  !! 发言失败: ${JSON.stringify(r.json)}`);
      }
      await sleep(1500);
    }
  }

  const final = await getState(sessionId);
  console.log('\n=== 结果 ===');
  if (final.broken) {
    console.log('status: 会话不可读（getState 抛异常）');
  } else {
    const types = {};
    for (const m of final.messages) types[m.type] = (types[m.type] || 0) + 1;
    const verdicts = final.messages.filter((m) => m.type === 'verdict');
    console.log('status      :', final.status);
    console.log('phase       :', `${final.currentPhase}/${final.currentSubPhase}`);
    console.log('用户发言次数:', userTurns);
    console.log('消息类型    :', JSON.stringify(types));
    console.log('判决条数    :', verdicts.length);
    if (verdicts.length) {
      console.log('判决内容    :', String(verdicts[0].content).slice(0, 80));
    }
    if (final.status !== 'completed') errors.push(`流程未走完，停在 ${final.currentPhase}`);
    if (verdicts.length !== 1) errors.push(`判决条数异常：${verdicts.length}（期望 1）`);
  }

  if (errors.length) {
    console.log('\n=== 失败项 ===');
    errors.forEach((e) => console.log(' -', e));
    process.exit(1);
  }
  console.log('\n✅ 流程正常：已走完并产出判决');
  process.exit(0);
}

main().catch((e) => {
  console.error('脚本异常:', e);
  process.exit(1);
});
