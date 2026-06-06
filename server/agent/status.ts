import type { AgentTaskStatus } from './types.js';

export const AGENT_TASK_STATUS_LABELS: Record<AgentTaskStatus, string> = {
  pending: '待处理',
  pending_confirm: '待确认',
  queued: '已入队',
  running: '执行中',
  succeeded: '已完成',
  partial: '部分完成',
  failed: '失败',
  canceled: '已取消',
};

export const AGENT_TASK_TYPE_LABELS: Record<string, string> = {
  article_generation: '文章生成',
  geo_analysis: 'GEO 分析',
  geo_quick_start: 'GEO 快速检测',
  geo_audit: 'GEO 专业审计',
  geo_schema: 'Schema 生成',
  geo_llmstxt: 'llms.txt 生成',
  geo_citability: '内容可引用性',
  geo_report_pdf: 'GEO 报告 PDF',
  geo_compare: 'GEO 月度对比',
  campaign_plan: '投放计划',
  website_preview: '网页预览',
  brand_extract: '品牌提取',
  hermes_publish: 'Hermes 发布',
  account_verify: '账号校验',
};

export function isTerminalStatus(status: AgentTaskStatus): boolean {
  return ['succeeded', 'partial', 'failed', 'canceled'].includes(status);
}
