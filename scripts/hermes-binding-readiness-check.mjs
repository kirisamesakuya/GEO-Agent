#!/usr/bin/env node
/**
 * Hermes 绑定就绪逻辑验收
 * 运行: node scripts/hermes-binding-readiness-check.mjs
 * 前提: GEO 服务已启动 (npm run dev)
 */
const GEO_BASE = process.env.GEO_HEALTH_URL?.replace(/\/api\/hermes\/health$/, '') ?? 'http://localhost:3000';

async function fetchJson(path, init) {
  const res = await fetch(`${GEO_BASE}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, body };
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`✓ ${label}${detail ? ` — ${detail}` : ''}`);
    return true;
  }
  console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
  return false;
}

async function main() {
  console.log('\n=== Hermes 绑定就绪检查 ===\n');

  let pass = 0;
  let fail = 0;

  const health = await fetchJson('/api/hermes/health');
  if (!health.ok) {
    console.log('○ GEO 未启动，跳过 health/onboarding 断言');
    console.log(`  ${health.status} ${health.body._raw ?? health.body.error ?? ''}\n`);
  } else {
    const h = health.body;
    const onboarding = await fetchJson('/api/hermes/onboarding-status');
    const o = onboarding.body;

    if (h.apiGatewayOk && !h.bound) {
      if (assert('apiGatewayOk 且无 device 时 hermesReady', o.hermesReady === true)) pass++;
      else fail++;
    } else if (!h.apiGatewayOk && !h.bound) {
      if (assert('无 8642 且无 device 时 hermesReady=false', o.hermesReady === false)) pass++;
      else fail++;
    } else {
      console.log(`○ 跳过 hermesReady 组合断言（apiGatewayOk=${h.apiGatewayOk}, bound=${h.bound}）`);
    }

    if (assert('health 含 connectionMode', typeof h.connectionMode === 'string', h.connectionMode)) pass++;
    else fail++;

    if (assert('onboarding 含 apiGatewayOk', typeof o.apiGatewayOk === 'boolean', String(o.apiGatewayOk))) pass++;
    else fail++;
  }

  const mockBind = await fetchJson('/api/hermes/bind-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceName: 'test' }),
  });
  if (assert('mock bind-confirm 已删除', mockBind.status === 404, `status=${mockBind.status}`)) pass++;
  else fail++;

  console.log('\n---');
  console.log(`通过: ${pass}，失败: ${fail}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
