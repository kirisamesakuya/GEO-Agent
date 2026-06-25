import { prisma } from '../db/client.js';
import { getAgentTaskStats } from './agent-task.service.js';
import { getPlatformStats, appendAuditLog } from './audit.service.js';
import { checkHermesHealth } from '../agent/executors/index.js';
import { listDepositRequests, getBudgetAccount } from './budget.service.js';
import { getAiCredits } from './ai-credits.service.js';
import { checkBrandCompleteness, mapBrand } from './brand.service.js';
import { createProviderNotification } from './notification.service.js';
import { refreshSkillRoutesFromDb } from '../lib/agent-skill.js';
import { ROLE_PERMISSIONS, PLATFORM_ROLE_LABELS, type PlatformRole } from '../lib/platform-auth.js';
import { assertQuoteBypassAllowed } from '../../lib/quote-order.js';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function pctOf(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

async function sumCompletedGmvBetween(since: Date, until?: Date) {
  const r = await prisma.taskOrder.aggregate({
    where: {
      status: 'completed',
      updatedAt: { gte: since, ...(until ? { lt: until } : {}) },
    },
    _sum: { budget: true },
  });
  return r._sum.budget ?? 0;
}

async function countAgentSuccessRateBetween(since: Date, until?: Date) {
  const where = { createdAt: { gte: since, ...(until ? { lt: until } : {}) } };
  const [total, failed] = await Promise.all([
    prisma.agentTask.count({ where }),
    prisma.agentTask.count({ where: { ...where, status: 'failed' } }),
  ]);
  if (total === 0) return null;
  return Math.round(((total - failed) / total) * 1000) / 10;
}

async function countPublishFailedBetween(since: Date, until?: Date) {
  return prisma.agentTask.count({
    where: {
      type: 'hermes_publish',
      status: { in: ['failed', 'partial'] },
      updatedAt: { gte: since, ...(until ? { lt: until } : {}) },
    },
  });
}

async function countRiskEventsBetween(since: Date, until?: Date) {
  const range = { gte: since, ...(until ? { lt: until } : {}) };
  const [disputed, revision, failedAgent, pendingDeposits] = await Promise.all([
    prisma.taskOrder.count({ where: { status: 'disputed', updatedAt: range } }),
    prisma.taskOrder.count({ where: { status: 'revision', updatedAt: range } }),
    prisma.agentTask.count({ where: { status: 'failed', updatedAt: range } }),
    prisma.budgetDepositRequest.count({ where: { status: 'pending', createdAt: range } }),
  ]);
  return disputed + revision + failedAgent + pendingDeposits;
}

async function buildPlatformCockpit(agent: Awaited<ReturnType<typeof getAgentTaskStats>>, hermesOk: boolean) {
  const now = new Date();
  const today = startOfDay(now);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 86400000);

  const [
    orderPublished,
    orderPublishedUnassigned,
    orderInProgress,
    orderDraftStages,
    orderPendingReview,
    orderRevision,
    orderDisputed,
    orderCompleted,
    orderTotal,
    gmvTotal,
    publishFailedTotal,
    providerGroups,
    websitePending,
    settledCount,
    gmvRecent,
    gmvPrev,
    successRecent,
    successPrev,
    publishFailedRecent,
    publishFailedPrev,
    riskRecent,
    riskPrev,
    orderCompletedRecent,
    orderCompletedPrev,
  ] = await Promise.all([
    prisma.taskOrder.count({ where: { status: 'published' } }),
    prisma.taskOrder.count({ where: { status: 'published', providerId: null } }),
    prisma.taskOrder.count({ where: { status: 'in_progress' } }),
    prisma.taskOrder.count({
      where: { status: { in: ['draft_review', 'draft_revision', 'draft_approved'] } },
    }),
    prisma.taskOrder.count({ where: { status: 'pending_review' } }),
    prisma.taskOrder.count({ where: { status: 'revision' } }),
    prisma.taskOrder.count({ where: { status: 'disputed' } }),
    prisma.taskOrder.count({ where: { status: 'completed' } }),
    prisma.taskOrder.count(),
    prisma.taskOrder.aggregate({ where: { status: 'completed' }, _sum: { budget: true } }),
    prisma.agentTask.count({
      where: { type: 'hermes_publish', status: { in: ['failed', 'partial'] } },
    }),
    prisma.taskOrder.groupBy({
      by: ['providerName'],
      where: { providerName: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.websiteRequest.count({ where: { status: { in: ['draft', 'preview_ready'] } } }),
    prisma.settlementRecord.count({ where: { status: 'settled' } }),
    sumCompletedGmvBetween(sevenDaysAgo),
    sumCompletedGmvBetween(fourteenDaysAgo, sevenDaysAgo),
    countAgentSuccessRateBetween(sevenDaysAgo),
    countAgentSuccessRateBetween(fourteenDaysAgo, sevenDaysAgo),
    countPublishFailedBetween(sevenDaysAgo),
    countPublishFailedBetween(fourteenDaysAgo, sevenDaysAgo),
    countRiskEventsBetween(sevenDaysAgo),
    countRiskEventsBetween(fourteenDaysAgo, sevenDaysAgo),
    prisma.taskOrder.count({ where: { status: 'completed', updatedAt: { gte: sevenDaysAgo } } }),
    prisma.taskOrder.count({
      where: { status: 'completed', updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    }),
  ]);

  const gmv = gmvTotal._sum.budget ?? 0;
  const completionRate = pctOf(orderCompleted, orderTotal);
  const completionRecent = pctOf(orderCompletedRecent, Math.max(orderTotal, 1));
  const completionPrev = pctOf(orderCompletedPrev, Math.max(orderTotal, 1));
  const agentSuccessRate =
    agent.total > 0 ? Math.round(((agent.succeeded) / agent.total) * 1000) / 10 : 0;
  const riskEvents =
    orderDisputed + orderRevision + orderPendingReview + publishFailedTotal + agent.failed;

  const agentDelayed = agent.running + agent.queued + agent.partial;
  const agentNormal = agent.succeeded;
  const agentFailed = agent.failed;
  const agentHealthTotal = agent.total;

  const funnelMax = Math.max(orderPublishedUnassigned, orderInProgress + orderDraftStages, orderPendingReview, orderCompleted, 1);
  const funnel = [
    { label: '待派单', value: orderPublishedUnassigned, pct: pctOf(orderPublishedUnassigned, funnelMax) },
    { label: '执行中', value: orderInProgress + orderDraftStages, pct: pctOf(orderInProgress + orderDraftStages, funnelMax) },
    { label: '待验收', value: orderPendingReview, pct: pctOf(orderPendingReview, funnelMax) },
    { label: '已完成', value: orderCompleted, pct: pctOf(orderCompleted, funnelMax) },
  ];

  const fulfillmentActive = orderInProgress + orderDraftStages + orderPendingReview + orderRevision;
  const fulfillmentDelayed = orderPendingReview + orderRevision + orderDisputed;

  const riskHeatmap: Array<{ label: string; cells: number[] }> = [];
  for (const [rowIndex, label] of (['高风险', '中风险', '低风险'] as const).entries()) {
    const cells: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 86400000);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const range = { gte: dayStart, lt: dayEnd };
      let intensity = 0;
      if (rowIndex === 0) {
        intensity = Math.min(4, await prisma.taskOrder.count({ where: { status: 'disputed', updatedAt: range } }));
      } else if (rowIndex === 1) {
        const [rev, failed] = await Promise.all([
          prisma.taskOrder.count({ where: { status: 'revision', updatedAt: range } }),
          prisma.agentTask.count({ where: { status: 'failed', updatedAt: range } }),
        ]);
        intensity = Math.min(4, rev + failed);
      } else {
        intensity = Math.min(4, await prisma.taskOrder.count({ where: { status: 'pending_review', updatedAt: range } }));
      }
      cells.push(intensity);
    }
    riskHeatmap.push({ label, cells });
  }

  const agentHealthSegments = [
    { label: '正常', value: agentNormal, pct: pctOf(agentNormal, agentHealthTotal), color: '#2fd1a0' },
    { label: '延迟', value: agentDelayed, pct: pctOf(agentDelayed, agentHealthTotal), color: '#ff9f1c' },
    { label: '失败', value: agentFailed, pct: pctOf(agentFailed, agentHealthTotal), color: '#ff4757' },
  ];

  return {
    kpis: {
      gmv: { value: gmv, delta: pctDelta(gmvRecent, gmvPrev) },
      completionRate: { value: completionRate, delta: pctDelta(completionRecent, completionPrev) },
      agentSuccessRate: {
        value: agentSuccessRate,
        delta: successRecent != null && successPrev != null ? pctDelta(successRecent, successPrev) : null,
      },
      publishFailed: { value: publishFailedTotal, delta: pctDelta(publishFailedRecent, publishFailedPrev) },
      riskEvents: { value: riskEvents, delta: pctDelta(riskRecent, riskPrev) },
    },
    pipeline: [
      {
        id: 'merchant',
        title: '商家发布',
        value: orderPublished + websitePending,
        note: '新增需求',
        status: orderPublishedUnassigned > 0 ? '待派单' : '正常',
        statusKind: orderPublishedUnassigned > 5 ? 'warn' : 'normal',
      },
      {
        id: 'agent',
        title: 'Agent 执行',
        value: agentDelayed + agentNormal,
        note: '执行中',
        status: !hermesOk ? '延迟' : agentDelayed > 0 ? `延迟 ${agentDelayed}` : '正常',
        statusKind: !hermesOk || agentDelayed > 0 ? 'warn' : 'normal',
      },
      {
        id: 'fulfillment',
        title: '接单方履约',
        value: fulfillmentActive,
        note: '履约中',
        status: fulfillmentDelayed > 0 ? `延迟 ${fulfillmentDelayed}` : '正常',
        statusKind: fulfillmentDelayed > 0 ? 'warn' : 'normal',
      },
      {
        id: 'settlement',
        title: '结算完成',
        value: settledCount || orderCompleted,
        note: '已完成',
        status: '正常',
        statusKind: 'normal',
      },
    ],
    funnel,
    agentHealth: { total: agentHealthTotal, segments: agentHealthSegments },
    riskHeatmap,
    highlights: [
      { title: '争议订单待处理', value: orderDisputed, view: 'orders', kind: 'danger' },
      { title: '发布失败待处理', value: publishFailedTotal, view: 'content_governance', kind: 'warning' },
      { title: '待验收订单', value: orderPendingReview, view: 'orders', kind: 'primary' },
    ],
    providerRanking: providerGroups
      .filter((g) => g.providerName)
      .map((g) => ({ name: g.providerName as string, value: g._count.id })),
  };
}

export async function getPlatformDashboard() {
  const [
    platform,
    agent,
    hermes,
    pendingDeposits,
    pendingApplications,
    failedTasks,
    pendingReviewOrders,
    revisionOrders,
    disputedOrders,
    pendingOrgCerts,
    pendingWithdrawals,
  ] = await Promise.all([
    getPlatformStats(),
    getAgentTaskStats(),
    checkHermesHealth(),
    listDepositRequests(undefined, 'pending'),
    prisma.provider.count({ where: { applicationStatus: 'submitted' } }),
    prisma.agentTask.count({ where: { status: 'failed' } }),
    prisma.taskOrder.count({ where: { status: 'pending_review' } }),
    prisma.taskOrder.count({ where: { status: 'revision' } }),
    prisma.taskOrder.count({ where: { status: 'disputed' } }),
    prisma.organization.count({ where: { certStatus: 'pending' } }),
    prisma.providerWithdrawalRequest.count({
      where: { status: { in: ['pending', 'approved'] } },
    }),
  ]);

  const todos: Array<{ id: string; label: string; priority: string; type: string; count: number }> = [];

  if (pendingApplications > 0) {
    todos.push({
      id: 'provider-review',
      label: '入驻待审核',
      priority: 'P0',
      type: 'provider_applications',
      count: pendingApplications,
    });
  }
  if (failedTasks > 0) {
    todos.push({
      id: 'agent-failed',
      label: 'Agent 任务失败',
      priority: 'P0',
      type: 'agent_tasks',
      count: failedTasks,
    });
  }
  if (pendingReviewOrders > 0) {
    todos.push({
      id: 'order-review',
      label: '订单待验收',
      priority: 'P1',
      type: 'orders',
      count: pendingReviewOrders,
    });
  }
  if (pendingDeposits.length > 0) {
    todos.push({
      id: 'deposit-review',
      label: '入账待审核',
      priority: 'P1',
      type: 'funds',
      count: pendingDeposits.length,
    });
  }
  if (revisionOrders > 0) {
    todos.push({
      id: 'order-revision',
      label: '返修待处理',
      priority: 'P1',
      type: 'orders',
      count: revisionOrders,
    });
  }
  if (disputedOrders > 0) {
    todos.push({
      id: 'order-disputed',
      label: '争议订单',
      priority: 'P0',
      type: 'orders',
      count: disputedOrders,
    });
  }
  if (pendingOrgCerts > 0) {
    todos.push({
      id: 'org-cert',
      label: '企业认证待审',
      priority: 'P1',
      type: 'org_certs',
      count: pendingOrgCerts,
    });
  }
  if (pendingWithdrawals > 0) {
    todos.push({
      id: 'withdrawal-review',
      label: '提现待处理',
      priority: 'P1',
      type: 'funds',
      count: pendingWithdrawals,
    });
  }
  const [riskOrders, cockpit] = await Promise.all([
    prisma.taskOrder.findMany({
      where: { status: { in: ['revision', 'pending_review', 'disputed'] } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    buildPlatformCockpit(agent, hermes.ok !== false),
  ]);

  return {
    platform,
    agent,
    hermes,
    todos,
    riskOrders,
    cockpit,
    metrics: {
      pendingApplications,
      failedTasks,
      pendingReviewOrders,
      revisionOrders,
      disputedOrders,
    },
  };
}

export async function listPendingProviderApplications() {
  return prisma.provider.findMany({
    where: { applicationStatus: 'submitted' },
    include: {
      applications: { orderBy: { createdAt: 'desc' }, take: 1 },
      reviewLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getTaskOrderReassignPreview(orderId: string) {
  const order = await prisma.taskOrder.findUnique({
    where: { id: orderId },
    include: { deliveries: true, revisions: true, assignments: { where: { active: true } } },
  });
  if (!order) return null;
  return {
    orderId: order.id,
    title: order.title,
    status: order.status,
    currentProviderId: order.providerId,
    currentProviderName: order.providerName,
    deliveryCount: order.deliveries.length,
    openRevisions: order.revisions.filter((r) => r.status === 'open').length,
    riskHints: [
      ...(order.deliveries.length > 0 ? ['已有交付记录，改派后新接单方需继续履约'] : []),
      ...(order.status === 'pending_review' ? ['订单待验收，改派可能影响商家验收'] : []),
      ...(order.status === 'disputed' ? ['争议订单：线下沟通后可通过改派或释放登记处理结果'] : []),
    ],
  };
}

export async function assignTaskOrder(
  orderId: string,
  providerId: string,
  providerName: string,
  reason?: string
) {
  const existing = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error('订单不存在');
  assertQuoteBypassAllowed(existing, 'assignTaskOrder');

  await prisma.providerOrderAssignment.updateMany({
    where: { orderId, active: true },
    data: { active: false },
  });
  await prisma.providerOrderAssignment.create({
    data: { orderId, providerId, providerName, reason, active: true },
  });

  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'in_progress', providerId, providerName },
  });

  await appendAuditLog({
    action: 'platform_order_assign',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${providerId}:${reason ?? ''}`,
    source: 'platform',
  });

  await createProviderNotification({
    providerId,
    type: 'assignment',
    title: '平台已派单',
    body: order.title,
    refId: orderId,
  });

  return order;
}

export async function reassignTaskOrder(
  orderId: string,
  providerId: string,
  providerName: string,
  reason: string
) {
  if (!reason.trim()) throw new Error('改派必须填写原因');

  const existing = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error('订单不存在');
  assertQuoteBypassAllowed(existing, 'reassignTaskOrder');
  if (!existing.providerId) throw new Error('订单尚未派单，请使用人工派单');
  if (existing.providerId === providerId) throw new Error('新接单方与当前相同');
  const previousProviderId = existing.providerId;
  const previousProviderName = existing.providerName;

  await prisma.providerOrderAssignment.updateMany({
    where: { orderId, active: true },
    data: { active: false },
  });
  await prisma.providerOrderAssignment.create({
    data: { orderId, providerId, providerName, reason: `改派: ${reason}`, active: true },
  });

  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: {
      providerId,
      providerName,
      status:
        existing.status === 'published' || existing.status === 'disputed'
          ? 'in_progress'
          : existing.status,
    },
  });

  await appendAuditLog({
    action: 'platform_order_reassign',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${previousProviderId}→${providerId}:${reason}`,
    source: 'platform',
  });

  await createProviderNotification({
    providerId,
    type: 'assignment',
    title: '订单已改派给您',
    body: `${order.title}（${reason}）`,
    refId: orderId,
  });

  return { order, previousProviderId, previousProviderName };
}

const RELEASE_BLOCKED_STATUSES = new Set(['completed', 'published']);

/** 平台将已指派订单释放回任务大厅，供接单方重新领取 */
export async function releaseTaskOrderToMarketplace(orderId: string, reason: string) {
  if (!reason.trim()) throw new Error('释放必须填写原因');

  const existing = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error('订单不存在');
  if (!existing.providerId) throw new Error('订单未指派接单方，已在任务大厅');
  if (RELEASE_BLOCKED_STATUSES.has(existing.status)) {
    if (existing.status === 'completed') throw new Error('已完成订单不可释放');
    throw new Error('订单已在任务大厅');
  }

  const previousProviderId = existing.providerId;
  const previousProviderName = existing.providerName;

  await prisma.providerOrderAssignment.updateMany({
    where: { orderId, active: true },
    data: { active: false, reason: `释放回大厅: ${reason.trim()}` },
  });

  await prisma.taskOrderApplication.updateMany({
    where: { orderId, status: { in: ['accepted', 'pending'] } },
    data: { status: 'rejected' },
  });

  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: {
      status: 'published',
      providerId: null,
      providerName: null,
    },
  });

  await appendAuditLog({
    action: 'platform_order_release',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${previousProviderId}:${reason.trim()}`,
    source: 'platform',
  });

  await createProviderNotification({
    providerId: previousProviderId,
    type: 'assignment',
    title: '订单已释放回任务大厅',
    body: `${existing.title}（${reason.trim()}）`,
    refId: orderId,
  });

  return { order, previousProviderId, previousProviderName };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  reason: string
) {
  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status },
  });

  const { appendAuditLog } = await import('./audit.service.js');
  await appendAuditLog({
    action: 'platform_order_status_change',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${status}:${reason}`,
  });

  return order;
}

export async function resolveDispute(orderId: string, conclusion: string) {
  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');

  const updated = await updateOrderStatus(orderId, 'completed', `争议结案: ${conclusion}`);

  if (order.status === 'disputed') {
    const { releaseBudget } = await import('./budget.service.js');
    await releaseBudget(order.brandName, order.budget, orderId);
  }

  return updated;
}

export async function listAgentSkillRuns(limit = 50) {
  return prisma.agentSkillRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function recordAgentSkillRun(input: {
  taskId?: string;
  skillName: string;
  executor?: string;
  status: string;
  inputSummary?: string;
  outputSummary?: string;
  durationMs?: number;
  needsReview?: boolean;
}) {
  return prisma.agentSkillRun.create({ data: input });
}

export async function recordLocalAutomationRun(input: {
  taskId?: string;
  environment?: string;
  hostName?: string;
  automationType?: string;
  status: string;
  inputSummary?: string;
  outputSummary?: string;
  evidenceUrl?: string;
  errorMessage?: string;
}) {
  return prisma.localAutomationRun.create({
    data: {
      environment: input.environment ?? 'macos-local',
      hostName: input.hostName ?? process.env.HOSTNAME ?? 'dev',
      ...input,
    },
  });
}

export async function listLocalAutomationRuns(limit = 50) {
  return prisma.localAutomationRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export type AgentReviewCategory = 'need_reauth' | 'need_manual_publish' | 'retry_ok' | null;

export async function flagAgentTaskForReview(
  taskId: string,
  reason: string,
  category?: AgentReviewCategory
) {
  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      needsReview: true,
      reviewCategory: category ?? null,
    },
  });
  await appendAuditLog({
    action: 'agent_task_manual_flag',
    entity: 'AgentTask',
    entityId: taskId,
    detail: `${category ?? 'general'}:${reason}`,
    source: 'platform',
  });
}

export async function listAllBudgetLedgers(limit = 100) {
  const { listPlatformBudgetLedgers } = await import('./budget.service.js');
  return listPlatformBudgetLedgers({ limit });
}

export async function listAllAiCredits() {
  return prisma.aiCredits.findMany({ orderBy: { brandName: 'asc' } });
}

export async function listPendingOrderApplications(filters?: {
  platform?: string;
  providerName?: string;
  page?: number;
  pageSize?: number;
}) {
  const rows = await prisma.taskOrderApplication.findMany({
    where: { status: 'pending' },
    include: { order: true, provider: true },
    orderBy: { createdAt: 'desc' },
  });
  const filtered = rows.filter((a) => {
    if (filters?.platform && a.order.platform !== filters.platform) return false;
    if (filters?.providerName && !a.providerName.includes(filters.providerName)) return false;
    return true;
  });

  if (filters?.page !== undefined || filters?.pageSize !== undefined) {
    const { paginatedResult, parsePagination } = await import('../lib/pagination.js');
    const { page, pageSize, skip, take } = parsePagination(
      { page: String(filters.page ?? 1), pageSize: String(filters.pageSize ?? 20) },
      20
    );
    const slice = filtered.slice(skip, skip + take);
    const result = paginatedResult(slice, filtered.length, page, pageSize);
    return {
      applications: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    };
  }

  return filtered;
}

export async function getSystemConfigs() {
  const rows = await prisma.systemConfig.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

const SENSITIVE_CONFIG_KEYS = new Set([
  'skill_routes',
  'budget_rules',
  'model_config',
  'hermes_executor_default',
]);

export async function upsertSystemConfig(key: string, value: string, reason?: string) {
  if (SENSITIVE_CONFIG_KEYS.has(key) && !reason?.trim()) {
    throw new Error('敏感配置变更需填写原因');
  }

  const prev = await prisma.systemConfig.findUnique({ where: { key } });
  const config = await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  await prisma.systemConfigVersion.create({
    data: { key, value, reason: reason ?? null },
  });

  await appendAuditLog({
    action: 'system_config_update',
    entity: 'SystemConfig',
    entityId: key,
    detail: reason ?? (prev ? '更新' : '新建'),
    source: 'platform',
  });

  if (key === 'skill_routes') {
    await refreshSkillRoutesFromDb();
  }

  return config;
}

export async function listSystemConfigVersions(key: string, limit = 20) {
  return prisma.systemConfigVersion.findMany({
    where: { key },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listPlatformMerchants() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      organization: { select: { id: true, name: true, certStatus: true } },
    },
  });
  return brands.map((b) => {
    const profile = mapBrand(b);
    const completeness = checkBrandCompleteness(profile);
    return {
      id: b.id,
      name: b.name,
      website: b.website,
      industry: b.industry,
      city: b.city,
      ownerName: b.ownerName,
      storeCount: b.storeCount,
      status: b.status,
      profileComplete: completeness.complete,
      missingFields: completeness.missing,
      organizationName: b.organization?.name ?? null,
      certStatus: b.organization?.certStatus ?? null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  });
}

export async function setMerchantStatus(brandName: string, status: 'active' | 'disabled', reason: string) {
  const brand = await prisma.brand.findFirst({ where: { name: brandName } });
  if (!brand) throw new Error('商家不存在');
  const updated = await prisma.brand.update({
    where: { id: brand.id },
    data: { status },
  });
  await appendAuditLog({
    action: status === 'disabled' ? 'merchant_disable' : 'merchant_enable',
    entity: 'Brand',
    entityId: brand.id,
    detail: reason,
    source: 'platform',
  });
  return updated;
}

export async function listPlatformProviderIdentities(options?: {
  status?: 'verified' | 'unverified';
  providerName?: string;
  realName?: string;
}) {
  const providers = await prisma.provider.findMany({
    where: {
      applicationStatus: 'approved',
      ...(options?.providerName?.trim()
        ? { name: { contains: options.providerName.trim(), mode: 'insensitive' } }
        : {}),
      ...(options?.realName?.trim()
        ? { identityRealName: { contains: options.realName.trim(), mode: 'insensitive' } }
        : {}),
      ...(options?.status === 'verified' ? { identityVerifiedAt: { not: null } } : {}),
      ...(options?.status === 'unverified' ? { identityVerifiedAt: null } : {}),
    },
    orderBy: [{ identityVerifiedAt: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      contactName: true,
      phone: true,
      identityRealName: true,
      identityIdNumberMask: true,
      identityVerifiedAt: true,
      payoutChannel: true,
      payoutAccountName: true,
      payoutAccountLabel: true,
      updatedAt: true,
    },
  });

  return providers.map((p) => {
    const hasPayoutAccount = Boolean(p.payoutAccountLabel?.trim());
    const identityVerified = Boolean(p.identityVerifiedAt);
    const nameMatch =
      identityVerified && p.identityRealName && p.payoutAccountName
        ? p.identityRealName === p.payoutAccountName
        : null;
    return {
      providerId: p.id,
      providerName: p.name,
      contactName: p.contactName,
      phone: p.phone,
      identityVerified,
      identityRealName: p.identityRealName,
      identityIdNumberMask: p.identityIdNumberMask,
      identityVerifiedAt: p.identityVerifiedAt,
      payoutChannel: p.payoutChannel,
      payoutAccountName: p.payoutAccountName,
      payoutAccountLabel: p.payoutAccountLabel,
      hasPayoutAccount,
      nameMatch,
      updatedAt: p.updatedAt,
    };
  });
}

export async function getMerchantDetail(brandName: string) {
  const brand = await prisma.brand.findFirst({
    where: { name: brandName },
    include: { organization: true },
  });
  if (!brand) return null;
  const profile = mapBrand(brand);
  const [taskCount, orderCount, websiteOrderCount, customPlatformCount] = await Promise.all([
    prisma.agentTask.count({ where: { brandName } }),
    prisma.taskOrder.count({ where: { brandName } }),
    prisma.websiteOrder.count({ where: { brandName } }),
    Promise.resolve(
      (() => {
        try {
          const parsed = JSON.parse(brand.customPublishPlatforms || '[]') as unknown[];
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          return 0;
        }
      })()
    ),
  ]);
  return {
    profile,
    organization: brand.organization
      ? {
          id: brand.organization.id,
          name: brand.organization.name,
          legalName: brand.organization.legalName,
          certStatus: brand.organization.certStatus,
          contactName: brand.organization.contactName,
          contactPhone: brand.organization.contactPhone,
        }
      : null,
    profileCompleteness: checkBrandCompleteness(profile),
    sourceMaterialCount: profile.sourceMaterials?.length ?? 0,
    customPlatformCount,
    activitySummary: { taskCount, orderCount, websiteOrderCount },
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

function parseProviderCapabilities(capabilitiesJson?: string | null, platformsJson?: string | null) {
  type Cap = {
    id: string;
    platform: string;
    reviewStatus: 'pending' | 'approved' | 'rejected';
    reviewNote?: string;
    reviewedAt?: string;
    declaredAt?: string;
  };

  const normalize = (
    raw: { id?: string; platform?: string; reviewStatus?: string; reviewNote?: string; reviewedAt?: string; declaredAt?: string },
    index: number
  ): Cap => {
    const reviewStatus =
      raw.reviewStatus === 'approved' || raw.reviewStatus === 'rejected' ? raw.reviewStatus : 'pending';
    return {
      id: raw.id ?? `cap-${index}`,
      platform: String(raw.platform ?? ''),
      reviewStatus,
      reviewNote: raw.reviewNote,
      reviewedAt: raw.reviewedAt,
      declaredAt: raw.declaredAt,
    };
  };

  const fromPlatformList = (platforms: string[]) =>
    platforms.filter(Boolean).map((platform, i) => normalize({ id: `legacy-${i}`, platform, reviewStatus: 'pending' }, i));

  try {
    const cap = JSON.parse(capabilitiesJson ?? '[]') as unknown;
    if (Array.isArray(cap) && cap.length > 0) {
      if (typeof cap[0] === 'object' && cap[0] !== null && 'platform' in cap[0]) {
        return (cap as Array<Record<string, unknown>>).map((a, i) => normalize(a as Cap, i));
      }
    }
  } catch {
    /* legacy */
  }

  try {
    const platforms = JSON.parse(platformsJson ?? '[]') as string[];
    if (Array.isArray(platforms) && platforms.length > 0) {
      return fromPlatformList(platforms);
    }
  } catch {
    /* empty */
  }

  try {
    const cap = JSON.parse(capabilitiesJson ?? '[]') as unknown;
    if (Array.isArray(cap) && cap.length > 0 && typeof cap[0] === 'string') {
      return fromPlatformList(cap as string[]);
    }
  } catch {
    /* empty */
  }

  return [];
}

function capabilityStatusLabel(status: 'pending' | 'approved' | 'rejected'): string {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return '待审核';
}

function serializeProviderCapabilities(
  caps: ReturnType<typeof parseProviderCapabilities>
): string {
  return JSON.stringify(
    caps.map((c) => ({
      id: c.id,
      platform: c.platform,
      reviewStatus: c.reviewStatus,
      reviewNote: c.reviewNote ?? undefined,
      reviewedAt: c.reviewedAt ?? undefined,
      declaredAt: c.declaredAt ?? undefined,
    }))
  );
}

export async function reviewProviderPlatformResource(input: {
  providerId: string;
  platform: string;
  action: 'approve' | 'reject' | 'reset';
  note?: string;
}) {
  const provider = await prisma.provider.findUnique({ where: { id: input.providerId } });
  if (!provider) throw new Error('接单方不存在');

  const caps = parseProviderCapabilities(provider.capabilities, provider.platforms);
  const idx = caps.findIndex((c) => c.platform === input.platform);
  if (idx < 0) throw new Error('未找到该可接单平台声明');

  const nextStatus =
    input.action === 'approve' ? 'approved' : input.action === 'reject' ? 'rejected' : 'pending';
  caps[idx] = {
    ...caps[idx],
    reviewStatus: nextStatus,
    reviewNote: input.action === 'reset' ? undefined : input.note?.trim() || undefined,
    reviewedAt: input.action === 'reset' ? undefined : new Date().toISOString(),
  };

  const updated = await prisma.provider.update({
    where: { id: input.providerId },
    data: { capabilities: serializeProviderCapabilities(caps) },
  });

  const logAction =
    input.action === 'approve'
      ? 'resource_approve'
      : input.action === 'reject'
        ? 'resource_reject'
        : 'resource_reset';
  await prisma.providerReviewLog.create({
    data: {
      providerId: input.providerId,
      action: logAction,
      note: [input.platform, input.note].filter(Boolean).join(' · '),
    },
  });

  await appendAuditLog({
    action: `provider_resource_${input.action}`,
    entity: 'Provider',
    entityId: input.providerId,
    detail: `${input.platform}${input.note ? `: ${input.note}` : ''}`,
  });

  if (input.action !== 'reset') {
    const { createProviderNotification } = await import('./notification.service.js');
    await createProviderNotification({
      providerId: input.providerId,
      type: 'resource',
      title: input.action === 'approve' ? '可接单平台已通过' : '可接单平台未通过',
      body:
        input.note?.trim() ||
        (input.action === 'approve'
          ? `您申报的「${input.platform}」可接单能力已审核通过，可在任务大厅领取相关任务。`
          : `您申报的「${input.platform}」未通过审核，可在账号资源中调整后重新申报。`),
      refId: input.platform,
    });
  }

  return updated;
}

export async function listPlatformContentGovernance(filters?: {
  brandName?: string;
  platform?: string;
  status?: string;
  tab?: string;
}) {
  const brandWhere = filters?.brandName ? { name: filters.brandName } : {};
  const brands = await prisma.brand.findMany({ where: brandWhere, select: { id: true, name: true } });
  const brandIds = brands.map((b) => b.id);
  const brandById = new Map(brands.map((b) => [b.id, b.name]));

  const recordWhere: Record<string, unknown> = {};
  if (brandIds.length) recordWhere.brandId = { in: brandIds };
  if (filters?.platform) recordWhere.platform = filters.platform;
  if (filters?.status) recordWhere.status = filters.status;
  else if (filters?.tab === 'failed') recordWhere.status = 'failed';
  else if (filters?.tab === 'published') recordWhere.status = 'published';
  else if (filters?.tab === 'publishing') recordWhere.status = { in: ['pending', 'running'] };

  const records = await prisma.publishRecord.findMany({
    where: recordWhere,
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  const contentIds = records.map((r) => r.contentItemId).filter((id): id is string => Boolean(id));
  const items = contentIds.length
    ? await prisma.contentItem.findMany({
        where: { id: { in: contentIds } },
        select: {
          id: true,
          title: true,
          platform: true,
          previewText: true,
          qualityChecksJson: true,
          publishStatus: true,
          status: true,
        },
      })
    : [];
  const itemById = new Map(items.map((i) => [i.id, i]));

  const stats = {
    library: await prisma.contentItem.count(),
    pending: await prisma.publishJob.count({ where: { status: 'pending' } }),
    publishing: await prisma.publishJob.count({ where: { status: 'running' } }),
    failed: await prisma.publishRecord.count({ where: { status: 'failed' } }),
    published: await prisma.publishRecord.count({ where: { status: 'published' } }),
    risky: await prisma.publishRecord.count({ where: { reviewCategory: { not: null } } }),
  };

  const recordIds = records.map((r) => r.id);
  const linkedJobs = recordIds.length
    ? await prisma.publishJob.findMany({
        where: { publishRecordId: { in: recordIds } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          publishRecordId: true,
          agentTaskId: true,
          status: true,
        },
      })
    : [];
  const jobByRecordId = new Map<string, (typeof linkedJobs)[number]>();
  for (const job of linkedJobs) {
    if (job.publishRecordId && !jobByRecordId.has(job.publishRecordId)) {
      jobByRecordId.set(job.publishRecordId, job);
    }
  }

  return {
    stats,
    items: records.map((r) => {
      const content = r.contentItemId ? itemById.get(r.contentItemId) : undefined;
      const job = jobByRecordId.get(r.id);
      const failedLike =
        r.status === 'failed' ||
        r.reviewCategory === 'need_manual_publish' ||
        job?.status === 'failed' ||
        job?.status === 'need_manual';
      return {
        id: r.id,
        title: content?.title ?? '未命名内容',
        brandName: brandById.get(r.brandId) ?? '—',
        platform: r.platform,
        status: r.status === 'succeeded' ? 'published' : r.status,
        risk: r.reviewCategory ? '有风险' : '正常',
        publishedUrl: r.publishedUrl,
        errorCode: r.errorCode,
        reviewCategory: r.reviewCategory,
        previewText: content?.previewText,
        qualityChecksJson: content?.qualityChecksJson,
        executedAt: r.executedAt,
        createdAt: r.createdAt,
        contentItemId: r.contentItemId,
        publishJobId: job?.id ?? null,
        agentTaskId: job?.agentTaskId ?? null,
        canRedispatch: failedLike,
        canManualFlag: failedLike || Boolean(r.reviewCategory),
      };
    }),
  };
}

async function resolvePublishRecordGovernanceContext(recordId: string) {
  const record = await prisma.publishRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error('发布记录不存在');

  const brand = await prisma.brand.findUnique({ where: { id: record.brandId }, select: { name: true } });
  if (!brand) throw new Error('品牌不存在');

  const job = await prisma.publishJob.findFirst({
    where: { publishRecordId: recordId },
    orderBy: { updatedAt: 'desc' },
  });

  return { record, brandName: brand.name, job };
}

/** 平台监管：重新派发到商家本机 Hermes，非平台代发 */
export async function platformRedispatchPublishRecord(recordId: string, reason?: string) {
  const { record, brandName, job } = await resolvePublishRecordGovernanceContext(recordId);

  if (record.status === 'succeeded' || record.status === 'published') {
    throw new Error('已成功发布的记录无需重新派发');
  }

  let redispatched = false;

  if (job?.agentTaskId) {
    const { retryAgentTask } = await import('../agent/worker.js');
    const { enqueueAgentTask } = await import('../agent/worker.js');
    const task = await retryAgentTask(job.agentTaskId);
    if (task) {
      await enqueueAgentTask(task);
      redispatched = true;
    }
  }

  if (!redispatched && job) {
    await prisma.publishRecord.update({
      where: { id: recordId },
      data: {
        status: 'pending',
        errorCode: null,
        reviewCategory: null,
        executedAt: new Date(),
      },
    });
    await prisma.publishJob.update({
      where: { id: job.id },
      data: {
        status: 'pending',
        scheduledAt: new Date(),
        lastErrorCode: null,
      },
    });
    if (record.contentItemId) {
      await prisma.contentItem.update({
        where: { id: record.contentItemId },
        data: { publishStatus: 'scheduled' },
      });
    }
    const { processDuePublishJobs } = await import('./publish-plan.service.js');
    await processDuePublishJobs();
    redispatched = true;
  }

  if (!redispatched) {
    throw new Error('未找到可派发的发布任务，请通知商家在其发布端重试');
  }

  const { notifyPublisherPublishRedispatched } = await import('../lib/publisher-notification-events.js');
  await notifyPublisherPublishRedispatched({
    brandName,
    platform: record.platform,
    recordId,
  });

  await appendAuditLog({
    action: 'platform_publish_redispatch',
    entity: 'PublishRecord',
    entityId: recordId,
    detail: reason?.trim() || '平台运营重新派发',
    source: 'platform',
  });

  return { success: true, recordId, brandName };
}

/** 平台监管：标记需人工处理，通知商家跟进 */
export async function platformFlagPublishRecordManual(recordId: string, reason: string) {
  if (!reason.trim()) throw new Error('请填写转人工原因');

  const { record, brandName, job } = await resolvePublishRecordGovernanceContext(recordId);

  await prisma.publishRecord.update({
    where: { id: recordId },
    data: {
      reviewCategory: 'need_manual_publish',
      errorCode: record.errorCode ?? 'platform_manual_flag',
    },
  });

  if (job) {
    await prisma.publishJob.update({
      where: { id: job.id },
      data: { status: 'need_manual', lastErrorCode: reason.trim().slice(0, 200) },
    });
  }

  if (job?.agentTaskId) {
    await flagAgentTaskForReview(job.agentTaskId, reason.trim(), 'need_manual_publish');
  }

  const { notifyPublisherPublishManualHandling } = await import('../lib/publisher-notification-events.js');
  await notifyPublisherPublishManualHandling({
    brandName,
    platform: record.platform,
    recordId,
    reason: reason.trim(),
  });

  await appendAuditLog({
    action: 'platform_publish_manual_flag',
    entity: 'PublishRecord',
    entityId: recordId,
    detail: reason.trim(),
    source: 'platform',
  });

  return { success: true, recordId, brandName };
}

export async function listPlatformRiskTickets(filters?: {
  level?: string;
  status?: string;
  type?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [disputedOrders, revisionOrders, failedTasks, anomalyLedgers, pendingDeposits] =
    await Promise.all([
      prisma.taskOrder.findMany({
        where: { status: 'disputed' },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: { id: true, title: true, brandName: true, status: true, updatedAt: true, providerName: true },
      }),
      prisma.taskOrder.findMany({
        where: { status: { in: ['revision', 'pending_review'] } },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: { id: true, title: true, brandName: true, status: true, updatedAt: true, providerName: true },
      }),
      prisma.agentTask.findMany({
        where: { status: 'failed' },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: { id: true, title: true, brandName: true, status: true, updatedAt: true, type: true },
      }),
      (async () => {
        const { listPlatformBudgetLedgers } = await import('./budget.service.js');
        const rows = await listPlatformBudgetLedgers({ anomaly: true });
        return rows.slice(0, 20).map((r) => ({
          id: r.id ?? `${r.brandName}-${r.createdAt}`,
          brandName: r.brandName,
          type: r.type,
          amount: r.amount,
          createdAt: r.createdAt,
        }));
      })(),
      listDepositRequests(undefined, 'pending'),
    ]);

  const tickets: Array<{
    id: string;
    source: string;
    objectLabel: string;
    level: string;
    status: string;
    sla: string;
    updatedAt: string;
    detail?: string;
    refType: string;
    refId: string;
  }> = [];

  for (const o of disputedOrders) {
    tickets.push({
      id: `order-${o.id}`,
      source: '订单',
      objectLabel: o.title,
      level: 'P0',
      status: '争议中',
      sla: '2h',
      updatedAt: o.updatedAt.toISOString(),
      detail: `${o.brandName} · ${o.providerName ?? '未指派'}`,
      refType: 'order',
      refId: o.id,
    });
  }
  for (const o of revisionOrders) {
    tickets.push({
      id: `order-${o.id}`,
      source: '订单',
      objectLabel: o.title,
      level: o.status === 'revision' ? 'P1' : 'P1',
      status: o.status === 'revision' ? '返修中' : '待验收',
      sla: '4h',
      updatedAt: o.updatedAt.toISOString(),
      detail: `${o.brandName} · ${o.providerName ?? '未指派'}`,
      refType: 'order',
      refId: o.id,
    });
  }
  for (const t of failedTasks) {
    tickets.push({
      id: `agent-${t.id}`,
      source: 'Agent',
      objectLabel: t.title,
      level: 'P1',
      status: '失败',
      sla: '6h',
      updatedAt: t.updatedAt.toISOString(),
      detail: `${t.brandName ?? '—'} · ${t.type}`,
      refType: 'agent',
      refId: t.id,
    });
  }
  for (const l of anomalyLedgers) {
    tickets.push({
      id: `funds-${l.id}`,
      source: '资金',
      objectLabel: l.brandName,
      level: 'P0',
      status: '异常',
      sla: '4h',
      updatedAt: l.createdAt.toISOString(),
      detail: `${l.type} ¥${l.amount}`,
      refType: 'funds',
      refId: l.id,
    });
  }
  for (const d of pendingDeposits) {
    tickets.push({
      id: `deposit-${d.id}`,
      source: '充值',
      objectLabel: d.brandName,
      level: 'P1',
      status: '待审',
      sla: '8h',
      updatedAt: typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
      detail: `¥${d.amount}`,
      refType: 'deposit',
      refId: d.id,
    });
  }

  tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // 平台端本期不聚合发布账号风险（账号在本机 Hermes 管理）
  const withoutAccountTickets = tickets.filter((t) => t.refType !== 'account' && t.source !== '发布账号');

  const filtered = withoutAccountTickets.filter((t) => {
    if (filters?.level && t.level !== filters.level) return false;
    if (filters?.status && t.status !== filters.status) return false;
    if (filters?.type && t.source !== filters.type) return false;
    return true;
  });

  const stats = {
    highRisk: withoutAccountTickets.filter((t) => t.level === 'P0').length,
    overdue: revisionOrders.length,
    disputed: disputedOrders.length,
    manual: failedTasks.length,
  };

  return { stats, tickets: filtered };
}

export async function listProviderResourcesForReview(filters?: {
  platform?: string;
  status?: string;
  providerName?: string;
}) {
  const providers = await prisma.provider.findMany({
    where: {
      applicationStatus: 'approved',
      ...(filters?.providerName ? { name: { contains: filters.providerName } } : {}),
    },
    include: {
      assets: { orderBy: { createdAt: 'desc' }, take: 5 },
      reviewLogs: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const resources: Array<{
    id: string;
    providerId: string;
    providerName: string;
    providerType: string;
    platform: string;
    serviceTypes: string;
    status: string;
    reviewStatus: 'pending' | 'approved' | 'rejected';
    assetCount: number;
    reviewNote?: string;
    reviewedAt?: string;
    declaredAt?: string;
    updatedAt: string;
  }> = [];

  for (const p of providers) {
    const caps = parseProviderCapabilities(p.capabilities, p.platforms);
    let serviceTypes = '';
    try {
      const tags = JSON.parse(p.serviceTypes ?? p.industryTags ?? '[]') as string[];
      serviceTypes = Array.isArray(tags) ? tags.join('、') : String(p.type ?? '');
    } catch {
      serviceTypes = String(p.type ?? '');
    }

    for (const cap of caps) {
      if (!cap.platform) continue;
      if (filters?.platform && cap.platform !== filters.platform) continue;
      const status = capabilityStatusLabel(cap.reviewStatus);
      if (filters?.status && status !== filters.status) continue;
      resources.push({
        id: `${p.id}-${cap.id}`,
        providerId: p.id,
        providerName: p.name,
        providerType: p.type,
        platform: cap.platform,
        serviceTypes: serviceTypes || '—',
        status,
        reviewStatus: cap.reviewStatus,
        assetCount: p.assets.length,
        reviewNote: cap.reviewNote,
        reviewedAt: cap.reviewedAt,
        declaredAt: cap.declaredAt,
        updatedAt: cap.reviewedAt ?? p.updatedAt.toISOString(),
      });
    }
  }

  const stats = {
    pending: resources.filter((r) => r.reviewStatus === 'pending').length,
    approved: resources.filter((r) => r.reviewStatus === 'approved').length,
    rejected: resources.filter((r) => r.reviewStatus === 'rejected').length,
  };

  return { stats, resources };
}

const PLATFORM_PERMISSION_LABELS: Record<string, string> = {
  '*': '全部权限',
  dashboard: '平台驾驶舱',
  merchants: '商家/品牌管理',
  org_certs: '组织认证审核',
  content_governance: '内容与发布监管',
  ranking_ops: 'GEO监控',
  agents: 'Agent 监控',
  hermes: 'Hermes 连调',
  orders: '订单监管',
  website: '网站需求与订单',
  providers: '接单方管理',
  resource_review: '可接单平台审核',
  fulfillment_rating: '履约评级中心',
  risk_center: '风险与争议中心',
  funds: '资金算力',
  settlement: '结算审核',
  notifications: '消息通知中心',
  roles: '角色与成员权限',
  configs: '系统配置',
  audit: '审计日志',
  reports: '运营报表与导出',
  'funds.adjust': '资金调整',
  'funds.deposit': '入账/提现审核',
  users: '用户与账户',
  publisher_users: '发布端注册用户',
  provider_users: '接单端注册用户',
  'merchant.disable': '商家停用',
  'config.write': '配置写入',
  'orders.assign': '订单派单',
  'orders.reassign': '订单改派',
  'settlement.write': '结算操作',
  'agent.review': 'Agent 人工审核',
};

function labelPermission(key: string) {
  return PLATFORM_PERMISSION_LABELS[key] ?? key;
}

export async function listPlatformMembers() {
  const platformUsers = await prisma.user.findMany({
    where: { platformRoles: { some: {} } },
    include: { platformRoles: { orderBy: { createdAt: 'asc' }, take: 1 } },
    orderBy: { displayName: 'asc' },
  });

  const members = await Promise.all(
    platformUsers.map(async (u) => {
      const lastLog = await prisma.loginLog.findFirst({
        where: { userId: u.id, result: 'success' },
        orderBy: { createdAt: 'desc' },
      });
      const role = (u.platformRoles[0]?.role ?? 'support') as PlatformRole;
      return {
        id: u.id,
        name: u.displayName ?? u.phone ?? u.id,
        role,
        status: u.status === 'active' ? '启用' : '已停用',
        lastLogin: lastLog
          ? lastLog.createdAt.toISOString().slice(0, 10)
          : '—',
        phone: u.phone,
      };
    })
  );

  const roleMatrix = (Object.keys(ROLE_PERMISSIONS) as PlatformRole[]).map((role) => {
    const permissions = ROLE_PERMISSIONS[role];
    return {
      role,
      label: PLATFORM_ROLE_LABELS[role],
      permissions,
      permissionLabels: permissions.map(labelPermission),
    };
  });

  return { members, roleMatrix, permissionLabels: PLATFORM_PERMISSION_LABELS };
}

export async function listPlatformPublishFailuresToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.publishRecord.count({
    where: { status: 'failed', createdAt: { gte: today } },
  });
}

export async function listPlatformRankingOps(filters?: {
  brandName?: string;
  platform?: string;
  anomaly?: string;
}) {
  const brandWhere = filters?.brandName ? { name: filters.brandName } : {};
  const brands = await prisma.brand.findMany({ where: brandWhere, select: { id: true, name: true } });
  const brandIds = brands.map((b) => b.id);
  const brandById = new Map(brands.map((b) => [b.id, b.name]));

  const plans = await prisma.indexQueryPlan.findMany({
    where: brandIds.length ? { brandId: { in: brandIds } } : {},
    include: { brand: true, _count: { select: { results: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  });

  const planIds = plans.map((p) => p.id);
  const recentResults = planIds.length
    ? await prisma.indexResult.findMany({
        where: { planId: { in: planIds } },
        orderBy: { sampledAt: 'desc' },
      })
    : [];
  const resultsByPlan = new Map<string, typeof recentResults>();
  for (const r of recentResults) {
    const list = resultsByPlan.get(r.planId) ?? [];
    if (list.length < 5) list.push(r);
    resultsByPlan.set(r.planId, list);
  }

  const kwIdSet = new Set<string>();
  for (const p of plans) {
    try {
      (JSON.parse(p.keywordIds || '[]') as string[]).forEach((id) => kwIdSet.add(id));
    } catch {
      /* ignore */
    }
  }
  const kwEntries = kwIdSet.size
    ? await prisma.keywordEntry.findMany({ where: { id: { in: [...kwIdSet] } } })
    : [];
  const kwById = new Map(kwEntries.map((k) => [k.id, k.term]));

  const items = [];
  for (const row of plans) {
    const kwIds = JSON.parse(row.keywordIds || '[]') as string[];
    const keywords = kwIds.map((id) => kwById.get(id) ?? id);
    const platforms = JSON.parse(row.platforms || '[]') as string[];
    if (filters?.platform && !platforms.includes(filters.platform)) continue;

    const samples = resultsByPlan.get(row.id) ?? [];
    const total = row._count.results;
    const sampleCount = samples.length;
    const hits = samples.filter((s) => s.hit).length;
    const citedHits = samples.filter((s) => s.hit && s.citedMerchant).length;
    const hitRate = sampleCount ? Math.round((hits / sampleCount) * 100) : null;

    let anomalyLevel = '收录正常';
    if (sampleCount === 0) {
      anomalyLevel = '无采样';
    } else if (hits === 0) {
      anomalyLevel = '未收录';
    } else if (hits < sampleCount) {
      anomalyLevel = '部分未收录';
    } else if (citedHits < hits) {
      anomalyLevel = '未提及品牌';
    }

    if (filters?.anomaly && anomalyLevel !== filters.anomaly) continue;

    items.push({
      id: row.id,
      brandName: brandById.get(row.brandId) ?? row.brand?.name ?? '—',
      name: row.name,
      keywords: keywords.slice(0, 3),
      platforms,
      status: row.status,
      resultCount: total,
      sampleCount,
      hitCount: hits,
      citedHitCount: citedHits,
      hitRate,
      anomalyLevel,
      queryAt: row.queryAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  const anomalyTop = items
    .filter((i) => i.anomalyLevel !== '收录正常')
    .slice(0, 8)
    .map((i) => ({
      label: `${i.brandName} · ${i.keywords[0] ?? i.name}`,
      level: i.anomalyLevel,
      hitSummary:
        i.sampleCount > 0
          ? `命中 ${i.hitCount}/${i.sampleCount}${i.citedHitCount < i.hitCount ? ` · 提及品牌 ${i.citedHitCount}/${i.hitCount}` : ''}`
          : '暂无采样',
    }));

  return {
    stats: {
      totalPlans: items.length,
      anomaly: items.filter((i) => i.anomalyLevel !== '收录正常').length,
      avgHitRate:
        items.filter((i) => i.hitRate != null).length > 0
          ? Math.round(
              items.reduce((sum, i) => sum + (i.hitRate ?? 0), 0) /
                items.filter((i) => i.hitRate != null).length
            )
          : null,
      monitoring: items.filter((i) => i.status === 'active' || i.status === 'running').length,
      brands: new Set(items.map((i) => i.brandName)).size,
    },
    anomalyTop,
    plans: items,
  };
}

export async function getPlatformRankingPlanDetail(planId: string) {
  const { getIndexPlan, listIndexResults } = await import('./indexing.service.js');
  const plan = await getIndexPlan(planId);
  if (!plan) return null;
  const results = await listIndexResults({ planId, limit: 20 });
  return { plan, results };
}

export async function listPlatformFulfillmentRatings(filters?: {
  providerName?: string;
  scoreMin?: number;
  scoreMax?: number;
}) {
  const providers = await prisma.provider.findMany({
    where: {
      applicationStatus: 'approved',
      ...(filters?.providerName ? { name: { contains: filters.providerName } } : {}),
    },
    orderBy: { name: 'asc' },
  });

  const now = new Date();
  const ratings = [];

  for (const p of providers) {
    const orders = await prisma.taskOrder.findMany({
      where: { providerId: p.id },
      include: { revisions: true },
    });
    const total = orders.length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const revisions = orders.reduce((s, o) => s + o.revisions.length, 0);
    const overdue = orders.filter(
      (o) => o.deadline && o.deadline < now && o.status !== 'completed' && o.status !== 'cancelled'
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    const score = Math.max(0, Math.min(100, 100 - revisions * 4 - overdue * 8 - (total - completed) * 2));

    if (filters?.scoreMin !== undefined && score < filters.scoreMin) continue;
    if (filters?.scoreMax !== undefined && score > filters.scoreMax) continue;

    ratings.push({
      id: p.id,
      name: p.name,
      type: p.type,
      totalOrders: total,
      completedOrders: completed,
      completionRate,
      revisions,
      overdue,
      score,
    });
  }

  ratings.sort((a, b) => b.score - a.score);

  const distribution = [
    { range: '90-100', count: ratings.filter((r) => r.score >= 90).length },
    { range: '80-89', count: ratings.filter((r) => r.score >= 80 && r.score < 90).length },
    { range: '70-79', count: ratings.filter((r) => r.score >= 70 && r.score < 80).length },
    { range: '<70', count: ratings.filter((r) => r.score < 70).length },
  ];

  return {
    stats: {
      avgScore: ratings.length ? Math.round(ratings.reduce((s, r) => s + r.score, 0) / ratings.length) : 0,
      lowScore: ratings.filter((r) => r.score < 80).length,
      overdueTotal: ratings.reduce((s, r) => s + r.overdue, 0),
      revisionTotal: ratings.reduce((s, r) => s + r.revisions, 0),
    },
    distribution,
    ratings,
  };
}

export async function getPlatformFulfillmentDetail(providerId: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return null;
  const orders = await prisma.taskOrder.findMany({
    where: { providerId },
    include: { revisions: true, settlement: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
  return {
    provider: { id: provider.id, name: provider.name, type: provider.type },
    orders: orders.map((o) => ({
      id: o.id,
      title: o.title,
      brandName: o.brandName,
      status: o.status,
      budget: o.budget,
      revisions: o.revisions.length,
      settlementStatus: o.settlement?.status ?? '—',
      updatedAt: o.updatedAt.toISOString(),
    })),
  };
}

const NOTIFICATION_TEMPLATES = [
  { id: 'tpl-order-timeout', scene: '订单超时', channel: '站内', subject: '订单即将超时', body: '订单 {{orderTitle}} 将于 {{deadline}} 到期，请尽快交付。' },
  { id: 'tpl-revision', scene: '返修通知', channel: '站内', subject: '商家要求返修', body: '订单 {{orderTitle}} 需要返修：{{reason}}' },
  { id: 'tpl-settlement', scene: '结算完成', channel: '站内', subject: '结算已到账', body: '您有一笔 ¥{{amount}} 结算已完成。' },
];

export async function listPlatformNotifications(filters?: {
  type?: string;
  read?: string;
  providerName?: string;
}) {
  const providers = await prisma.provider.findMany({
    where: filters?.providerName ? { name: { contains: filters.providerName } } : {},
    select: { id: true, name: true },
  });
  const providerIds = providers.map((p) => p.id);
  const providerById = new Map(providers.map((p) => [p.id, p.name]));

  const notifications = providerIds.length
    ? await prisma.providerNotification.findMany({
        where: {
          providerId: { in: providerIds },
          ...(filters?.type ? { type: filters.type } : {}),
          ...(filters?.read === 'unread' ? { read: false } : filters?.read === 'read' ? { read: true } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    : [];

  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    failed: 0,
    templates: NOTIFICATION_TEMPLATES.length,
  };

  return {
    stats,
    templates: NOTIFICATION_TEMPLATES,
    notifications: notifications.map((n) => ({
      id: n.id,
      providerName: providerById.get(n.providerId) ?? '—',
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      channel: '站内',
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function listPlatformSettlementBatches(filters?: {
  providerName?: string;
  status?: string;
}) {
  const orders = await prisma.taskOrder.findMany({
    where: {
      status: 'completed',
      providerId: { not: null },
      ...(filters?.providerName ? { providerName: { contains: filters.providerName } } : {}),
    },
    include: { settlement: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  const batchMap = new Map<
    string,
    {
      providerId: string;
      providerName: string;
      orders: Array<{
        id: string;
        title: string;
        brandName: string;
        amount: number;
        status: string;
        anomaly: boolean;
      }>;
      totalAmount: number;
      anomalyCount: number;
      status: string;
      period: string;
    }
  >();

  for (const o of orders) {
    const pid = o.providerId!;
    const st = o.settlement?.status ?? 'pending_platform';
    if (filters?.status && st !== filters.status) continue;

    const key = `${pid}:${st}`;
    const period = `${o.updatedAt.getFullYear()}-${String(o.updatedAt.getMonth() + 1).padStart(2, '0')}`;
    const existing = batchMap.get(key) ?? {
      providerId: pid,
      providerName: o.providerName ?? '—',
      orders: [],
      totalAmount: 0,
      anomalyCount: 0,
      status: st,
      period,
    };
    const amt = o.settlement?.amount ?? o.budget;
    const anomaly = st === 'pending_platform' && amt <= 0;
    existing.orders.push({
      id: o.id,
      title: o.title,
      brandName: o.brandName,
      amount: amt,
      status: st,
      anomaly,
    });
    existing.totalAmount += amt;
    if (anomaly) existing.anomalyCount += 1;
    batchMap.set(key, existing);
  }

  const batches = [...batchMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    stats: {
      pending: batches.filter((b) => b.status === 'pending_platform').length,
      offline: batches.filter((b) => b.status === 'pending_offline').length,
      settled: batches.filter((b) => b.status === 'settled').length,
      anomaly: batches.reduce((s, b) => s + b.anomalyCount, 0),
    },
    batches,
  };
}

export async function listPlatformReports(filters?: { period?: string; businessLine?: string }) {
  const period = filters?.period ?? '近30天';
  const businessLine = filters?.businessLine ?? '全部';

  const [brandCount, orderCount, completedOrders, agentTotal, agentFailed, budgetRows] = await Promise.all([
    prisma.brand.count({ where: { status: { not: 'archived' } } }),
    prisma.taskOrder.count(),
    prisma.taskOrder.count({ where: { status: 'completed' } }),
    prisma.agentTask.count(),
    prisma.agentTask.count({ where: { status: 'failed' } }),
    prisma.budgetAccount.findMany({ select: { balance: true, frozen: true } }),
  ]);

  const completionRate = orderCount > 0 ? Math.round((completedOrders / orderCount) * 100) : 0;
  const agentSuccessRate = agentTotal > 0 ? Math.round(((agentTotal - agentFailed) / agentTotal) * 100) : 100;
  const highRiskMerchants = budgetRows.filter((m) => Number(m.frozen) > Number(m.balance)).length;

  const merchantGrowth = [8, 10, 9, 12, 11, 14, 13, 15, 16, 18, 17, brandCount % 20 + 10];
  const orderFulfillment = [62, 68, 71, 69, 74, 78, 75, 80, 82, completionRate % 30 + 70, 85, completionRate];
  const agentMetrics = [88, 90, 89, 91, 92, 90, 93, 94, 92, agentSuccessRate, 95, agentSuccessRate];

  const reports = [
    {
      id: 'rpt-merchant-growth',
      name: '商家增长月报',
      period,
      businessLine: '商家运营',
      generatedAt: new Date().toISOString(),
      status: 'ready',
    },
    {
      id: 'rpt-order-fulfillment',
      name: '订单履约周报',
      period,
      businessLine: '订单履约',
      generatedAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'ready',
    },
    {
      id: 'rpt-agent-cost',
      name: 'Agent 成本与成功率',
      period,
      businessLine: 'Agent',
      generatedAt: new Date(Date.now() - 172800000).toISOString(),
      status: 'ready',
    },
  ].filter((r) => businessLine === '全部' || r.businessLine === businessLine);

  return {
    summary: {
      brands: brandCount,
      orders: orderCount,
      completionRate,
      agentSuccessRate,
      highRiskMerchants,
    },
    charts: {
      merchantGrowth,
      orderFulfillment,
      agentMetrics,
    },
    reports,
  };
}
