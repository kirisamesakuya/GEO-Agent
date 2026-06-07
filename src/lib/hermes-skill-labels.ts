/** Hermes GEO 技能 slug → 前端展示名（与产品文案一致） */
export const HERMES_SKILL_LABELS: Record<string, string> = {
  'geo-quick-start': 'GEO 快速检测',
  'geo-audit': 'GEO 专业审计',
  'geo-analysis-web': 'GEO 综合分析',
  'geo-technical': '技术 GEO 检测',
  'geo-crawlers': '爬虫与收录',
  'geo-schema': 'Schema 结构化',
  'geo-llmstxt': 'llms.txt 配置',
  'geo-citability': 'AI 可引用性',
  'geo-content': '内容 GEO 优化',
  'geo-platform-optimizer': '平台优化采样',
  'geo-brand-mentions': '品牌提及分析',
  'geo-report-pdf': '报告 PDF 导出',
  'geo-compare': '月度对比报告',
  'geo-report-web': '客户报告汇总',
  'geo-proposal-web': '售前报价方案',
  'geo-prospect-web': '销售线索记录',
  'geo-keyword-mining-web': '关键词挖掘',
  'geo-platform-ranking-sampling': 'AI 平台排名采样',
  'geo-knowledge-extract-web': '知识库抽取',
  'geo-article-generation-web': 'GEO 文章生成',
  'geo-article-rewrite-web': '文章改写',
  'geo-campaign-plan-web': '投放任务包',
  'geo-website-preview-web': '网页预览方案',
  'hermes-publish-web': '本机发布',
  'account-verify-web': '账号登录校验',
};

export const HERMES_SKILL_STATUS_LABELS: Record<string, string> = {
  ready: '可用',
  degraded: '降级可用',
  unavailable: '不可用',
};

export const HERMES_RISK_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export function hermesSkillLabel(skillName: string): string {
  return HERMES_SKILL_LABELS[skillName] ?? skillName;
}

export function hermesSkillStatusLabel(status: string): string {
  return HERMES_SKILL_STATUS_LABELS[status] ?? status;
}

export type HermesSkillStatusTone = 'ready' | 'warn' | 'danger' | 'neutral';

export function hermesSkillStatusTone(status: string): HermesSkillStatusTone {
  if (status === 'ready') return 'ready';
  if (status === 'degraded') return 'warn';
  if (status === 'unavailable') return 'danger';
  return 'neutral';
}

export function hermesSkillStatusClass(tone: HermesSkillStatusTone): string {
  switch (tone) {
    case 'ready':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'warn':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'danger':
      return 'bg-red-100 text-red-900 border-red-200';
    default:
      return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)] border-[var(--neutral-divider-02)]';
  }
}
