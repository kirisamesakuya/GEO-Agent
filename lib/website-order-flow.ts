// 网页客资需求：发布端提交 → 平台线下交付登记。
// 不走 TaskOrder 接单申请、不走 ArticleDelivery 文章履约链路。

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

/** 一期：仅客资收集，不做 AI 预览与设计师接单 */
export const WEBSITE_PHASE1_TITLE = '新建网页需求';

export const WEBSITE_PHASE1_DESCRIPTION =
  '填写页面类型、目标关键词与联系方式，提交后由后台跟进；进度可在「内容交付 · 网页需求」查看。';

export const WEBSITE_PHASE1_NOTE =
  '一期不做 AI 预览与设计师接单，仅收集客资供运营跟进。新建站点时无需填写现有网址。';

/** 自有网站优化：已有站点页面优化 */
export const SITE_OPTIMIZE_PAGE_TYPES = [
  '官网 GEO 改造',
  '服务详情页',
  '品牌介绍页',
  '活动落地页',
  'FAQ 页',
] as const;

export const SITE_OPTIMIZE_TITLE = '发起网站优化需求';

export const SITE_OPTIMIZE_DESCRIPTION =
  '填写待优化页面链接与诉求，提交后由工程师评估排期；进度可在「内容交付 · 网页需求」查看。';

export const SITE_OPTIMIZE_NOTE =
  '针对已有官网/品牌站输出优化建议，确认方案后工程交付，按次收取服务费（不走投放账户余额）。';
