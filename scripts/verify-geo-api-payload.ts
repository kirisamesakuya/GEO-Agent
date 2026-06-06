/**
 * 通过 createAgentTask 验证 DB 层归一化（无需 HTTP gate）
 * 运行: npx tsx scripts/verify-geo-api-payload.ts
 */
import { createAgentTask } from '../server/services/agent-task.service.js';
import { buildSkillPayloadForHermes } from '../server/lib/hermes-geo-input.js';
import type { AgentTask } from '../server/agent/types.js';

const LEGACY = ['website', 'websiteUrl', 'city', 'services', 'description'];

function check(label: string, input: Record<string, unknown>) {
  const bad = LEGACY.filter((k) => k in input);
  if (bad.length) throw new Error(`${label}: legacy keys ${bad.join(', ')}`);
  console.log(`✓ ${label}`, JSON.stringify(input));
}

const quick = await createAgentTask({
  type: 'geo_quick_start',
  title: 'verify-quick',
  brandName: '汇智智能',
  executor: 'direct_model',
  input: {
    city: '南京',
    services: ['GEO'],
    website: 'https://www.verify-quick.cn',
    description: 'desc',
    platforms: ['DeepSeek'],
  },
});
check('createAgentTask geo_quick_start', quick.input);

const audit = await createAgentTask({
  type: 'geo_audit',
  title: 'verify-audit',
  brandName: '汇智智能',
  executor: 'direct_model',
  input: {
    websiteUrl: 'https://www.verify-audit.cn',
    targetMarket: '中国',
    brandName: '汇智智能',
    modules: ['audit'],
  },
});
check('createAgentTask geo_audit', audit.input);

const schema = await createAgentTask({
  type: 'geo_schema',
  title: 'verify-schema',
  brandName: '汇智智能',
  executor: 'direct_model',
  input: {
    websiteUrl: 'https://www.verify-schema.cn',
    brandName: '汇智智能',
  },
});
check('createAgentTask geo_schema', schema.input);

const hermesPayload = buildSkillPayloadForHermes({
  ...quick,
  type: 'geo_quick_start',
} as AgentTask);
check('buildSkillPayloadForHermes', hermesPayload);

console.log('\nAPI/DB 层 payload 验证通过');
