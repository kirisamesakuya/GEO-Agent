import { prisma } from './client.js';
import {
  AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY,
  buildDefaultAiMonitorPlatformCatalog,
  mergeAiMonitorPlatformCatalog,
  type AiMonitorPlatformCatalogEntry,
} from '../../lib/ai-monitor-platform-catalog.js';
import { invalidateAiMonitorPlatformCatalogCache } from '../services/ai-monitor-platform-catalog.service.js';

const DEMO_MONITOR_KEY = 'demo_monitor_platforms_v';
const DEMO_MONITOR_VERSION = '1';

/** 幂等补齐监测平台字典演示数据（合并新增默认平台） */
export async function ensureDemoMonitorPlatforms(): Promise<void> {
  const defaults = buildDefaultAiMonitorPlatformCatalog();
  const row = await prisma.systemConfig.findUnique({
    where: { key: AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY },
  });

  let stored: AiMonitorPlatformCatalogEntry[] = [];
  if (row?.value?.trim()) {
    try {
      const parsed = JSON.parse(row.value) as AiMonitorPlatformCatalogEntry[];
      if (Array.isArray(parsed)) stored = parsed;
    } catch {
      stored = [];
    }
  }

  const merged = mergeAiMonitorPlatformCatalog(stored.length ? stored : defaults);
  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_MONITOR_KEY } });
  const upToDate =
    marker?.value === DEMO_MONITOR_VERSION &&
    stored.length >= defaults.length &&
    defaults.every((item) => merged.some((m) => m.id === item.id));
  if (upToDate) return;

  await prisma.systemConfig.upsert({
    where: { key: AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY },
    create: { key: AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY, value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  });
  await prisma.systemConfig.upsert({
    where: { key: DEMO_MONITOR_KEY },
    create: { key: DEMO_MONITOR_KEY, value: DEMO_MONITOR_VERSION },
    update: { value: DEMO_MONITOR_VERSION },
  });
  invalidateAiMonitorPlatformCatalogCache();
}
