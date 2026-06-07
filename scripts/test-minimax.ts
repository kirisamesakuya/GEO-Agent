/**
 * 本地自检：npx tsx scripts/test-minimax.ts
 */
import { checkMinimaxConnection, loadMinimaxConfig, generateJson } from '../server/lib/minimax.ts';

async function main() {
  const cfg = loadMinimaxConfig();
  console.log('config:', cfg ? { baseUrl: cfg.baseUrl, model: cfg.model, keyLen: cfg.apiKey.length } : null);

  const ping = await checkMinimaxConnection();
  console.log('checkMinimaxConnection:', ping);
  if (!ping.ok) process.exit(1);

  const preview = await generateJson<{ modules: string[]; headline: string }>(
    '为品牌 Demo 生成网页预览。返回 JSON: {"modules":["首屏"],"previewHtml":"<section/>","headline":"Demo"}',
  );
  console.log('website_preview sample:', preview);
  console.log('OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
