/** Mock fixture outputs for GEO Hermes skills (pre-integration) */

export type GeoAuditScores = {
  aiCitability: number;
  brandAuthority: number;
  contentEeat: number;
  technicalGeo: number;
  schema: number;
  platformOptimization: number;
};

export type GeoAuditFinding = {
  id: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  impact: string;
  suggestion: string;
  owner?: string;
};

export type GeoAuditArtifact = {
  id: string;
  type: 'markdown' | 'pdf' | 'screenshot' | 'json' | 'schema' | 'llmstxt' | 'text';
  name: string;
  mimeType?: string;
  preview?: string;
  url?: string;
};

export type GeoActionPlanItem = {
  id: string;
  horizon: '7d' | '30d' | 'monthly';
  title: string;
  detail: string;
};

const DEFAULT_PLATFORMS = ['DeepSeek', '豆包', 'Kimi'];

function brandFromInput(input: Record<string, unknown>, fallback = '品牌'): string {
  return String(input.brandName ?? input.brand ?? fallback);
}

export function fixtureGeoQuickStart(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const platforms = (input.platforms as string[]) ?? DEFAULT_PLATFORMS;
  const questions = Array.from({ length: 15 }, (_, i) => ({
    id: `q-${i + 1}`,
    text: `${brand} ${input.city ?? '本地'} ${['种植牙价格', '隐形矫正推荐', '儿童齿科哪家好', '洗牙多少钱', '正畸医生推荐'][i % 5]}？`,
    intent: i % 3 === 0 ? 'commercial' : 'informational',
  }));
  const matrix = platforms.map((p, i) => ({
    platform: p,
    brandMentioned: i !== 1,
    competitorMentioned: true,
    position: i === 0 ? 2 : i === 2 ? 4 : null,
    snippet: `Mock：在 ${p} 搜索场景下，${brand} ${i === 1 ? '未' : '已'}被提及。`,
  }));
  const riskLevel = matrix.filter((m) => m.brandMentioned).length < 2 ? 'high' : 'medium';
  const totalScore = Math.round(
    (matrix.filter((m) => m.brandMentioned).length / platforms.length) * 55 + 20
  );
  return {
    audit: {
      reportType: 'quick_start',
      brandName: brand,
      totalScore,
      mentionRate: Math.round((matrix.filter((m) => m.brandMentioned).length / platforms.length) * 100),
      rank: matrix.find((m) => m.position)?.position ?? 5,
      gapsFound: questions.length - matrix.filter((m) => m.brandMentioned).length,
      scores: {
        aiCitability: 48,
        brandAuthority: 42,
        contentEeat: 50,
        technicalGeo: 55,
        schema: 35,
        platformOptimization: 46,
      } satisfies GeoAuditScores,
      questions,
      platformMatrix: matrix,
      recommendAudit: riskLevel === 'high',
      riskLevel,
    },
    data: {
      brandMentionSummary: `${brand} 在 ${platforms.join('、')} 的快速检测完成：${matrix.filter((m) => m.brandMentioned).length}/${platforms.length} 个平台有品牌提及。`,
      competitorAnalysis: '竞品在 DeepSeek、豆包场景提及频率高于本品牌，建议补充问答矩阵与权威背书内容。',
      contentGap: questions.slice(0, 5).map((q) => q.text).join('\n'),
      optimizationSuggestions: riskLevel === 'high'
        ? '建议立即进入专业审计，优先补齐 Schema、llms.txt 与平台专项内容。'
        : '可进入专业审计深化技术项与内容可引用性优化。',
    },
    metrics: {
      mentionRate: Math.round((matrix.filter((m) => m.brandMentioned).length / platforms.length) * 100),
      rank: matrix.find((m) => m.position)?.position ?? 5,
      gapsFound: 5,
    },
    artifacts: buildDefaultArtifacts(brand, 'quick_start'),
    findings: buildDefaultFindings(brand),
    actionPlan: buildDefaultActionPlan(brand),
  };
}

