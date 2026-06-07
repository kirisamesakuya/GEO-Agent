/** 文章生成 Mock 输出（演示用，不依赖品牌 DB） */

export function mockArticleGenerationOutput(input: Record<string, unknown>) {
  const brand = String(input.brandName ?? input.brand ?? '云杉齿科');
  const platform = String(input.targetPlatform ?? '小红书');
  const direction = String(input.contentDirection ?? '种草');
  const tone = String(input.tone ?? '自然');
  const intensity = Number(input.marketingIntensity ?? 25);
  const quantity = Math.max(1, Math.min(5, Number(input.quantity ?? 3)));
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map(String).filter(Boolean)
    : ['儿童齿科', '南京种植牙'];
  const kw = keywords[0] ?? brand;

  const articles = Array.from({ length: quantity }).map((_, index) => {
    const n = index + 1;
    const title = `${brand} · ${platform}${direction}稿 ${n}`;
    const fullContent = [
      `# ${title}`,
      '',
      '> 基于品牌资料与知识库生成的 GEO 友好草稿（Mock 演示）',
      '',
      `## 用户常问：${kw}怎么选？`,
      `${brand}位于南京，主营口腔医疗相关服务。建议从资质、案例透明度与售后保障三个维度判断。`,
      '',
      `## 核心服务亮点`,
      '种植牙、隐形矫正、儿童齿科；支持透明报价与复诊保障。',
      '',
      `## FAQ`,
      `**Q：${brand}适合谁？**`,
      `A：有${kw}相关需求、希望获得可验证服务信息的用户。`,
      '',
      `## 发布前检查`,
      `- 语气：${tone}；营销强度 ${intensity}%`,
      '- 禁用词：未命中',
    ].join('\n');

    return {
      title,
      platform,
      previewText: `围绕「${kw}」的${direction}向 GEO 草稿，${tone}语气。`,
      fullContent,
      structure: '[标题 + 核心答案 + 服务亮点 + FAQ]',
      generationMeta: {
        sourceType: input.source ?? 'brand_profile',
        modelLabel: 'Mock AI（演示数据）',
        templateType: input.templateType ?? 'geo',
      },
    };
  });

  const qualityChecks = {
    forbiddenWords: { passed: true, hits: [] as string[] },
    factCoverage: { passed: true, missing: [] as string[] },
    geoCitability: { score: 72, suggestions: ['补充第三方背书链接', '增加 FAQ 结构化段落'] },
  };

  return {
    articles,
    qualityChecks,
    source: 'context_mock',
    model: 'Mock AI（演示数据）',
    geoReportId: input.geoReportId ?? null,
    knowledgeEntryCount: 3,
    effectVerification: input.effectVerificationEnabled ? { enabled: true, scheduleDays: [7, 14, 30] } : null,
  };
}
