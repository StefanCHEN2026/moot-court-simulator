'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicSettings } from '@/lib/settings/types';

type TestState = { state: 'idle' | 'loading' | 'ok' | 'fail'; message?: string };

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg bg-muted border border-border text-foreground ' +
  'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TestResult({ result }: { result: TestState }) {
  if (result.state === 'idle') return null;
  const tone =
    result.state === 'ok'
      ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
      : result.state === 'fail'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';
  return (
    <p className={`mt-2 text-xs px-2.5 py-1.5 rounded ${tone}`}>
      {result.state === 'loading' ? '测试中…' : result.message}
    </p>
  );
}

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // LLM
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [apiKeyHint, setApiKeyHint] = useState('');
  const [model, setModel] = useState('');
  const [visionModel, setVisionModel] = useState('');
  const [llmTimeout, setLlmTimeout] = useState('');
  const [llmTest, setLlmTest] = useState<TestState>({ state: 'idle' });

  // Legal MCP
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [mcpToolName, setMcpToolName] = useState('');
  const [mcpQueryParam, setMcpQueryParam] = useState('');
  const [mcpTimeout, setMcpTimeout] = useState('');
  const [mcpMaxCalls, setMcpMaxCalls] = useState('');
  const [headerNames, setHeaderNames] = useState<string[]>([]);
  const [headersJson, setHeadersJson] = useState('');
  const [headersDirty, setHeadersDirty] = useState(false);
  const [mcpTest, setMcpTest] = useState<TestState>({ state: 'idle' });

  const applySettings = useCallback((s: PublicSettings) => {
    setBaseUrl(s.llm.baseUrl);
    setApiKeySet(s.llm.apiKeySet);
    setApiKeyHint(s.llm.apiKeyHint);
    setModel(s.llm.model);
    setVisionModel(s.llm.visionModel);
    setLlmTimeout(String(s.llm.timeoutMs));

    setMcpEnabled(s.legalMcp.enabled);
    setMcpEndpoint(s.legalMcp.endpoint);
    setMcpToolName(s.legalMcp.toolName);
    setMcpQueryParam(s.legalMcp.queryParam);
    setMcpTimeout(String(s.legalMcp.timeoutMs));
    setMcpMaxCalls(String(s.legalMcp.maxCallsPerTurn));
    setHeaderNames(s.legalMcp.headerNames);
    // 值不回传，用户不修改就不提交
    setHeadersJson(s.legalMcp.headerNames.length ? '{\n  \n}' : '');
    setHeadersDirty(false);
    setApiKey('');
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then(async (res) => {
        if (!res.ok) throw new Error(`读取失败（HTTP ${res.status}）`);
        return (await res.json()) as PublicSettings;
      })
      .then((s) => {
        applySettings(s);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : '读取设置失败');
        setLoaded(true);
      });
  }, [applySettings]);

  const save = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const patch: Record<string, unknown> = {
        llm: {
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          visionModel: visionModel.trim(),
          timeoutMs: Number(llmTimeout) || undefined,
        },
        legalMcp: {
          enabled: mcpEnabled,
          endpoint: mcpEndpoint.trim(),
          toolName: mcpToolName.trim(),
          queryParam: mcpQueryParam.trim(),
          timeoutMs: Number(mcpTimeout) || undefined,
          maxCallsPerTurn: mcpMaxCalls === '' ? undefined : Number(mcpMaxCalls),
        },
      };

      // 密钥留空表示不修改
      if (apiKey.trim()) (patch.llm as Record<string, unknown>).apiKey = apiKey.trim();

      if (headersDirty) {
        const raw = headersJson.trim();
        if (!raw) {
          (patch.legalMcp as Record<string, unknown>).headers = null;
        } else {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            setSaveMessage('请求头不是合法 JSON，请检查格式');
            setSaving(false);
            return;
          }
          (patch.legalMcp as Record<string, unknown>).headers = parsed;
        }
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as PublicSettings & { error?: string };
      if (!res.ok) throw new Error(data.error || `保存失败（HTTP ${res.status}）`);
      applySettings(data);
      setSaveMessage('已保存');
    } catch (e: unknown) {
      setSaveMessage(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (target: 'llm' | 'legalMcp') => {
    const setter = target === 'llm' ? setLlmTest : setMcpTest;
    setter({ state: 'loading' });
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = (await res.json()) as { ok: boolean; detail?: string; error?: string };
      setter(
        data.ok
          ? { state: 'ok', message: data.detail || '连接正常' }
          : { state: 'fail', message: data.error || '连接失败' }
      );
    } catch (e: unknown) {
      setter({ state: 'fail', message: e instanceof Error ? e.message : '连接失败' });
    }
  };

  if (!loaded) {
    return <main className="max-w-3xl mx-auto px-6 py-12 text-muted-foreground">加载中…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            配置大模型接入与可选的法律数据库检索能力
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-outline bg-card hover:bg-muted transition-colors text-sm"
        >
          返回首页
        </Link>
      </div>

      {loadError && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {loadError}
        </div>
      )}

      {/* ==================== 大模型 ==================== */}
      <section className="rounded-xl border border-border bg-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">大模型</h2>
        <p className="text-xs text-muted-foreground mb-5">
          任意兼容 OpenAI <code>/chat/completions</code> 协议的服务。留空的字段会回退到环境变量。
        </p>

        <div className="space-y-4">
          <Field label="接口地址" hint="例如 https://api.deepseek.com/v1">
            <input className={inputClass} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </Field>

          <Field
            label="API Key"
            hint={
              apiKeySet
                ? `已配置（${apiKeyHint}），留空则不修改`
                : '未配置。未填写时回退到环境变量 LLM_API_KEY'
            }
          >
            <input
              className={inputClass}
              type="password"
              autoComplete="off"
              placeholder={apiKeySet ? '留空则不修改' : '填写服务商密钥'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="文本模型" hint="用于法官/对手/判决">
              <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
            <Field label="识图模型" hint="选填；留空则关闭图片证据识别">
              <input
                className={inputClass}
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
              />
            </Field>
          </div>

          <Field label="请求超时（毫秒）">
            <input
              className={inputClass}
              type="number"
              value={llmTimeout}
              onChange={(e) => setLlmTimeout(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            data-testid="test-llm"
            onClick={() => runTest('llm')}
            disabled={llmTest.state === 'loading'}
            className="px-4 py-2 rounded-lg border border-outline bg-card hover:bg-muted transition-colors text-sm disabled:opacity-50"
          >
            测试连接
          </button>
          <span className="text-xs text-muted-foreground">测试会发送一次极短的请求</span>
        </div>
        <TestResult result={llmTest} />
      </section>

      {/* ==================== 法律数据库 MCP ==================== */}
      <section className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">法律数据库检索（MCP）</h2>
            <p className="text-xs text-muted-foreground">
              启用后，法官与对手 AI 可调用 legal_search 检索法条原文。需要服务端支持 MCP
              的 HTTP 传输（JSON-RPC）。
            </p>
          </div>
          <label className="flex items-center gap-2 shrink-0 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--primary)]"
              checked={mcpEnabled}
              onChange={(e) => setMcpEnabled(e.target.checked)}
            />
            <span className="text-sm text-foreground">启用</span>
          </label>
        </div>

        <div className={`mt-5 space-y-4 ${mcpEnabled ? '' : 'opacity-50'}`}>
          <Field label="MCP 服务地址" hint="例如 https://your-mcp-host/mcp">
            <input
              className={inputClass}
              value={mcpEndpoint}
              onChange={(e) => setMcpEndpoint(e.target.value)}
            />
          </Field>

          <Field
            label="请求头（JSON）"
            hint={
              headerNames.length
                ? `已配置：${headerNames.join(', ')}；重新填写会整体覆盖，清空则删除`
                : '选填，例如 {"Authorization": "Bearer xxx"}'
            }
          >
            <textarea
              className={`${inputClass} font-mono text-xs h-24 resize-y`}
              placeholder={headerNames.length ? '{ }' : '{\n  "Authorization": "Bearer ..."\n}'}
              value={headersJson}
              onChange={(e) => {
                setHeadersJson(e.target.value);
                setHeadersDirty(true);
              }}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="工具名" hint="留空则使用服务返回的第一个工具">
              <input
                className={inputClass}
                value={mcpToolName}
                onChange={(e) => setMcpToolName(e.target.value)}
              />
            </Field>
            <Field label="检索参数名" hint="默认 query，可留空自动推断">
              <input
                className={inputClass}
                value={mcpQueryParam}
                onChange={(e) => setMcpQueryParam(e.target.value)}
              />
            </Field>
            <Field label="请求超时（毫秒）">
              <input
                className={inputClass}
                type="number"
                value={mcpTimeout}
                onChange={(e) => setMcpTimeout(e.target.value)}
              />
            </Field>
            <Field label="每次发言最大检索次数" hint="控制时延与调用量">
              <input
                className={inputClass}
                type="number"
                value={mcpMaxCalls}
                onChange={(e) => setMcpMaxCalls(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            data-testid="test-mcp"
            onClick={() => runTest('legalMcp')}
            disabled={mcpTest.state === 'loading'}
            className="px-4 py-2 rounded-lg border border-outline bg-card hover:bg-muted transition-colors text-sm disabled:opacity-50"
          >
            测试连接
          </button>
          <span className="text-xs text-muted-foreground">测试会尝试列出可用工具</span>
        </div>
        <div data-testid="test-mcp-result">
          <TestResult result={mcpTest} />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存设置'}
        </button>
        {saveMessage && <span className="text-sm text-muted-foreground">{saveMessage}</span>}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        设置保存在服务端 data/settings.json（不会被提交到仓库），优先级高于环境变量。密钥不会回传浏览器。
      </p>
    </main>
  );
}
