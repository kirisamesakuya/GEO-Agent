const BASE = process.env.BASE ?? 'http://localhost:3000';

const endpoints = [
  ['GET', '/api/gate/status?brandName=云杉口腔'],
  ['GET', '/api/platform/dashboard'],
  ['GET', '/api/platform/website-orders'],
  ['GET', '/api/platform/providers'],
  ['GET', '/api/platform/merchants'],
  ['GET', '/api/platform/agent-skill-runs'],
  ['GET', '/api/hermes/health'],
  ['GET', '/api/website-orders?brandName=云杉口腔'],
  ['GET', '/api/providers'],
];

async function main() {
  const results = [];
  for (const [method, path] of endpoints) {
    try {
      const res = await fetch(`${BASE}${path}`, { method });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { _raw: text.slice(0, 120) };
      }
      results.push({
        method,
        path,
        status: res.status,
        ok: res.ok,
        error: body.error,
        keys: body && typeof body === 'object' ? Object.keys(body).slice(0, 6) : [],
      });
    } catch (err) {
      results.push({ method, path, status: 0, ok: false, error: String(err) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main();