export function fixtureGeoAudit(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const modules = (input.modules as string[]) ?? ['audit', 'technical', 'crawlers', 'schema', 'llmstxt', 'content'];
  const totalScore = 62;
  const scores: GeoAuditScores = {
    aiCitability: 55,
    brandAuthority: 48,
    contentEeat: 64,
    technicalGeo: 70,
    schema: modules.includes('schema') ? 40 : 50,
    platformOptimization: 58,
  };
  return {
    audit: {
      reportType: 'audit',
      brandName: brand,
      websiteUrl: input.websiteUrl,
      modules,
      totalScore,
      mentionRate: 58,
      rank: 3,
      gapsFound: 8,
      scores,
    },
    data: {
      brandMentionSummary: `${brand} 专业审计完成（Mock）。技术基础得分 ${scores.technicalGeo}，Schema 得分 ${scores.schema}。`,
      competitorAnalysis: `已对比 ${((input.competitors as string[]) ?? []).length || 2} 个竞品页面与引用来源。`,
      contentGap: '首页缺少结构化 FAQ；服务页 E-E-A-T 信号不足；llms.txt 未部署。',
      optimizationSuggestions: '优先修复 Schema 与 llms.txt，其次补充平台专项问答内容。',
    },
    metrics: { mentionRate: 58, rank: 3, gapsFound: 8 },
    artifacts: buildDefaultArtifacts(brand, 'audit'),
    findings: buildDefaultFindings(brand),
    actionPlan: buildDefaultActionPlan(brand),
  };
}

export function fixtureGeoSchema(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: brand,
        url: input.brandUrl ?? input.websiteUrl ?? 'https://example.com',
      },
      {
        '@type': 'LocalBusiness',
        name: `${brand} 门店`,
        address: { '@type': 'PostalAddress', addressLocality: input.city ?? '南京' },
      },
    ],
  };
  const preview = JSON.stringify(schema, null, 2);
  return {
    audit: { reportType: 'assets', brandName: brand, assetKind: 'schema' },
    asset: { type: 'schema', preview, riskLevel: 'medium' },
    artifacts: [
      {
        id: 'schema-json',
        type: 'schema' as const,
        name: 'organization-localbusiness.json',
        mimeType: 'application/json',
        preview,
      },
    ],
    data: {
      brandMentionSummary: 'Schema JSON-LD 草稿已生成，发布前请人工确认字段与门店信息。',
      competitorAnalysis: '',
      contentGap: '',
      optimizationSuggestions: '将 JSON-LD 嵌入官网 <head>，并在 Search Console 验证。',
    },
  };
}

export function fixtureGeoLlmstxt(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const preview = `# ${brand}\n\n> ${brand} 官方 llms.txt（Mock 草稿）\n\n## Services\n- 种植牙\n- 隐形矫正\n- 儿童齿科\n\n## Contact\n- Website: ${input.brandUrl ?? input.websiteUrl ?? 'https://example.com'}\n`;
  return {
    audit: { reportType: 'assets', brandName: brand, assetKind: 'llmstxt' },
    asset: { type: 'llmstxt', preview, riskLevel: 'medium' },
    artifacts: [
      { id: 'llmstxt', type: 'llmstxt' as const, name: 'llms.txt', mimeType: 'text/plain', preview },
    ],
    data: {
      brandMentionSummary: 'llms.txt 草稿已生成。',
      competitorAnalysis: '',
      contentGap: '',
      optimizationSuggestions: '部署至网站根目录 /llms.txt，并同步 llms-full.txt（可选）。',
    },
  };
}

export function fixtureGeoCitability(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  return {
    audit: { reportType: 'assets', brandName: brand, assetKind: 'citability' },
    asset: {
      type: 'citability',
      riskLevel: 'medium',
      suggestions: [
        { paragraph: '我们提供多种种植方案…', reason: '缺少数据来源与医生资质', rewrite: '由主治医师团队提供种植方案，附资质编号与案例数据。' },
      ],
    },
    artifacts: [
      {
        id: 'citability-json',
        type: 'json' as const,
        name: 'citability-suggestions.json',
        preview: JSON.stringify({ brand, suggestions: 2 }, null, 2),
      },
    ],
    data: {
      brandMentionSummary: '内容可引用性分析完成（Mock）。',
      competitorAnalysis: '',
      contentGap: '服务页 2 段低分内容需改写。',
      optimizationSuggestions: '优先改写首页首屏与服务详情段落。',
    },
  };
}

function buildDefaultFindings(brand: string): GeoAuditFinding[] {
  return [
    {
      id: 'f1',
      level: 'high',
      title: 'Schema 标记缺失',
      impact: 'AI 爬虫难以准确识别品牌实体与服务范围',
      suggestion: '部署 Organization + LocalBusiness JSON-LD',
      owner: '技术',
    },
    {
      id: 'f2',
      level: 'medium',
      title: 'llms.txt 未部署',
      impact: '大模型抓取时缺少权威摘要入口',
      suggestion: '生成并发布 llms.txt',
      owner: '运营',
    },
    {
      id: 'f3',
      level: 'low',
      title: `${brand} 在部分平台提及偏弱`,
      impact: '售前场景品牌曝光不足',
      suggestion: '补充问答覆盖与探店内容',
      owner: '内容',
    },
  ];
}

