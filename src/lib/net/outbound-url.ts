// ============================================================
// 出站请求地址校验（SSRF 防护）
//
// 本应用的模型接口地址与 MCP 地址都由使用者配置，而接口默认无鉴权，
// 因此必须在发起请求前校验目标地址，避免被用作访问内网/本机的跳板。
//
// 规则：
//   1. 只允许 http / https；
//   2. 拒绝 localhost、环回、私有、链路本地、CGNAT、组播与保留地址；
//   3. 域名会先解析，若解析结果落在上述范围同样拒绝（防止域名指向内网）；
//   4. 本地模型服务（如 Ollama）需显式设置 ALLOW_PRIVATE_ENDPOINTS=true 放行。
//
// 仅服务端使用。
// ============================================================

import { promises as dns } from 'dns';
import net from 'net';

/** 显式放行本机/内网地址（供本地模型服务使用），默认关闭 */
function privateEndpointsAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_ENDPOINTS === 'true';
}

/** IPv4 是否属于环回/私有/链路本地/保留网段 */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // 无法识别的一律拒绝
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 环回
  if (a === 169 && b === 254) return true; // 链路本地（含云元数据 169.254.169.254）
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 等保留段
  if (a === 198 && (b === 18 || b === 19)) return true; // 基准测试段
  if (a >= 224) return true; // 组播与保留
  return false;
}

/** IPv6 是否属于环回/链路本地/ULA/组播，或内嵌了被拒的 IPv4 */
function isBlockedIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('fe80')) return true; // 链路本地
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // 唯一本地地址
  if (v.startsWith('ff')) return true; // 组播
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  return false;
}

function isBlockedAddress(address: string): boolean {
  const kind = net.isIP(address);
  if (kind === 4) return isBlockedIPv4(address);
  if (kind === 6) return isBlockedIPv6(address);
  return true;
}

/** 明显指向本机的特殊主机名 */
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === 'metadata.google.internal') return true;
  return false;
}

const LOOPBACK_HINT = '本地模型服务请设置 ALLOW_PRIVATE_ENDPOINTS=true';

// 域名解析结果缓存，避免每次调用都查询 DNS
const dnsCache = new Map<string, { expiresAt: number; addresses: string[] }>();
const DNS_CACHE_MS = 60_000;

async function resolveHost(hostname: string): Promise<string[]> {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;

  const records = await dns.lookup(hostname, { all: true });
  const addresses = records.map((r) => r.address);
  dnsCache.set(hostname, { expiresAt: Date.now() + DNS_CACHE_MS, addresses });
  return addresses;
}

/**
 * 校验出站地址，通过则返回解析后的 URL，否则抛出可展示的错误。
 * 调用方应在每次发出请求前调用本函数。
 */
export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('接口地址不是合法的 URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('接口地址仅支持 http / https');
  }

  const hostname = url.hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (!hostname) {
    throw new Error('接口地址缺少主机名');
  }

  if (privateEndpointsAllowed()) return url;

  if (isBlockedHostname(hostname)) {
    throw new Error(`不允许访问本机地址（${hostname}）；${LOOPBACK_HINT}`);
  }

  // 字面量 IP：直接判定
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new Error(`不允许访问内网/保留地址（${hostname}）；${LOOPBACK_HINT}`);
    }
    return url;
  }

  // 域名：解析后逐个判定，防止域名指向内网
  let addresses: string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new Error(`无法解析接口地址的主机名：${hostname}`);
  }
  if (addresses.length === 0) {
    throw new Error(`无法解析接口地址的主机名：${hostname}`);
  }
  for (const address of addresses) {
    if (isBlockedAddress(address)) {
      throw new Error(`接口地址 ${hostname} 解析到内网/保留地址（${address}），已拒绝`);
    }
  }

  return url;
}
