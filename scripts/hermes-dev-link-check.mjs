#!/usr/bin/env node
/**
 * 开发机 Hermes ↔ GEO 链路验收（L1）
 * 运行: node scripts/hermes-dev-link-check.mjs
 * 前提: Hermes 客户端已开 + API_SERVER_ENABLED=true + Gateway 已重启；GEO 可选是否已启动
 */
const HERMES_STATUS = process.env.HERMES_DESKTOP_STATUS_URL ?? 'http://127.0.0.1:9120/api/status';
const HERMES_HEALTH = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const GEO_HEALTH = process.env.GEO_HEALTH_URL ?? 'http://localhost:3000/api/hermes/health';

async function probe(label, url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    return { label, ok: res.ok, status: res.status, body };
  } catch (err) {
    return { label, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const results = [];

results.push(await probe('Hermes 9120 /api/status', HERMES_STATUS));
results.push(await probe('Hermes 8642 /health', `${HERMES_HEALTH.replace(/\/$/, '')}/health`));
results.push(await probe('GEO /api/hermes/health', GEO_HEALTH));

let pass = 0;
let fail = 0;

console.log('\n=== Hermes 开发链路检查 ===\n');

for (const r of results) {
  if (r.error) {
    fail++;
    console.log(`✗ ${r.label}`);
    console.log(`  ${r.error}\n`);
    continue;
  }
  const desktop = r.body?.gateway_running != null;
  const apiOk = r.label.includes('8642') && r.ok;
  const geoOk = r.body?.apiGatewayOk === true;
  const good = r.ok && (desktop ? r.body?.gateway_health_url : true) && (r.label.includes('GEO') ? geoOk : true);

  if (r.label.includes('9120') && r.body?.gateway_running && !r.body?.gateway_health_url) {
    fail++;
    console.log(`⚠ ${r.label} — Gateway 在跑，但 API Server(8642) 未开`);
    console.log('  → 在 %LOCALAPPDATA%\\hermes\\.env 加: API_SERVER_ENABLED=true');
    console.log('  → 然后在 Hermes 客户端重启 Gateway\n');
    continue;
  }

  if (good || apiOk) {
    pass++;
    console.log(`✓ ${r.label} (${r.status})`);
  } else if (r.label.includes('GEO') && !r.ok) {
    fail++;
    console.log(`○ ${r.label} — GEO 未启动或不可达（可选）`);
    console.log(`  ${r.error ?? r.status}\n`);
    continue;
  } else {
    fail++;
    console.log(`✗ ${r.label} (${r.status ?? 'err'})`);
  }

  if (typeof r.body === 'object') {
    const parts = [
      r.body.version ?? r.body.detail ?? r.body.mode,
      r.body.connectionMode != null ? `connectionMode=${r.body.connectionMode}` : null,
      r.body.bound != null ? `bound=${r.body.bound}` : null,
      r.body.apiGatewayOk != null ? `apiGatewayOk=${r.body.apiGatewayOk}` : null,
    ].filter(Boolean);
    if (parts.length) console.log(`  ${parts.join(' · ')}`);
  }
  console.log('');
}

console.log('---');
console.log(`通过/检查: ${pass} 项 OK，${fail} 项需处理`);
console.log('\n最少配置见: docs/GEO投放助手_开发阶段Hermes快速连调配置.md\n');

process.exit(fail > 0 && !results[1]?.ok ? 1 : 0);
