import type { AgentTaskStatus } from './types.js';

export {
  AGENT_TASK_STATUS_LABELS,
  SETUP_REASON_LABELS,
  normalizeAgentTaskStatus,
  isTerminalStatus,
  isHermesExecutorTask,
  isHermesLocalTaskType,
} from '../lib/agent-status.js';

export const AGENT_TASK_TYPE_LABELS: Record<string, string> = {
  article_generation: '文章生成',
  geo_analysis: 'GEO 分析',
  geo_quick_start: 'GEO 快速检测',
  geo_audit: 'GEO 专业审计',
  geo_schema: 'Schema 生成',
  geo_llmstxt: 'llms.txt 生成',
  geo_citability: '内容可引用性',
  geo_technical: '技术基础审计',
  geo_crawlers: 'AI 爬虫访问',
  geo_content: '内容 E-E-A-T',
  geo_platform_optimizer: '平台专项优化',
  geo_report_pdf: 'GEO 报告 PDF',
  geo_compare: 'GEO 月度对比',
  campaign_plan: '投放计划',
  website_preview: '网页预览',
  brand_extract: '品牌提取',
  hermes_publish: 'Hermes 发布',
  account_verify: '账号校验',
  keyword_mining: 'AI 挖词',
  knowledge_extract: '知识库抽取',
  index_sampling: '收录采样',
  article_rewrite: '参考重写',
};
