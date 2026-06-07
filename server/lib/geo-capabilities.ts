import type { HermesHealthResult } from '../agent/executors/hermes.js';

export const GEO_SKILLS_VERSION = '2026.06.06';

export type SkillDependencyStatus = 'ready' | 'degraded' | 'unavailable';

export type SkillCapabilityStatus = 'ready' | 'degraded' | 'unavailable';

export type GeoSkillCapabilityEntry = {
  name: string;
  taskTypes: string[];
  version: string;
  status: SkillCapabilityStatus;
  riskLevel: 'low' | 'medium' | 'high';
  dependencies: {
    python: SkillDependencyStatus;
    requests: SkillDependencyStatus;
    browser: SkillDependencyStatus;
    pandoc: SkillDependencyStatus;
  };
  webContract: {
    input: 'geoSkillInput.v1';
    output: 'geoWebOutput.v1';
  };
};

export type GeoCapabilitiesResponse = {
  hermesVersion: string | null;
  geoSkillsVersion: string;
  skills: GeoSkillCapabilityEntry[];
  workspace: {
    tempDirWritable: boolean;
    artifactUploadSupported: boolean;
  };
  source: 'hermes_gateway' | 'local_fallback';
};

type SkillDef = {
  name: string;
  taskTypes: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresBrowser?: boolean;
  requiresPandoc?: boolean;
};

export const GEO_TASK_SKILL_CAPABILITIES: SkillDef[] = [
  { name: 'geo-quick-start', taskTypes: ['geo_quick_start'], riskLevel: 'low', requiresBrowser: true },
  { name: 'geo-audit', taskTypes: ['geo_audit'], riskLevel: 'low' },
  { name: 'geo-analysis-web', taskTypes: ['geo_analysis'], riskLevel: 'low' },
  { name: 'geo-technical', taskTypes: ['geo_technical'], riskLevel: 'low' },
  { name: 'geo-crawlers', taskTypes: ['geo_crawlers'], riskLevel: 'low' },
  { name: 'geo-schema', taskTypes: ['geo_schema'], riskLevel: 'medium' },
  { name: 'geo-llmstxt', taskTypes: ['geo_llmstxt'], riskLevel: 'medium' },
  { name: 'geo-citability', taskTypes: ['geo_citability'], riskLevel: 'medium' },
  { name: 'geo-content', taskTypes: ['geo_content'], riskLevel: 'medium' },
  { name: 'geo-platform-optimizer', taskTypes: ['geo_platform_optimizer'], riskLevel: 'medium', requiresBrowser: true },
  { name: 'geo-brand-mentions', taskTypes: ['brand_extract'], riskLevel: 'low' },
  { name: 'geo-report-pdf', taskTypes: ['geo_report_pdf'], riskLevel: 'low', requiresPandoc: true },
  { name: 'geo-compare', taskTypes: ['geo_compare'], riskLevel: 'low' },
  { name: 'geo-report-web', taskTypes: ['geo_report'], riskLevel: 'low' },
  { name: 'geo-proposal-web', taskTypes: ['geo_proposal'], riskLevel: 'low' },
  { name: 'geo-prospect-web', taskTypes: ['geo_prospect'], riskLevel: 'low' },
  { name: 'geo-keyword-mining-web', taskTypes: ['keyword_mining'], riskLevel: 'low' },
  { name: 'geo-platform-ranking-sampling', taskTypes: ['index_sampling'], riskLevel: 'medium', requiresBrowser: true },
  { name: 'geo-knowledge-extract-web', taskTypes: ['knowledge_extract'], riskLevel: 'low' },
  { name: 'geo-article-generation-web', taskTypes: ['article_generation'], riskLevel: 'medium' },
  { name: 'geo-article-rewrite-web', taskTypes: ['article_rewrite'], riskLevel: 'medium' },
  { name: 'geo-campaign-plan-web', taskTypes: ['campaign_plan'], riskLevel: 'medium' },
  { name: 'geo-website-preview-web', taskTypes: ['website_preview'], riskLevel: 'medium' },
  { name: 'hermes-publish-web', taskTypes: ['hermes_publish'], riskLevel: 'high', requiresBrowser: true },
  { name: 'account-verify-web', taskTypes: ['account_verify'], riskLevel: 'medium', requiresBrowser: true },
];

const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

function gatewayOnline(health: HermesHealthResult): boolean {
  return Boolean(health.ok && health.apiGatewayOk);
}

