/**
 * 验证 normalizeGeoSkillInput 输出是否符合技能标准字段
 * 运行: npx tsx scripts/verify-geo-skill-input.ts
 */
import { normalizeGeoSkillInput } from '../server/lib/hermes-geo-input.js';

const LEGACY_KEYS = ['website', 'websiteUrl', 'city', 'services', 'description', 'targetMarket'];

function assertNoLegacyKeys(label: string, payload: Record<string, unknown>) {
  const found = LEGACY_KEYS.filter((k) => k in payload);
  if (found.length) {
    throw new Error(`${label}: 仍含旧字段 ${found.join(', ')}`);
  }
}

function assertHas(label: string, payload: Record<string, unknown>, key: string) {
  if (!payload[key]) {
    throw new Error(`${label}: 缺少标准字段 ${key}`);
  }
}

// geo_quick_start
const quick = normalizeGeoSkillInput('geo_quick_start', {
  brandName: '汇智智能',
  city: '南京',
  services: ['GEO 咨询'],
  website: 'https://www.example.com',
  description: '测试描述',
  platforms: ['DeepSeek', '豆包'],
});
assertNoLegacyKeys('geo_quick_start', quick);
assertHas('geo_quick_start', quick, 'brandUrl');
assertHas('geo_quick_start', quick, 'brandCity');
assertHas('geo_quick_start', quick, 'productNames');
assertHas('geo_quick_start', quick, 'brandDesc');
console.log('geo_quick_start OK:', JSON.stringify(quick, null, 2));

// geo_audit
const audit = normalizeGeoSkillInput('geo_audit', {
  brandName: '汇智智能',
  websiteUrl: 'https://www.example.com',
  targetMarket: '中国',
  pageUrls: ['https://www.example.com/about'],
  modules: ['audit', 'schema'],
});
assertNoLegacyKeys('geo_audit', audit);
assertHas('geo_audit', audit, 'brandUrl');
assertHas('geo_audit', audit, 'brandCity');
console.log('geo_audit OK:', JSON.stringify(audit, null, 2));

// geo_schema
const schema = normalizeGeoSkillInput('geo_schema', {
  brandName: '汇智智能',
  websiteUrl: 'https://www.example.com',
});
assertNoLegacyKeys('geo_schema', schema);
assertHas('geo_schema', schema, 'brandUrl');
console.log('geo_schema OK:', JSON.stringify(schema, null, 2));

// brand_extract
const extract = normalizeGeoSkillInput('brand_extract', {
  brandName: '汇智智能',
  brandUrl: 'https://www.example.com',
  socialLink: 'https://www.xiaohongshu.com/user/test',
  description: '业务描述',
});
assertNoLegacyKeys('brand_extract', extract);
assertHas('brand_extract', extract, 'brandUrl');
if (!Array.isArray(extract.sourceMaterials) || extract.sourceMaterials.length === 0) {
  throw new Error('brand_extract: socialLink 应合并进 sourceMaterials');
}
console.log('brand_extract OK:', JSON.stringify(extract, null, 2));

const technical = normalizeGeoSkillInput('geo_technical', {
  brandName: '汇智智能',
  websiteUrl: 'https://www.example.com',
  pageUrls: ['https://www.example.com/about'],
  modules: ['crawlability', 'ssr'],
});
assertNoLegacyKeys('geo_technical', technical);
assertHas('geo_technical', technical, 'brandUrl');
console.log('geo_technical OK:', JSON.stringify(technical, null, 2));

const crawlers = normalizeGeoSkillInput('geo_crawlers', {
  brandName: '汇智智能',
  brandUrl: 'https://www.example.com',
});
assertNoLegacyKeys('geo_crawlers', crawlers);
assertHas('geo_crawlers', crawlers, 'brandUrl');
console.log('geo_crawlers OK:', JSON.stringify(crawlers, null, 2));

const content = normalizeGeoSkillInput('geo_content', {
  brandName: '汇智智能',
  brandUrl: 'https://www.example.com',
  contentItems: [{ id: '1', title: '服务页', body: '正文' }],
  targetQuestions: ['种植牙多少钱？'],
});
assertNoLegacyKeys('geo_content', content);
assertHas('geo_content', content, 'brandUrl');
if (!Array.isArray(content.contentItems) || content.contentItems.length === 0) {
  throw new Error('geo_content: contentItems 应保留');
}
console.log('geo_content OK:', JSON.stringify(content, null, 2));

const platformOpt = normalizeGeoSkillInput('geo_platform_optimizer', {
  brandName: '汇智智能',
  brandUrl: 'https://www.example.com',
  queries: ['品牌口碑', '服务价格'],
  platforms: ['DeepSeek', '豆包'],
});
assertNoLegacyKeys('geo_platform_optimizer', platformOpt);
assertHas('geo_platform_optimizer', platformOpt, 'brandUrl');
assertHas('geo_platform_optimizer', platformOpt, 'queries');
console.log('geo_platform_optimizer OK:', JSON.stringify(platformOpt, null, 2));

const compare = normalizeGeoSkillInput('geo_compare', {
  brandName: '汇智智能',
  brandUrl: 'https://www.example.com',
  baselineReportId: 'baseline-id',
  currentReportId: 'current-id',
  baselineReport: { id: 'baseline-id', totalScore: 40 },
  currentReport: { id: 'current-id', totalScore: 52 },
});
assertNoLegacyKeys('geo_compare', compare);
assertHas('geo_compare', compare, 'baselineReport');
assertHas('geo_compare', compare, 'currentReport');
console.log('geo_compare OK:', JSON.stringify(compare, null, 2));

console.log('\n全部验证通过');
