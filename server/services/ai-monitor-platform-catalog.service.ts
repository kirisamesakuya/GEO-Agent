import { prisma } from '../db/client.js';
import {
  AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY,
  buildDefaultAiMonitorPlatformCatalog,
  enabledAiMonitorPlatformLabels,
  mergeAiMonitorPlatformCatalog,
  parseAiMonitorPlatformCatalog,
  sortAiMonitorCatalogEntries,
  validateAiMonitorPlatformCatalog,
  type AiMonitorPlatformCatalogEntry,
} from '../../lib/ai-monitor-platform-catalog.js';
import { upsertSystemConfig } from './platform.service.js';

let cachedCatalog: AiMonitorPlatformCatalogEntry[] | null = null;

export function invalidateAiMonitorPlatformCatalogCache() {
  cachedCatalog = null;
}

async function readCatalogFromDb(): Promise<AiMonitorPlatformCatalogEntry[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY },
  });
  return parseAiMonitorPlatformCatalog(row?.value);
}

export async function getAiMonitorPlatformCatalog(): Promise<AiMonitorPlatformCatalogEntry[]> {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = await readCatalogFromDb();
  return cachedCatalog;
}

export async function getEnabledAiMonitorPlatformLabels(): Promise<string[]> {
  const catalog = await getAiMonitorPlatformCatalog();
  return enabledAiMonitorPlatformLabels(catalog);
}

export async function getAiMonitorLoginMeta(
  platform: string
): Promise<{ loginUrl?: string; loginHint?: string }> {
  const catalog = await getAiMonitorPlatformCatalog();
  const hit = catalog.find((e) => e.label === platform);
  if (!hit) return {};
  return { loginUrl: hit.loginUrl, loginHint: hit.loginHint };
}

export async function saveAiMonitorPlatformCatalog(
  entries: AiMonitorPlatformCatalogEntry[],
  reason?: string
): Promise<AiMonitorPlatformCatalogEntry[]> {
  const merged = mergeAiMonitorPlatformCatalog(entries);
  const error = validateAiMonitorPlatformCatalog(merged);
  if (error) throw new Error(error);

  const serialized = JSON.stringify(sortAiMonitorCatalogEntries(merged));
  await upsertSystemConfig(
    AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY,
    serialized,
    reason ?? '更新监测平台字典'
  );
  cachedCatalog = merged;
  return merged;
}

export async function resetAiMonitorPlatformCatalog(reason?: string) {
  const defaults = buildDefaultAiMonitorPlatformCatalog();
  return saveAiMonitorPlatformCatalog(defaults, reason ?? '恢复监测平台默认字典');
}

export async function listEnabledAiMonitorPlatformCatalog(): Promise<AiMonitorPlatformCatalogEntry[]> {
  const catalog = await getAiMonitorPlatformCatalog();
  return sortAiMonitorCatalogEntries(catalog.filter((e) => e.enabled));
}
