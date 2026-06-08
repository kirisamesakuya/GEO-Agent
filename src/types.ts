export type AppMode = 'publisher' | 'provider' | 'platform';

export type ViewType =
  | 'workbench'
  | 'keyword_library'
  | 'knowledge_base'
  | 'indexing_rank'
  | 'asset_library'
  | 'publish_schedule'
  | 'publish_records'
  | 'content_publish'
  | 'create_order'
  | 'self_account_publish'
  | 'generate_article'
  | 'geo_analysis'
  | 'delivery_plan'
  | 'create_website'
  | 'brand_list'
  | 'content_library'
  | 'content_delivery'
  | 'order_delivery'
  | 'hermes_console'
  | 'agent_task_submitted'
  | 'agent_task_results'
  | 'agent_tasks'
  | 'agent_task_result'
  | 'brand_profile'
  | 'account_binding'
  | 'account_funds'
  | 'ai_credits'
  | 'budget'
  | 'user_center'
  | 'team_settings'
  | 'notifications'
  | 'brand_confirm'
  | 'onboarding_console';

export type AgentTaskStatus =
  | 'pending'
  | 'pending_setup'
  | 'waiting_local_device'
  | 'pending_confirm'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'partial'
  | 'failed'
  | 'canceled';

export type HermesSetupReason =
  | 'hermes_not_installed'
  | 'hermes_not_running'
  | 'hermes_not_bound'
  | 'token_capacity_unavailable'
  | 'skill_missing'
  | 'output_parse_failed';

export type BrandClueInputType =
  | 'brand_name'
  | 'website_url'
  | 'file'
  | 'social_link'
  | 'description';

export type AgentTaskType =
  | 'article_generation'
  | 'geo_analysis'
  | 'geo_quick_start'
  | 'geo_audit'
  | 'geo_schema'
  | 'geo_llmstxt'
  | 'geo_citability'
  | 'geo_technical'
  | 'geo_crawlers'
  | 'geo_content'
  | 'geo_platform_optimizer'
  | 'geo_report'
  | 'geo_report_pdf'
  | 'geo_compare'
  | 'geo_proposal'
  | 'geo_prospect'
  | 'campaign_plan'
  | 'website_preview'
  | 'brand_extract'
  | 'hermes_publish'
  | 'account_verify'
  | 'keyword_mining'
  | 'knowledge_extract'
  | 'index_sampling'
  | 'article_rewrite';

export interface AgentTaskLog {
  id: string;
  taskId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  title: string;
  status: AgentTaskStatus;
  progress: number;
  executor: 'direct_model' | 'nous_hermes';
  brandId?: string;
  brandName?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  userErrorMessage?: string;
  externalRunId?: string;
  businessRef?: string;
  needsReview?: boolean;
  reviewCategory?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Article {
  id: number;
  contentItemId?: string;
  batchId?: string;
  version?: number;
  title: string;
  platform: '小红书' | '知乎' | '公众号';
  status: '待生成' | '生成中' | '已完成' | '已发布';
  previewText: string;
  fullContent: string;
  structure: string;
}

export interface ReportItem {
  id: string;
  title: string;
  status: '待分析' | '分析中' | '已完成';
  category: 'mention' | 'competitor' | 'gap' | 'suggestions';
  icon: string;
  content: string;
  score?: number;
}

export interface TaskPackage {
  id: number;
  platform: '小红书' | '知乎' | '公众号' | '通用';
  name: string;
  payeeType: string;
  budget: number;
  deliverable: string;
  acceptance: string;
  status: '待确认' | '已提交';
  publishToLobby: boolean;
}

export type BrandSourceMaterialKind = 'image' | 'document' | 'link' | 'other';

export interface BrandSourceMaterial {
  id: string;
  kind: BrandSourceMaterialKind;
  name: string;
  url: string;
  mimeType?: string;
}

export interface BrandProfile {
  website: string;
  name: string;
  industry: string;
  city: string;
  ownerName?: string;
  storeCount: number;
  description: string;
  keywords: string[];
  competitors: string[];
  forbiddenWords: string[];
  sourceMaterials?: BrandSourceMaterial[];
}

export interface AccountBinding {
  id: string;
  platform: string;
  accountName: string;
  status: '已授权' | '待授权' | '授权中' | '校验失败' | '待确认' | '正常';
  permissions: string;
  lastChecked: string;
  authMethod?: string;
  expiresAt?: string;
}

export interface PlatformAuthConfig {
  platform: string;
  authMode: 'browser' | 'oauth';
  oauthEnabled: boolean;
  loginUrl: string;
  creatorCenterUrl?: string;
  permissionsLabel: string;
  loginHint?: string;
  oauthNote?: string;
  isCustom?: boolean;
  logoUrl?: string;
  abbr?: string;
  gradient?: string;
}

export interface PendingBindSession {
  accountId: string;
  bindSessionId: string;
  loginUrl: string;
  platform: string;
}

export interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export interface ContentItem {
  id: string;
  batchId: string;
  title: string;
  platform: string;
  previewText: string;
  fullContent: string;
  structure: string;
  generationMetaJson?: string;
  qualityChecksJson?: string;
  effectBaselineJson?: string;
  effectVerificationJson?: string;
  status: 'draft' | 'published' | 'archived';
  publishStatus?: 'not_scheduled' | 'scheduled' | 'published' | 'failed' | string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBatch {
  id: string;
  brandName: string;
  platform: string;
  taskId?: string;
  articleCount: number;
  status: 'generating' | 'ready' | 'partial' | 'failed';
  items: ContentItem[];
  createdAt: string;
  updatedAt: string;
}

export const AGENT_TASK_TYPE_LABELS: Record<AgentTaskType, string> = {
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
  geo_report: 'GEO 报告汇总',
  geo_report_pdf: 'GEO 报告 PDF',
  geo_compare: 'GEO 月度对比',
  geo_proposal: 'GEO 报价方案',
  geo_prospect: 'GEO 销售线索',
  campaign_plan: '接单投放',
  website_preview: '网页预览',
  brand_extract: '品牌提取',
  hermes_publish: 'Hermes 发布',
  account_verify: '账号校验',
  keyword_mining: 'AI 挖词',
  knowledge_extract: '知识库抽取',
  index_sampling: '收录采样',
  article_rewrite: '参考重写',
};