function buildDefaultActionPlan(brand: string): GeoActionPlanItem[] {
  return [
    { id: 'a1', horizon: '7d', title: '部署 Schema', detail: '完成首页与服务页 JSON-LD 嵌入并验证' },
    { id: 'a2', horizon: '7d', title: '发布 llms.txt', detail: '根目录部署 llms.txt 草稿' },
    { id: 'a3', horizon: '30d', title: '平台问答矩阵', detail: `${brand} 在 DeepSeek/豆包补充 10 条问答` },
    { id: 'a4', horizon: 'monthly', title: '月度复盘', detail: '对比基线报告，跟踪提及率与分项分变化' },
  ];
}

function buildDefaultArtifacts(brand: string, kind: string): GeoAuditArtifact[] {
  return [
    {
      id: 'md-report',
      type: 'markdown',
      name: `${brand}-${kind}-report.md`,
      preview: `# ${brand} GEO ${kind} 报告\n\n> Mock 交付物，连调后替换为 Hermes 输出文件。`,
    },
    {
      id: 'json-raw',
      type: 'json',
      name: 'audit-raw.json',
      preview: JSON.stringify({ brand, kind, mock: true }, null, 2),
    },
    {
      id: 'screenshot-1',
      type: 'screenshot',
      name: 'platform-matrix.png',
      url: 'https://placehold.co/800x450/png?text=Platform+Matrix+Mock',
    },
  ];
}

function withGeoWebContract(
  brand: string,
  kind: string,
  partial: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...partial,
    audit: partial.audit ?? { reportType: kind, brandName: brand },
    data: partial.data ?? {},
    metrics: partial.metrics ?? {},
    findings: partial.findings ?? buildDefaultFindings(brand),
    actionPlan: partial.actionPlan ?? buildDefaultActionPlan(brand),
    artifacts: partial.artifacts ?? buildDefaultArtifacts(brand, kind),
  };
}

export function fixtureGeoTechnical(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  return withGeoWebContract(brand, 'technical', {
    audit: {
      reportType: 'technical',
      brandName: brand,
      totalScore: 72,
      summary: `${brand} 技术基础审计（Mock）`,
    },
    data: {
      technicalScore: 72,
      crawlability: { robotsValid: true, sitemapLinked: true, score: 80 },
      ssr: { serverRendered: true, score: 75 },
      performance: { lcpMs: 2400, score: 68 },
      headers: { https: true, hsts: false },
    },
    metrics: {
      technicalScore: 72,
      crawlability: 80,
      ssr: 75,
      performance: 68,
    },
    findings: [
      {
        id: 't1',
        level: 'medium',
        title: '缺少 HSTS',
        impact: 'HTTPS 安全信号不完整',
        suggestion: '配置 Strict-Transport-Security 响应头',
      },
    ],
  });
}

export function fixtureGeoCrawlers(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const botMatrix = [
    { bot: 'GPTBot', allowed: true, platform: 'ChatGPT' },
    { bot: 'Google-Extended', allowed: false, platform: 'Gemini' },
    { bot: 'Bytespider', allowed: true, platform: '豆包' },
  ];
  return withGeoWebContract(brand, 'crawlers', {
    audit: {
      reportType: 'crawlers',
      brandName: brand,
      totalScore: 65,
      summary: 'AI 爬虫访问矩阵（Mock）',
    },
    data: { botMatrix, robotsRisk: 'medium' },
    metrics: { allowedBots: 2, blockedBots: 1 },
    artifacts: [
      {
        id: 'robots-patch',
        type: 'robots_patch',
        name: 'robots.txt.patch',
        content: 'User-agent: Google-Extended\nAllow: /',
        riskLevel: 'medium',
        requiresHumanApproval: true,
      },
      ...buildDefaultArtifacts(brand, 'crawlers'),
    ],
  });
}

