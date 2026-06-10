import {
  AI_MONITOR_LOGIN_HINTS,
  AI_MONITOR_LOGIN_URLS,
  AI_MONITOR_PLATFORMS,
} from './ai-monitor-platforms.js';

export const AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY = 'ai_monitor_platform_catalog';

export interface AiMonitorPlatformCatalogEntry {
  id: string;
  /** 与 AiMonitorSession.platform、排名采样平台名一致 */
  label: string;
  loginUrl: string;
  loginHint: string;
  sortOrder: number;
  enabled: boolean;
}

export function slugifyAiMonitorPlatformId(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fff-]/g, '');
  return normalized || `monitor_${Date.now()}`;
}

export function buildDefaultAiMonitorPlatformCatalog(): AiMonitorPlatformCatalogEntry[] {
  return AI_MONITOR_PLATFORMS.map((label, index) => ({
    id: slugifyAiMonitorPlatformId(label),
    label,
    loginUrl: AI_MONITOR_LOGIN_URLS[label],
    loginHint: AI_MONITOR_LOGIN_HINTS[label],
    sortOrder: (index + 1) * 10,
    enabled: true,
  }));
}

export function sortAiMonitorCatalogEntries(
  entries: AiMonitorPlatformCatalogEntry[]
): AiMonitorPlatformCatalogEntry[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'zh-CN'));
}

export function mergeAiMonitorPlatformCatalog(
  stored: AiMonitorPlatformCatalogEntry[]
): AiMonitorPlatformCatalogEntry[] {
  const defaults = buildDefaultAiMonitorPlatformCatalog();
  const defaultIds = new Set(defaults.map((e) => e.id));
  const byId = new Map(stored.map((e) => [e.id, e]));
  const mergedDefaults = defaults.map((base) => {
    const patch = byId.get(base.id);
    if (!patch) return base;
    return {
      ...base,
      ...patch,
      id: base.id,
      label: patch.label?.trim() || base.label,
      loginUrl: patch.loginUrl?.trim() || base.loginUrl,
      loginHint: patch.loginHint?.trim() || base.loginHint,
      enabled: patch.enabled !== false,
    };
  });
  const customOnly = stored
    .filter((e) => e.id?.trim() && !defaultIds.has(e.id))
    .map((e) => ({
      ...e,
      label: e.label?.trim() || e.id,
      loginUrl: e.loginUrl?.trim() || '',
      loginHint: e.loginHint?.trim() || '',
      enabled: e.enabled !== false,
      sortOrder: e.sortOrder ?? 500,
    }));
  return sortAiMonitorCatalogEntries([...mergedDefaults, ...customOnly]);
}

export function parseAiMonitorPlatformCatalog(raw: string | null | undefined): AiMonitorPlatformCatalogEntry[] {
  if (!raw?.trim()) return buildDefaultAiMonitorPlatformCatalog();
  try {
    const parsed = JSON.parse(raw) as AiMonitorPlatformCatalogEntry[];
    if (!Array.isArray(parsed) || !parsed.length) return buildDefaultAiMonitorPlatformCatalog();
    return mergeAiMonitorPlatformCatalog(parsed);
  } catch {
    return buildDefaultAiMonitorPlatformCatalog();
  }
}

export function validateAiMonitorPlatformCatalog(entries: AiMonitorPlatformCatalogEntry[]): string | null {
  const labels = new Set<string>();
  for (const entry of entries) {
    const label = entry.label?.trim();
    if (!label) return '平台名称不能为空';
    if (labels.has(label)) return `平台名称重复：${label}`;
    labels.add(label);
    if (!entry.loginUrl?.trim()) return `「${label}」缺少登录入口 URL`;
  }
  return null;
}

export function enabledAiMonitorPlatformLabels(entries: AiMonitorPlatformCatalogEntry[]): string[] {
  return sortAiMonitorCatalogEntries(entries)
    .filter((e) => e.enabled)
    .map((e) => e.label);
}

export function createAiMonitorPlatformCatalogEntry(
  input: Pick<AiMonitorPlatformCatalogEntry, 'label'> &
    Partial<Omit<AiMonitorPlatformCatalogEntry, 'label' | 'enabled'>> & { enabled?: boolean }
): AiMonitorPlatformCatalogEntry {
  const label = input.label.trim();
  return {
    id: input.id?.trim() || slugifyAiMonitorPlatformId(label),
    label,
    loginUrl: input.loginUrl?.trim() || '',
    loginHint: input.loginHint?.trim() || '',
    sortOrder: input.sortOrder ?? 500,
    enabled: input.enabled !== false,
  };
}