function resolveDependencies(
  def: SkillDef,
  health: HermesHealthResult
): GeoSkillCapabilityEntry['dependencies'] {
  const online = gatewayOnline(health);
  const python: SkillDependencyStatus = online ? 'ready' : 'degraded';
  const requests: SkillDependencyStatus = online ? 'ready' : 'degraded';
  const browser: SkillDependencyStatus = def.requiresBrowser
    ? online
      ? 'degraded'
      : 'unavailable'
    : online
      ? 'ready'
      : 'degraded';
  const pandoc: SkillDependencyStatus = def.requiresPandoc ? 'unavailable' : online ? 'ready' : 'degraded';

  return { python, requests, browser, pandoc };
}

export function resolveSkillCapability(
  def: SkillDef,
  health: HermesHealthResult
): GeoSkillCapabilityEntry {
  const dependencies = resolveDependencies(def, health);
  const online = gatewayOnline(health);

  let status: SkillCapabilityStatus = 'ready';
  if (!online) {
    status = 'degraded';
  } else if (def.requiresPandoc) {
    status = 'degraded';
  } else if (def.requiresBrowser) {
    status = 'degraded';
  }

  return {
    name: def.name,
    taskTypes: def.taskTypes,
    version: '1.0.0',
    status,
    riskLevel: def.riskLevel,
    dependencies,
    webContract: {
      input: 'geoSkillInput.v1',
      output: 'geoWebOutput.v1',
    },
  };
}

export function buildLocalGeoCapabilities(health: HermesHealthResult): GeoCapabilitiesResponse {
  const skills = GEO_TASK_SKILL_CAPABILITIES.map((def) => resolveSkillCapability(def, health));
  return {
    hermesVersion:
      health.desktopAppVersion ?? health.clientVersion ?? health.agentVersion ?? null,
    geoSkillsVersion: GEO_SKILLS_VERSION,
    skills,
    workspace: {
      tempDirWritable: gatewayOnline(health),
      artifactUploadSupported: gatewayOnline(health),
    },
    source: 'local_fallback',
  };
}

export async function fetchHermesGeoCapabilities(
  health: HermesHealthResult
): Promise<GeoCapabilitiesResponse | null> {
  if (!gatewayOnline(health)) return null;

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (HERMES_API_KEY) headers.Authorization = `Bearer ${HERMES_API_KEY}`;

    const res = await fetch(`${HERMES_BASE_URL}/v1/geo/capabilities`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Partial<GeoCapabilitiesResponse>;
    if (!Array.isArray(data.skills) || data.skills.length === 0) return null;

    return {
      hermesVersion: data.hermesVersion ?? health.clientVersion ?? null,
      geoSkillsVersion: data.geoSkillsVersion ?? GEO_SKILLS_VERSION,
      skills: data.skills as GeoSkillCapabilityEntry[],
      workspace: data.workspace ?? {
        tempDirWritable: true,
        artifactUploadSupported: true,
      },
      source: 'hermes_gateway',
    };
  } catch {
    return null;
  }
}

export async function getGeoCapabilities(health: HermesHealthResult): Promise<GeoCapabilitiesResponse> {
  const remote = await fetchHermesGeoCapabilities(health);
  if (remote) return remote;
  return buildLocalGeoCapabilities(health);
}

export function resolveTaskTypeCapability(
  taskType: string,
  capabilities: GeoCapabilitiesResponse
): GeoSkillCapabilityEntry | undefined {
  return capabilities.skills.find((s) => s.taskTypes.includes(taskType));
}

export function isTaskTypeUnavailable(
  taskType: string,
  capabilities: GeoCapabilitiesResponse
): { unavailable: boolean; skillName?: string; reason?: string } {
  const entry = resolveTaskTypeCapability(taskType, capabilities);
  if (!entry) {
    return { unavailable: true, reason: `未注册 taskType「${taskType}」对应的 GEO skill` };
  }
  return { unavailable: false, skillName: entry.name };
}

export type ReadinessUiState = 'ready' | 'partial' | 'needs_setup' | 'blocked';

export function resolveReadinessUiState(input: {
  hermesReady: boolean;
  setupReason: string | null;
  capabilities: GeoCapabilitiesResponse;
}): ReadinessUiState {
  if (input.setupReason && input.setupReason !== 'skill_missing') {
    return 'needs_setup';
  }

  const statuses = input.capabilities.skills.map((s) => s.status);
  const allUnavailable = statuses.every((s) => s === 'unavailable');
  if (allUnavailable || input.setupReason === 'skill_missing') {
    return 'blocked';
  }

  if (input.hermesReady && statuses.every((s) => s === 'ready')) {
    return 'ready';
  }

  if (input.hermesReady || input.capabilities.source === 'local_fallback') {
    const hasReadyCore = input.capabilities.skills.some(
      (s) =>
        (s.name === 'geo-audit' || s.name === 'geo-quick-start') &&
        (s.status === 'ready' || s.status === 'degraded')
    );
    if (hasReadyCore) return 'partial';
  }

  return input.hermesReady ? 'partial' : 'needs_setup';
}
