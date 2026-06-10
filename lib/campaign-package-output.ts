/** 从任务 output（含 Hermes geo-campaign-plan-web）提取任务包列表 */
export function extractCampaignPackages(output: Record<string, unknown>): Array<Record<string, unknown>> {
  const nested = output.data;
  const plan = output.plan;
  const candidates: unknown[] = [
    output.packages,
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>).packages
      : undefined,
    plan && typeof plan === 'object' && !Array.isArray(plan)
      ? (plan as Record<string, unknown>).packages
      : undefined,
  ];
  for (const value of candidates) {
    if (Array.isArray(value) && value.length) {
      return value.filter((row) => row && typeof row === 'object') as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export type NormalizedCampaignPackage = {
  name: string;
  platform: string;
  payeeType: string;
  quantity: number;
  unitPrice?: number;
  budget: number;
  deliverable: string;
  acceptance: string;
};

/** 将 Mock / Hermes 任务包字段统一为发单草稿结构 */
export function normalizeCampaignPackage(raw: Record<string, unknown>): NormalizedCampaignPackage {
  const platforms = Array.isArray(raw.platforms) ? raw.platforms.map(String) : [];
  const platform = String(raw.platform ?? platforms[0] ?? '小红书');
  const budgetMin = Number(raw.budgetMin ?? 0);
  const budgetMax = Number(raw.budgetMax ?? 0);
  const budget = Number(
    raw.budget ?? (budgetMax > 0 ? budgetMax : budgetMin > 0 ? budgetMin : 1000)
  );
  const deliverables = Array.isArray(raw.deliverables)
    ? raw.deliverables.map(String).filter(Boolean).join('；')
    : '';
  const acceptanceCriteria = Array.isArray(raw.acceptanceCriteria)
    ? raw.acceptanceCriteria.map(String).filter(Boolean).join(' / ')
    : '';
  const quantity = Math.max(1, Number(raw.quantity ?? 1));

  return {
    name: String(raw.name ?? '任务包'),
    platform,
    payeeType: String(raw.payeeType ?? raw.providerName ?? raw.serviceType ?? '内容写手'),
    quantity,
    unitPrice: raw.unitPrice != null ? Number(raw.unitPrice) : undefined,
    budget,
    deliverable: String(raw.deliverable ?? deliverables ?? raw.message ?? '内容交付'),
    acceptance: String(raw.acceptance ?? acceptanceCriteria ?? '截图证明'),
  };
}
