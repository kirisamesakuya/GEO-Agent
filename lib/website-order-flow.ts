/** 网页改装任务：页面类型（与 PRD / CreateWebsiteView 对齐） */
export const WEBSITE_PAGE_TYPES = [
  '品牌介绍页',
  '服务详情页',
  '活动落地页',
  'FAQ 页',
] as const;

export type WebsitePageType = (typeof WEBSITE_PAGE_TYPES)[number];

/** 可选页面模块 */
export const WEBSITE_MODULE_OPTIONS = [
  'Hero 首屏',
  '服务介绍',
  '案例背书',
  'FAQ',
  '联系转化',
  '团队介绍',
] as const;

export const DEFAULT_WEBSITE_MODULES = ['Hero 首屏', '服务介绍', 'FAQ', '联系转化'] as const;

export const WEBSITE_GOAL_PRESETS = [
  '展示品牌服务与本地优势，提升 GEO 可见度',
  '突出核心服务转化路径，承接搜索与 AI 引用流量',
  '活动促销落地，强化预约/咨询转化',
  '补齐可被 AI 摘引的结构化 FAQ 与案例页',
] as const;

export const WEBSITE_DELIVERABLE =
  '网页结构稿、模块文案与 HTML 预览；含移动端基础适配说明';

export const WEBSITE_ACCEPTANCE =
  '发布方确认预览结构与文案后，接单方交付可部署 HTML/页面文件；验收含预览链接与关键模块截图';

export const WEBSITE_PAYEE_TYPE = '网页设计师';
