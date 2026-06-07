import { prisma } from '../db/client.js';
import { appendLog, getAgentTask, updateAgentTask } from './agent-task.service.js';
import { confirmGeoAuditAction } from './geo-audit.service.js';

const MEDIUM_RISK_ASSET_TYPES = new Set(['geo_schema', 'geo_llmstxt', 'geo_citability']);

export function isMediumRiskAssetTaskType(type: string): boolean {
  return MEDIUM_RISK_ASSET_TYPES.has(type);
}

export function assetActionTypeForTask(type: string): string | null {
  const map: Record<string, string> = {
    geo_schema: 'generate_geo_schema',
    geo_llmstxt: 'generate_geo_llmstxt',
    geo_citability: 'generate_geo_citability',
  };
  return map[type] ?? null;
}

/** 创建资产生成任务前校验：必须携带 userConfirmedExecution */
export function validateAssetTaskSubmission(input: {
  type: string;
  input: Record<string, unknown>;
}): { ok: boolean; error?: string } {
  if (!isMediumRiskAssetTaskType(input.type)) return { ok: true };
  if (!input.input.userConfirmedExecution) {
    return { ok: false, error: '资产生成为中风险动作，请先确认后再提交' };
  }
  return { ok: true };
}

/** 用户确认 pending_confirm 任务，写入 GeoActionConfirmation 并推进到 waiting_local_device */
export async function confirmAgentTaskExecution(
  taskId: string,
  input?: { confirmedBy?: string; reportId?: string }
) {
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');
  if (task.status !== 'pending_confirm') {
    throw new Error('当前任务不需要确认');
  }

  const actionType = assetActionTypeForTask(task.type) ?? `execute_${task.type}`;
  const reportId =
    input?.reportId ??
    (typeof task.input.sourceReportId === 'string' ? task.input.sourceReportId : undefined);

  if (reportId) {
    await confirmGeoAuditAction(reportId, {
      actionType,
      riskLevel: 'medium',
      payload: { taskId, taskType: task.type },
      confirmedBy: input?.confirmedBy ?? 'merchant',
    });
  }

  const updated = await updateAgentTask(taskId, {
    status: 'waiting_local_device',
    reviewCategory: null,
    needsReview: false,
  });
  await appendLog(taskId, 'info', '用户已确认中风险动作，等待本机 Hermes 执行');
  return updated;
}

export async function hasGeoReportConfirmation(
  reportId: string,
  actionType: string
): Promise<boolean> {
  const row = await prisma.geoActionConfirmation.findFirst({
    where: { reportId, actionType },
    orderBy: { createdAt: 'desc' },
  });
  return Boolean(row?.confirmedAt);
}
