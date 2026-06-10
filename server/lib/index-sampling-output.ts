export type IndexSamplingResultRow = {
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant?: boolean;
  citationSnippet?: string;
  aiResponse?: string;
  citationUrls?: Array<{ title: string; url: string }> | string;
  competitorMentions?: string[];
  status?: string;
  evidenceStatus?: string;
  sampledAt?: string;
  rank?: number | null;
  brandMentioned?: boolean;
  errorMessage?: string;
};

function coerceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeRow(raw: Record<string, unknown>): IndexSamplingResultRow | null {
  const keyword = String(raw.keyword ?? raw.prompt ?? '').trim();
  const platform = String(raw.platform ?? '').trim();
  if (!keyword || !platform) return null;

  const brandMentioned = raw.brandMentioned != null ? Boolean(raw.brandMentioned) : undefined;
  const citedMerchant = raw.citedMerchant != null ? Boolean(raw.citedMerchant) : undefined;
  const status = String(raw.status ?? 'sampled');
  const unavailable =
    status === 'unavailable' ||
    status === 'login_required' ||
    status === 'captcha' ||
    status === 'error';

  const hit = unavailable ? false : Boolean(raw.hit ?? brandMentioned ?? false);
  const statusLabel =
    status === 'login_required'
      ? '需在本机浏览器登录该平台后重试'
      : status === 'captcha'
        ? '人机验证阻断'
        : status === 'unavailable'
          ? '平台不可访问或无浏览器工具'
          : status === 'error'
            ? String(raw.errorMessage ?? '采样失败')
            : '';

  return {
    keyword,
    platform,
    hit,
    citedMerchant: citedMerchant ?? (hit && Boolean(brandMentioned)),
    citationSnippet:
      raw.citationSnippet != null
        ? String(raw.citationSnippet)
        : unavailable
          ? statusLabel
          : undefined,
    aiResponse: raw.aiResponse != null ? String(raw.aiResponse) : undefined,
    citationUrls: raw.citationUrls as IndexSamplingResultRow['citationUrls'],
    competitorMentions: Array.isArray(raw.competitorMentions)
      ? (raw.competitorMentions as unknown[]).map(String)
      : undefined,
    status,
    evidenceStatus: raw.evidenceStatus != null ? String(raw.evidenceStatus) : undefined,
    sampledAt: raw.sampledAt != null ? String(raw.sampledAt) : undefined,
    rank: raw.rank != null ? Number(raw.rank) : null,
    brandMentioned,
    errorMessage: raw.errorMessage != null ? String(raw.errorMessage) : undefined,
  };
}

/** 从 Hermes / 技能输出中提取 results 行（兼容顶层 results 与 data.results）。 */
export function extractIndexSamplingResults(
  output: Record<string, unknown>
): IndexSamplingResultRow[] | null {
  const top = output.results;
  if (Array.isArray(top) && top.length) {
    const rows = top
      .map((item) => normalizeRow(coerceRecord(item)))
      .filter((r): r is IndexSamplingResultRow => r != null);
    return rows.length ? rows : null;
  }

  const data = coerceRecord(output.data);
  const nested = data.results;
  if (Array.isArray(nested) && nested.length) {
    const rows = nested
      .map((item) => normalizeRow(coerceRecord(item)))
      .filter((r): r is IndexSamplingResultRow => r != null);
    return rows.length ? rows : null;
  }

  return null;
}

/** 归一化 Hermes 返回：保证顶层 results 与 metrics 可供落库与 UI 使用。 */
export function normalizeIndexSamplingOutput(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const results = extractIndexSamplingResults(raw) ?? [];
  const metrics = coerceRecord(raw.metrics);
  const samplingStatus =
    metrics.samplingStatus ??
    (results.some((r) => r.status && r.status !== 'sampled') ? 'partial' : 'complete');

  const hitCount = results.filter((r) => r.hit).length;
  const totalQueries = Number(metrics.totalQueries ?? results.length) || results.length;

  return {
    ...raw,
    results,
    metrics: {
      ...metrics,
      totalQueries,
      hitRate: totalQueries ? hitCount / totalQueries : 0,
      samplingStatus,
      samplingMethod: metrics.samplingMethod ?? 'hermes_browser',
    },
    data: {
      ...coerceRecord(raw.data),
      results,
    },
  };
}
