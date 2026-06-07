#!/usr/bin/env node
/**
 * 验收 MiniMax 测试 AI：先填入 config/minimax.local.json 的 apiKey，再执行：
 *   node scripts/minimax-smoke.mjs
 */
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'config', 'minimax.local.json');

if (!fs.existsSync(configPath)) {
  console.error('缺少 config/minimax.local.json，请从 config/minimax.example.json 复制');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
if (!String(config.apiKey ?? '').trim()) {
  console.error('请在 config/minimax.local.json 中填入 apiKey');
  process.exit(1);
}

const baseUrl = String(config.baseUrl ?? 'https://api.minimaxi.com/v1').replace(/\/$/, '');
const model = String(config.model ?? 'MiniMax-M3');
const url = `${baseUrl}/chat/completions`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${config.apiKey.trim()}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: '回复 JSON：{"ok":true,"provider":"minimax"}' }],
    response_format: { type: 'json_object' },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error('MiniMax 调用失败:', res.status, data);
  process.exit(1);
}

const text = data.choices?.[0]?.message?.content ?? '';
console.log('MiniMax OK:', { url, model, content: text });
