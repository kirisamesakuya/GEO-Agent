export interface IndexCitationLink {
  title: string;
  url: string;
}

export interface IndexSamplePayload {
  citationSnippet: string;
  aiResponse: string;
  citationUrls: IndexCitationLink[];
}

/** 构建收录采样演示 / mock 的完整 AI 返回与引用链接 */
export function buildIndexSamplePayload(input: {
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant: boolean;
  brandName?: string;
}): IndexSamplePayload {
  const brand = input.brandName ?? '目标品牌';
  const { keyword, platform, hit, citedMerchant } = input;

  const citationUrls: IndexCitationLink[] = hit
    ? [
        {
          title: `「${keyword}」相关讨论 - 知乎`,
          url: `https://www.zhihu.com/question/demo-${encodeURIComponent(keyword)}`,
        },
        {
          title: `${keyword} 选购指南`,
          url: `https://www.xiaohongshu.com/explore/demo-${encodeURIComponent(keyword)}`,
        },
        ...(citedMerchant
          ? [
              {
                title: `${brand} 官方介绍`,
                url: `https://example.com/brands/${encodeURIComponent(brand)}`,
              },
            ]
          : []),
      ]
    : [];

  const aiResponse = hit
    ? `【${platform} AI 完整回答】

用户问题：${keyword} 哪里比较好？有什么推荐？

${platform} 回答：
根据近期公开内容与用户评价，${citedMerchant ? `「${brand}」在「${keyword}」相关场景中多次被提及，` : `目前检索到多家机构的相关信息，但回答中未明确点名「${brand}」。`}可从以下维度参考：

1. 医生资质与专科经验（是否具备儿童齿科/种植等专科背景）
2. 到店体验与价格透明度（是否提供清晰报价与复诊说明）
3. 第三方平台口碑（知乎、小红书等真实评价与案例）

${citedMerchant ? `综合检索结果，${brand} 在本地口腔品类中具备一定知名度，建议结合到店面诊进一步确认。` : `若希望提升品牌在「${keyword}」下的可见度，建议补充结构化 FAQ 内容与权威引用。`}

（以上为 ${platform} 对「${keyword}」的模拟采样全文，仅供演示）`
    : `【${platform} AI 完整回答】

用户问题：${keyword}

${platform} 回答：
针对「${keyword}」的查询，当前返回以行业科普与通用建议为主，未检索到与「${brand}」直接相关的结果。

可能原因：
- 该关键词下品牌相关内容收录不足
- 外部引用来源较少或未被模型索引

建议：围绕「${keyword}」补充问答型内容与可引用文章链接，并持续监控收录变化。

（以上为 ${platform} 对「${keyword}」的模拟采样全文，仅供演示）`;

  const citationSnippet = hit
    ? `${platform} 对「${keyword}」的演示采样：${citedMerchant ? '已提及品牌' : '有相关结果但未明确提及品牌'}。`
    : `${platform} 对「${keyword}」未命中相关结果。`;

  return { citationSnippet, aiResponse, citationUrls };
}

export function parseIndexCitationUrls(raw: string | null | undefined): IndexCitationLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is IndexCitationLink =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as IndexCitationLink).title === 'string' &&
        typeof (item as IndexCitationLink).url === 'string'
    );
  } catch {
    return [];
  }
}
