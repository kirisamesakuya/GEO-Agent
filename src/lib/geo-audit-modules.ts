import type { AgentTaskType } from '../types';

export type AuditModuleSpec = {
  id: string;
  label: string;
  taskType: AgentTaskType;
  skill: string;
};

/** 网站 GEO 资产页：一次分析覆盖的技术模块 */
export const WEBSITE_GEO_ANALYSIS_MODULE_IDS = ['technical', 'crawlers', 'schema', 'llmstxt'] as const;

export function websiteGeoAnalysisModuleLabels(): string[] {
  return WEBSITE_GEO_ANALYSIS_MODULE_IDS.map(
    (id) => AUDIT_MODULE_SPECS.find((m) => m.id === id)?.label ?? id
  );
}

export const AUDIT_MODULE_SPECS: AuditModuleSpec[] = [
  { id: 'audit', label: '总审计', taskType: 'geo_audit', skill: 'geo-audit' },
  { id: 'technical', label: '技术基础', taskType: 'geo_technical', skill: 'geo-technical' },
  { id: 'crawlers', label: 'AI 爬虫访问', taskType: 'geo_crawlers', skill: 'geo-crawlers' },
  { id: 'schema', label: 'Schema', taskType: 'geo_schema', skill: 'geo-schema' },
  { id: 'llmstxt', label: 'llms.txt', taskType: 'geo_llmstxt', skill: 'geo-llmstxt' },
  { id: 'content', label: '内容可引用性', taskType: 'geo_content', skill: 'geo-content' },
];

export function resolveAuditModuleTask(modules: string[]): {
  type: AgentTaskType;
  skill: string;
  modules?: string[];
  label: string;
} {
  const selected = modules.filter(Boolean);
  if (selected.length === 1) {
    const spec = AUDIT_MODULE_SPECS.find((m) => m.id === selected[0]);
    if (spec && spec.id !== 'audit') {
      return { type: spec.taskType, skill: spec.skill, label: spec.label };
    }
  }
  const labels = selected
    .map((id) => AUDIT_MODULE_SPECS.find((m) => m.id === id)?.label ?? id)
    .join('、');
  return {
    type: 'geo_audit',
    skill: 'geo-audit',
    modules: selected.length ? selected : AUDIT_MODULE_SPECS.map((m) => m.id),
    label: labels || '专业审计',
  };
}
