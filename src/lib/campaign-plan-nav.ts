import type { AgentTask } from '../types';

export function buildCampaignPlanNavigateHint(planId: string): string {
  return `plan:${planId}`;
}

export function parseCampaignPlanIdFromHint(hint?: string): string | undefined {
  if (hint?.startsWith('plan:')) return hint.slice(5);
  return undefined;
}

export function parseCampaignPlanIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('campaignPlanId');
}

function readGeoReportId(task: AgentTask): string | undefined {
  const output = task.output ?? {};
  const input = task.input ?? {};
  return (
    (output.geoReportId as string | undefined) ??
    (input.geoReportId as string | undefined) ??
    (input.geo_report_id as string | undefined)
  );
}

/** 从任务结果解析跳转发单页用的 hint（优先已有 CampaignPlan，其次 GEO 报告） */
export function resolveCampaignPlanNavigateHint(
  task: AgentTask,
  campaignPlanId?: string | null
): string {
  const output = task.output ?? {};
  const planId =
    campaignPlanId ??
    (output.campaignPlanId as string | undefined);
  if (planId) return buildCampaignPlanNavigateHint(planId);

  const geoReportId = readGeoReportId(task);
  if (geoReportId) return `geo:${geoReportId}`;

  return 'ai';
}
