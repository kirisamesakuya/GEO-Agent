import { randomUUID } from 'crypto';
import { prisma } from '../db/client.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';

import { getHermesDevice } from './hermes-local.service.js';
import {
  GEO_SKILLS_VERSION,
  getGeoCapabilities,
  type GeoSkillCapabilityEntry,
} from '../lib/geo-capabilities.js';

const BIND_TOKEN_KEY = 'hermes:bind_token';

export type HermesConnectionMode = 'api_gateway' | 'bound_pull' | 'offline';

function readHermesDeviceBindingSummary(device: Awaited<ReturnType<typeof getHermesDevice>>) {
  if (!device) {
    return { bound: false, boundDevice: null as string | null, clientVersion: null as string | null };
  }
  return {
    bound: true,
    boundDevice: device.deviceName,
    clientVersion: device.hermesVersion ?? null,
  };
}

export function resolveHermesConnectionMode(input: {
  apiGatewayOk: boolean;
  deviceBound: boolean;
  desktopRunning?: boolean;
}): HermesConnectionMode {
  if (input.apiGatewayOk) return 'api_gateway';
  if (input.deviceBound) return 'bound_pull';
  return 'offline';
}

export async function getHermesExtendedHealth() {
  const health = await checkHermesHealth();
  const device = await getHermesDevice();
  const binding = readHermesDeviceBindingSummary(device);
  const heartbeatOnline =
    device?.lastHeartbeatAt &&
    Date.now() - new Date(device.lastHeartbeatAt).getTime() < 90_000;
  const apiGatewayOk = health.apiGatewayOk ?? false;

  return {
    ok: health.ok,
    url: health.url,
    detail: health.detail ?? (health.ok ? 'Hermes 在线' : 'Hermes 未连接'),
    mode: health.mode,
    apiGatewayOk,
    desktopRunning: health.desktopRunning ?? false,
    gatewayRunning: health.gatewayRunning ?? false,
    apiServerEnabled: health.apiServerEnabled ?? false,
    agentVersion: health.agentVersion ?? null,
    desktopAppVersion: health.desktopAppVersion ?? null,
    clientVersion: binding.clientVersion ?? health.desktopAppVersion ?? health.clientVersion ?? null,
    bindClientSupported: health.bindClientSupported ?? false,
    bound: binding.bound,
    boundDevice: binding.boundDevice,
    heartbeat: heartbeatOnline ? 'online' : health.desktopRunning ? 'desktop_running' : 'offline',
    connectionMode: resolveHermesConnectionMode({
      apiGatewayOk,
      deviceBound: binding.bound,
      desktopRunning: health.desktopRunning,
    }),
    downloadUrl: 'https://hermes.agentsyun.com/',
    windowsAvailable: true,
    macLinuxComingSoon: true,
  };
}

function toManifestSkill(entry: GeoSkillCapabilityEntry) {
  return {
    name: entry.name,
    taskTypes: entry.taskTypes,
    status: entry.status,
    riskLevel: entry.riskLevel,
    dependencies: entry.dependencies,
    webContract: entry.webContract,
  };
}

export async function getHermesSkillsManifest() {
  const health = await checkHermesHealth();
  const device = await getHermesDevice();
  const binding = readHermesDeviceBindingSummary(device);
  const capabilities = await getGeoCapabilities(health);

  return {
    installed: health.ok || binding.bound,
    version: capabilities.geoSkillsVersion ?? GEO_SKILLS_VERSION,
    skills: capabilities.skills.map(toManifestSkill),
    source: capabilities.source,
    note: health.ok
      ? '本机执行器在线，技能清单已与 geoWebOutput.v1 契约对齐'
      : '请安装 Hermes 并开启 API Server（8642）后同步技能清单',
  };
}

export async function createHermesBindToken() {
  const token = `GEO-${randomUUID().slice(0, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await prisma.systemConfig.upsert({
    where: { key: BIND_TOKEN_KEY },
    create: { key: BIND_TOKEN_KEY, value: JSON.stringify({ token, expiresAt, used: false }) },
    update: { value: JSON.stringify({ token, expiresAt, used: false }) },
  });
  return {
    token,
    expiresAt,
    steps: ['打开 Hermes 客户端', '进入「绑定 GEO 投放助手」', '输入绑定码并确认'],
  };
}

/** 幂等清理历史 mock 绑定 key（不再读取） */
export async function cleanupLegacyHermesDeviceBinding() {
  await prisma.systemConfig.deleteMany({ where: { key: 'hermes:device_binding' } });
}
