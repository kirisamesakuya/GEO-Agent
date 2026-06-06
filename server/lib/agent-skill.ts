import type { AgentTaskType } from '../agent/types.js';
import { prisma } from '../db/client.js';

export type SkillRouteEntry = {
  taskType: string;
  skillName: string;
  executor?: string;
  enabled?: boolean;
  priority?: number;
};

export const TASK_SKILL_MAP: Record<AgentTaskType, string> = {
  article_generation: 'geo.article.generate',
  geo_analysis: 'geo.analysis.run',
  geo_quick_start: 'geo-quick-start',
  geo_audit: 'geo-audit',
  geo_schema: 'geo-schema',
  geo_llmstxt: 'geo-llmstxt',
  geo_citability: 'geo-citability',
  geo_report_pdf: 'geo-report-pdf',
  geo_compare: 'geo-compare',
  campaign_plan: 'geo.campaign.plan',
  website_preview: 'geo.website.preview',
  brand_extract: 'geo-brand-mentions',
  hermes_publish: 'hermes.publish.auto',
  account_verify: 'geo.account.verify',
  keyword_mining: 'geo.keyword.mine',
  knowledge_extract: 'geo.knowledge.extract',
  index_sampling: 'geo.index.sample',
  article_rewrite: 'geo.article.rewrite',
};

let skillRouteOverrides: Record<string, string> = {};
let skillExecutorOverrides: Record<string, string> = {};

export function setSkillRouteOverrides(map: Record<string, string>) {
  skillRouteOverrides = map;
}

export function mapConfigExecutor(executor?: string): 'direct_model' | 'nous_hermes' {
  if (executor === 'nous_hermes' || executor === 'hermes_gateway') return 'nous_hermes';
  return 'direct_model';
}

export function executorKindForTaskType(type: string): 'direct_model' | 'nous_hermes' {
  return mapConfigExecutor(skillExecutorOverrides[type]);
}

export async function refreshSkillRoutesFromDb() {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'skill_routes' } });
  if (!row) {
    setSkillRouteOverrides({});
    return;
  }
  try {
    const routes = JSON.parse(row.value) as SkillRouteEntry[];
    const sorted = [...routes].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    const map: Record<string, string> = {};
    const execMap: Record<string, string> = {};
    for (const r of sorted) {
      if (r.enabled !== false && r.taskType && r.skillName) {
        map[r.taskType] = r.skillName;
        if (r.executor) execMap[r.taskType] = r.executor;
      }
    }
    setSkillRouteOverrides(map);
    skillExecutorOverrides = execMap;
  } catch {
    setSkillRouteOverrides({});
    skillExecutorOverrides = {};
  }
}

export function skillNameForTaskType(type: string): string {
  return skillRouteOverrides[type] ?? TASK_SKILL_MAP[type as AgentTaskType] ?? `geo.task.${type}`;
}