export function fixtureGeoContent(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  return withGeoWebContract(brand, 'content', {
    audit: {
      reportType: 'content',
      brandName: brand,
      totalScore: 58,
      summary: '内容 E-E-A-T 与可引用性（Mock）',
    },
    data: {
      rewriteBrief: '补充医生资质、案例数据与 FAQ 结构化段落',
      citabilityScore: 58,
      candidateTopics: ['种植牙价格', '隐形矫正流程'],
    },
    metrics: { eeatScore: 54, citabilityScore: 58 },
    findings: [
      {
        id: 'c1',
        level: 'high',
        title: '缺少权威背书',
        impact: 'AI 引用时难以判断内容可信度',
        suggestion: '补充执业资质与第三方认证引用',
      },
    ],
  });
}

export function fixtureGeoPlatformOptimizer(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const platforms = (input.platforms as string[]) ?? DEFAULT_PLATFORMS;
  const platformBriefs = platforms.map((p) => ({
    platform: p,
    recommendation: `${brand} 在 ${p} 补充 3 条问答型内容`,
    priority: 'P1',
  }));
  return withGeoWebContract(brand, 'platform_optimizer', {
    audit: {
      reportType: 'platform_optimizer',
      brandName: brand,
      totalScore: 60,
      summary: '平台专项优化 brief（Mock）',
    },
    data: { platformBriefs },
    metrics: { platformCoverage: Math.round((platformBriefs.length / platforms.length) * 100) },
  });
}

export function fixtureBrandExtract(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const url = String(input.brandUrl ?? input.websiteUrl ?? 'https://www.example-dental.com');
  const materials = Array.isArray(input.sourceMaterials) ? input.sourceMaterials : [];
  const socialMaterial = materials.find(
    (m): m is { value: string } => typeof m === 'object' && m !== null && 'value' in m
  );
  const social = socialMaterial ? String(socialMaterial.value) : '';
  return {
    source: 'mock_geo_fixture',
    profile: {
      name: brand,
      industry: String(input.industry ?? '口腔医疗'),
      city: String(input.brandCity ?? input.city ?? '南京'),
      website: url,
      description: String(
        input.brandDesc ??
          `${brand}专注种植牙、隐形矫正与儿童齿科，提供透明报价、儿童友好环境与复诊保障。`
      ),
      keywords: ['儿童齿科', '南京种植牙', '隐形矫正推荐', `${brand} 怎么样`],
      competitors: ['某连锁口腔 A', '某本地诊所 B'],
      socialLink: String(social),
      sourceMaterials: materials,
    },
  };
}

export function fixtureGeoAnalysis(input: Record<string, unknown>) {
  const brand = brandFromInput(input);
  const base = fixtureGeoQuickStart(input);
  return {
    ...base,
    source: 'mock_geo_fixture',
    audit: {
      ...base.audit,
      reportType: 'analysis',
      brandName: brand,
      summary: `${brand} GEO 分析完成（Mock）`,
    },
    data: {
      ...base.data,
      brandMentionSummary: `${brand} 在目标 AI 平台的可见度与竞品对比摘要（Mock）。`,
      optimizationSuggestions: '建议结合报告缺口生成投放方案与 GEO 文章补位。',
    },
  };
}

export function fixtureForGeoTaskType(type: string, input: Record<string, unknown>) {
  switch (type) {
    case 'geo_quick_start':
      return fixtureGeoQuickStart(input);
    case 'geo_audit':
      return fixtureGeoAudit(input);
    case 'geo_analysis':
      return fixtureGeoAnalysis(input);
    case 'brand_extract':
      return fixtureBrandExtract(input);
    case 'geo_schema':
      return withGeoWebContract(brandFromInput(input), 'schema', fixtureGeoSchema(input));
    case 'geo_llmstxt':
      return withGeoWebContract(brandFromInput(input), 'llmstxt', fixtureGeoLlmstxt(input));
    case 'geo_citability':
      return withGeoWebContract(brandFromInput(input), 'citability', fixtureGeoCitability(input));
    case 'geo_technical':
      return fixtureGeoTechnical(input);
    case 'geo_crawlers':
      return fixtureGeoCrawlers(input);
    case 'geo_content':
      return fixtureGeoContent(input);
    case 'geo_platform_optimizer':
      return fixtureGeoPlatformOptimizer(input);
    case 'geo_report_pdf':
      return fixtureGeoAudit({ ...input, modules: ['audit'] });
    case 'geo_compare':
      return {
        ...fixtureGeoAudit(input),
        audit: { ...fixtureGeoAudit(input).audit, reportType: 'compare', delta: { totalScore: +5 } },
      };
    default:
      return fixtureGeoAudit(input);
  }
}
