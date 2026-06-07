/** 中风险资产生成动作类型 */
export const GEO_ASSET_ACTION_TYPES = {
  geo_schema: 'generate_geo_schema',
  geo_llmstxt: 'generate_geo_llmstxt',
  geo_citability: 'generate_geo_citability',
  geo_crawlers: 'generate_geo_crawlers',
  geo_content: 'generate_geo_content',
  geo_platform_optimizer: 'generate_geo_platform_optimizer',
} as const;

export const GEO_ASSET_RISK_LABELS: Record<string, { title: string; detail: string }> = {
  generate_geo_schema: {
    title: '确认生成 Schema JSON-LD',
    detail:
      '将在官网嵌入结构化数据。请确认门店名称、地址、服务项准确无误；错误 Schema 可能影响搜索引擎与 AI 对品牌的识别。',
  },
  generate_geo_llmstxt: {
    title: '确认生成 llms.txt',
    detail:
      '将生成供 AI 爬虫读取的站点说明文件。发布到网站根目录前，请核对链接与品牌描述是否最新、准确。',
  },
  generate_geo_citability: {
    title: '确认内容可引用性分析',
    detail:
      '将分析现有文案并给出改写建议。建议仅作为优化参考，发布前需人工审核，避免未经核实的数据对外发布。',
  },
  generate_geo_crawlers: {
    title: '确认 AI 爬虫访问检查',
    detail:
      '将检查 robots.txt 与 AI bot 访问策略，并可能生成 robots 补丁草稿。部署前请人工核对，避免误放行或误拦截爬虫。',
  },
  generate_geo_content: {
    title: '确认内容 E-E-A-T 分析',
    detail:
      '将基于页面正文输出可引用性改写 brief。结果需人工审核后再更新内容库或发布。',
  },
  generate_geo_platform_optimizer: {
    title: '确认平台专项优化 brief',
    detail:
      '将针对所选 AI 平台生成问答矩阵与优化建议。执行前请确认平台选择与品牌表述一致。',
  },
  generate_task_pack: {
    title: '确认生成整改任务包',
    detail:
      '将根据 GEO 报告中的问题与行动计划，自动生成投放/整改任务包草稿。发布到资源平台前请核对预算与交付要求。',
  },
  add_to_task_pack: {
    title: '确认加入任务包',
    detail: '将把当前资产草稿关联到整改任务包，便于外包落地执行。',
  },
};

export function assetActionTypeForTaskType(taskType: string): string | null {
  return GEO_ASSET_ACTION_TYPES[taskType as keyof typeof GEO_ASSET_ACTION_TYPES] ?? null;
}

export function extractAssetPreview(taskOutput: Record<string, unknown>): string {
  const asset = taskOutput.asset as { preview?: string; suggestions?: unknown[] } | undefined;
  if (asset?.preview) return asset.preview;
  if (asset?.suggestions) {
    return JSON.stringify({ suggestions: asset.suggestions }, null, 2);
  }
  const data = taskOutput.data as Record<string, unknown> | undefined;
  if (typeof data?.rewriteBrief === 'string') return data.rewriteBrief;
  if (data?.platformBriefs) {
    return JSON.stringify({ platformBriefs: data.platformBriefs }, null, 2);
  }
  if (data?.botMatrix) {
    return JSON.stringify({ botMatrix: data.botMatrix }, null, 2);
  }
  const artifacts = taskOutput.artifacts as Array<{ preview?: string; content?: string; type?: string }> | undefined;
  const robotsPatch = artifacts?.find((a) => a.type === 'robots_patch');
  if (robotsPatch?.content) return robotsPatch.content;
  const first = artifacts?.find((a) => a.preview || a.content);
  return first?.preview ?? first?.content ?? '';
}
