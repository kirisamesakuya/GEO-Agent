import { prisma } from '../db/client.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';

const BINDING_KEY = 'hermes:device_binding';
const BIND_TOKEN_KEY = 'hermes:bind_token';
const GEO_SKILLS_VERSION = '2026.06.04';

const GEO_SKILL_MANIFEST = [
  { name: 'geo-quick-start', status: 'available', riskLevel: 'low' },
  { name: 'geo-audit', status: 'available', riskLevel: 'low' },
  { name: 'geo-technical', status: 'available', riskLevel: 'low' },
  { name: 'geo-crawlers', status: 'available', riskLevel: 'low' },
  { name: 'geo-schema', status: 'available', riskLevel: 'medium' },
  { name: 'geo-llmstxt', status: 'available', riskLevel: 'medium' },
  { name: 'geo-citability', status: 'available', riskLevel: 'medium' },
  { name: 'geo-platform-optimizer', status: 'available', riskLevel: 'medium' },
  { name: 'geo-report-pdf', status: 'available', riskLevel: 'low' },
  { name: 'geo-compare', status: 'available', riskLevel: 'low' },
];

type BindingState = {
  bound: boolean;
  boundDevice?: string | null;
  boundAt?: string | null;
  clientVersion?: string | null;
};

async function readBinding(): Promise<BindingState> {
  const row = await prisma.systemConfig.findUnique({ where: { key: BINDING_KEY } });
  if (!row) return { bound: false };
  try {
    return JSON.parse(row.value) as BindingState;
  } catch {
    return { bound: false };
  }
}

async function writeBinding(state: BindingState) {
  await prisma.systemConfig.upsert({
    where: { key: BINDING_KEY },
    create: { key: BINDING_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

export async function getHermesExtendedHealth() {
  const health = await checkHermesHealth();
  const binding = await readBinding();
  return {
    ok: health.ok,
    url: health.url,
    detail: health.ok ? 'Hermes 在线' : health.detail ?? 'Hermes 未连接',
    clientVersion: binding.clientVersion ?? (health.ok ? 'mock-1.0.0' : null),
    bound: binding.bound,
    boundDevice: binding.boundDevice ?? null,
    heartbeat: health.ok ? 'online' : 'offline',
    downloadUrl: 'https://hermes.agentsyun.com/',
    windowsAvailable: true,
    macLinuxComingSoon: true,
  };
}

export async function getHermesSkillsManifest() {
  const health = await checkHermesHealth();
  const binding = await readBinding();
  return {
    installed: health.ok || binding.bound,
    version: GEO_SKILLS_VERSION,
    skills: GEO_SKILL_MANIFEST,
    note: health.ok ? '本机执行器在线，技能清单为连调前 fixture' : '请安装 Hermes 并绑定后同步技能清单',
  };
}

export async function createHermesBindToken() {
  const token = `GEO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await prisma.systemConfig.upsert({
    where: { key: BIND_TOKEN_KEY },
    create: { key: BIND_TOKEN_KEY, value: JSON.stringify({ token, expiresAt, used: false }) },
    update: { value: JSON.stringify({ token, expiresAt, used: false }) },
  });
  return { token, expiresAt, steps: ['打开 Hermes 客户端', '进入「绑定 GEO 投放助手」', '输入绑定码并确认'] };
}

/** 连调前：模拟绑定成功 */
export async function mockConfirmHermesBinding(deviceName = 'Windows-PC') {
  await writeBinding({
    bound: true,
    boundDevice: deviceName,
    boundAt: new Date().toISOString(),
    clientVersion: 'mock-hermes-2026.06',
  });
  return readBinding();
}
