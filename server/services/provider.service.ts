import {
  isProviderIdentityVerified,
  maskIdCardNumber,
  validateProviderIdentityInput,
} from '../../lib/provider-identity.js';
import { isMvpPayoutChannel } from '../../lib/provider-payout.js';
import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { createProviderNotification } from './notification.service.js';
import { paginatedResult, parsePagination } from '../lib/pagination.js';
import { resolveMarketplaceSlots } from '../lib/marketplace-task-slots.js';
import { ensureDemoMarketplaceReady } from '../lib/ensure-demo-marketplace.js';

export async function getProvider(id: string) {
  return prisma.provider.findUnique({
    where: { id },
    include: { applications: { orderBy: { createdAt: 'desc' }, take: 5 }, reviewLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
}

export async function listProviders(status?: string) {
  return prisma.provider.findMany({
    where: status ? { applicationStatus: status } : {},
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProviderDashboard(providerId: string) {
  const provider = await getProvider(providerId);
  if (!provider) return null;

  const [openTasks, myOrders, pendingDelivery, revisionOrders, recentOrders, websitePending, websiteMine] =
    await Promise.all([
      prisma.taskOrder.count({ where: { status: 'published' } }),
      prisma.taskOrder.count({ where: { providerId } }),
      prisma.taskOrder.count({ where: { providerId, status: 'in_progress' } }),
      prisma.taskOrder.count({ where: { providerId, status: 'revision' } }),
      prisma.taskOrder.findMany({
        where: { providerId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      // 网页客资订单由平台线下交付，仅统计已指派给本接单方且待处理的单
      prisma.websiteOrder.count({
        where: {
          assigneeId: providerId,
          status: { in: ['pending', 'in_progress', 'revision'] },
        },
      }),
      prisma.websiteOrder.count({ where: { assigneeId: providerId } }),
    ]);

  const pendingReview = await prisma.taskOrder.count({
    where: { providerId, status: 'pending_review' },
  });

  const { countPendingSettlementForProvider } = await import('./settlement.service.js');
  const pendingSettlement = await countPendingSettlementForProvider(providerId);

  return {
    provider: {
      id: provider.id,
      name: provider.name,
      applicationStatus: provider.applicationStatus,
      reviewNote: provider.reviewNote,
    },
    summary: {
      openTasks,
      myOrders,
      pendingDelivery,
      pendingReview,
      revisionOrders,
      websitePending,
      websiteOrders: websiteMine,
      pendingSettlement: pendingSettlement.amount,
      pendingSettlementCount: pendingSettlement.count,
    },
    todos: [
      ...(provider.applicationStatus !== 'approved'
        ? [{ type: 'onboarding', label: '完成入驻审核', priority: 'P0' as const }]
        : []),
      ...(pendingDelivery > 0
        ? [{ type: 'delivery', label: `${pendingDelivery} 个订单待交付`, priority: 'P0' as const }]
        : []),
      ...(revisionOrders > 0
        ? [{ type: 'revision', label: `${revisionOrders} 个订单待返修`, priority: 'P1' as const }]
        : []),
      ...(websitePending > 0
        ? [{ type: 'website', label: `${websitePending} 个网站单待处理`, priority: 'P1' as const }]
        : []),
    ],
    recentOrders,
  };
}

export async function upsertProviderProfile(
  providerId: string | null,
  data: {
    name: string;
    type: string;
    contactName?: string;
    phone?: string;
    email?: string;
    city?: string;
    serviceTypes?: string[];
    platforms?: string[];
    industryTags?: string[];
    serviceAreas?: string[];
    budgetMin?: number;
    budgetMax?: number;
    caseLinks?: string[];
    capabilities?: string[];
  }
) {
  const payload = JSON.stringify(data);
  const displayName = data.name?.trim() || '新媒体接单方';
  const platforms = data.platforms ?? [];

  const buildCapabilitiesJson = (existingJson?: string | null) => {
    type Cap = { id: string; platform: string; reviewStatus: string; reviewNote?: string; reviewedAt?: string; declaredAt?: string };
    const existing: Cap[] = [];
    try {
      const parsed = JSON.parse(existingJson ?? '[]') as unknown;
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object' && 'platform' in (parsed[0] as object)) {
        existing.push(...(parsed as Cap[]));
      }
    } catch {
      /* ignore */
    }
    const byPlatform = new Map(existing.map((c) => [c.platform, c]));
    return JSON.stringify(
      platforms.map((platform, i) => {
        const prev = byPlatform.get(platform);
        if (prev) return prev;
        return {
          id: `cap-${i}`,
          platform,
          reviewStatus: 'pending',
          declaredAt: new Date().toISOString(),
        };
      })
    );
  };

  const common = {
    name: displayName,
    type: data.type || '达人',
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    city: data.city,
    serviceTypes: JSON.stringify(data.serviceTypes ?? []),
    platforms: JSON.stringify(data.platforms ?? []),
    industryTags: JSON.stringify(data.industryTags ?? []),
    serviceAreas: JSON.stringify(data.serviceAreas ?? []),
    budgetMin: data.budgetMin,
    budgetMax: data.budgetMax,
    caseLinks: JSON.stringify(data.caseLinks ?? []),
  };

  if (providerId) {
    const existing = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!existing) throw new Error('接单方不存在');
    if (existing.applicationStatus === 'submitted') {
      throw new Error('待审核中请先撤回申请再修改资料');
    }
    const nextStatus =
      existing.applicationStatus === 'approved' ? 'approved' : 'draft';
    const provider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        ...common,
        capabilities: buildCapabilitiesJson(existing.capabilities),
        applicationStatus: nextStatus,
      },
    });
    if (nextStatus === 'draft') {
      await saveApplicationDraft(providerId);
    }
    return provider;
  }

  return prisma.provider.create({
    data: {
      ...common,
      capabilities: buildCapabilitiesJson(null),
      applicationStatus: 'draft',
    },
  });
}

export async function submitProviderApplication(providerId: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');

  const platforms = JSON.parse(provider.platforms ?? '[]') as string[];
  const serviceAreas = JSON.parse(provider.serviceAreas ?? '[]') as string[];
  if (platforms.length === 0) throw new Error('请至少选择一个媒体平台');
  if (serviceAreas.length === 0) throw new Error('请至少选择一个接单地区');

  const version =
    (await prisma.providerApplication.count({ where: { providerId } })) + 1;

  await prisma.providerApplication.create({
    data: {
      providerId,
      version,
      payload: JSON.stringify(provider),
      status: 'submitted',
    },
  });

  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { applicationStatus: 'submitted' },
  });

  await appendAuditLog({
    action: 'provider_application_submit',
    entity: 'Provider',
    entityId: providerId,
  });

  return updated;
}

export async function saveApplicationDraft(providerId: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');

  const existingDraft = await prisma.providerApplication.findFirst({
    where: { providerId, status: 'draft' },
    orderBy: { createdAt: 'desc' },
  });

  if (existingDraft) {
    return prisma.providerApplication.update({
      where: { id: existingDraft.id },
      data: { payload: JSON.stringify(provider) },
    });
  }

  const version =
    (await prisma.providerApplication.count({ where: { providerId } })) + 1;
  return prisma.providerApplication.create({
    data: {
      providerId,
      version,
      payload: JSON.stringify(provider),
      status: 'draft',
    },
  });
}

export async function listProviderApplications(providerId: string) {
  return prisma.providerApplication.findMany({
    where: { providerId },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function withdrawProviderApplication(providerId: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');
  if (provider.applicationStatus !== 'submitted') {
    throw new Error('仅待审核状态可撤回申请');
  }

  await prisma.providerApplication.updateMany({
    where: { providerId, status: 'submitted' },
    data: { status: 'withdrawn', reviewNote: '接单方撤回' },
  });

  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { applicationStatus: 'draft' },
  });

  await appendAuditLog({
    action: 'provider_application_withdraw',
    entity: 'Provider',
    entityId: providerId,
  });

  return updated;
}

export async function listTaskMarketplace(filters: {
  platform?: string;
  type?: string;
  minBudget?: number;
  industry?: string;
  city?: string;
  deadlineBefore?: string;
  providerId?: string;
}) {
  await ensureDemoMarketplaceReady();

  const deadlineFilter = filters.deadlineBefore
    ? { deadline: { lte: new Date(filters.deadlineBefore) } }
    : {};

  const orders = await prisma.taskOrder.findMany({
    where: {
      status: 'published',
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.minBudget ? { budget: { gte: filters.minBudget } } : {}),
      ...(filters.industry ? { industry: filters.industry } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...deadlineFilter,
    },
    orderBy: { createdAt: 'desc' },
  });

  let provider: Awaited<ReturnType<typeof getProvider>> = null;
  if (filters.providerId) provider = await getProvider(filters.providerId);

  const providerPlatforms = provider
    ? (JSON.parse(provider.platforms ?? '[]') as string[])
    : [];

  return Promise.all(
    orders.map(async (order) => {
      const matchScore =
        providerPlatforms.length === 0
          ? 50
          : providerPlatforms.includes(order.platform)
            ? 90
            : 40;
      const slots = await resolveMarketplaceSlots(order);
      return {
        ...order,
        ...slots,
        matchScore,
        matchLabel:
          matchScore >= 80 ? '高度匹配' : matchScore >= 50 ? '部分匹配' : '匹配度低',
      };
    })
  );
}

export async function applyToTaskOrder(
  orderId: string,
  providerId: string,
  providerName: string,
  message?: string
) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');
  if (provider.applicationStatus !== 'approved') {
    throw new Error('入驻审核通过后才可申请接单');
  }

  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== 'published') {
    throw new Error('任务不可申请');
  }

  const existing = await prisma.taskOrderApplication.findFirst({
    where: { orderId, providerId },
  });
  if (existing) throw new Error('已申请过该任务');

  const application = await prisma.taskOrderApplication.create({
    data: { orderId, providerId, providerName, message, status: 'pending' },
  });

  await appendAuditLog({
    action: 'task_order_apply',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: providerId,
  });

  return application;
}

/** 接单方直接领取任务（先到先得，无需平台审批） */
export async function claimTaskOrder(
  orderId: string,
  providerId: string,
  providerName: string,
  note?: string
) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');
  if (provider.applicationStatus !== 'approved') {
    throw new Error('入驻审核通过后才可领取任务');
  }

  const order = await prisma.$transaction(async (tx) => {
    const row = await tx.taskOrder.findUnique({ where: { id: orderId } });
    if (!row) {
      throw new Error('任务不可领取或已被他人接单');
    }
    if (row.providerId === providerId && row.status === 'in_progress') {
      return row;
    }
    if (row.status !== 'published') {
      throw new Error('任务不可领取或已被他人接单');
    }
    if (row.providerId && row.providerId !== providerId) {
      throw new Error('该任务已被其他接单方领取');
    }

    const otherActive = await tx.providerOrderAssignment.findFirst({
      where: { orderId, active: true, providerId: { not: providerId } },
    });
    if (otherActive) throw new Error('该任务已被其他接单方领取');

    const existing = await tx.taskOrderApplication.findFirst({
      where: { orderId, providerId },
    });

    if (existing) {
      await tx.taskOrderApplication.update({
        where: { id: existing.id },
        data: { status: 'accepted', message: note?.trim() || existing.message },
      });
    } else {
      await tx.taskOrderApplication.create({
        data: {
          orderId,
          providerId,
          providerName,
          message: note?.trim() || null,
          status: 'accepted',
        },
      });
    }

    await tx.taskOrderApplication.updateMany({
      where: { orderId, status: 'pending' },
      data: { status: 'rejected' },
    });

    await tx.providerOrderAssignment.updateMany({
      where: { orderId, active: true },
      data: { active: false },
    });
    await tx.providerOrderAssignment.create({
      data: {
        orderId,
        providerId,
        providerName,
        reason: '接单方直接领取',
        active: true,
      },
    });

    return tx.taskOrder.update({
      where: { id: orderId },
      data: {
        status: 'in_progress',
        providerId,
        providerName,
      },
    });
  });

  await appendAuditLog({
    action: 'task_order_claim',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: providerId,
  });

  await createProviderNotification({
    providerId,
    type: 'assignment',
    title: '任务领取成功',
    body: order.title,
    refId: order.id,
  });

  return order;
}

export async function confirmApplication(applicationId: string) {
  const app = await prisma.taskOrderApplication.findUnique({
    where: { id: applicationId },
    include: { order: true },
  });
  if (!app || app.order.status !== 'published') {
    throw new Error('申请无效');
  }

  await prisma.taskOrderApplication.update({
    where: { id: applicationId },
    data: { status: 'accepted' },
  });

  await prisma.providerOrderAssignment.updateMany({
    where: { orderId: app.orderId, active: true },
    data: { active: false },
  });
  await prisma.providerOrderAssignment.create({
    data: {
      orderId: app.orderId,
      providerId: app.providerId,
      providerName: app.providerName,
      reason: '平台确认申请',
      active: true,
    },
  });

  const order = await prisma.taskOrder.update({
    where: { id: app.orderId },
    data: {
      status: 'in_progress',
      providerId: app.providerId,
      providerName: app.providerName,
    },
  });

  await appendAuditLog({
    action: 'task_order_assign',
    entity: 'TaskOrder',
    entityId: app.orderId,
    detail: app.providerId,
  });

  await createProviderNotification({
    providerId: app.providerId,
    type: 'assignment',
    title: '接单申请已通过',
    body: order.title,
    refId: order.id,
  });

  return order;
}

export async function listProviderOrders(providerId: string, status?: string) {
  const statusFilter =
    status === 'executing'
      ? { in: ['in_progress', 'draft_revision', 'draft_approved'] }
      : status === 'pending_review'
        ? { in: ['pending_review', 'draft_review'] }
        : status === 'revision'
          ? { in: ['revision'] }
          : status === 'completed'
            ? { in: ['completed'] }
            : status === 'published'
              ? { in: ['published'] }
              : undefined;

  return prisma.taskOrder.findMany({
    where: {
      providerId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { deliveries: true, revisions: true, applications: true, settlement: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function listProviderOrdersPaginated(
  providerId: string,
  status?: string,
  page = 1,
  pageSize = 20
) {
  const statusFilter =
    status === 'executing'
      ? { in: ['in_progress', 'draft_revision', 'draft_approved'] }
      : status === 'pending_review'
        ? { in: ['pending_review', 'draft_review'] }
        : status === 'revision'
          ? { in: ['revision'] }
          : status === 'completed'
            ? { in: ['completed'] }
            : status === 'published'
              ? { in: ['published'] }
              : status === 'cancelled'
                ? { in: ['cancelled'] }
                : undefined;

  const where = {
    providerId,
    ...(statusFilter ? { status: statusFilter } : {}),
  };
  const { skip, take } = parsePagination({ page: String(page), pageSize: String(pageSize) }, pageSize);
  const [orders, total] = await Promise.all([
    prisma.taskOrder.findMany({
      where,
      include: { deliveries: true, revisions: true, settlement: true },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.taskOrder.count({ where }),
  ]);
  const result = paginatedResult(orders, total, page, pageSize);
  return { orders: result.items, total: result.total, page: result.page, pageSize: result.pageSize, hasMore: result.hasMore };
}

export async function listProviderAssets(providerId: string) {
  return prisma.providerAsset.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addProviderAsset(
  providerId: string,
  input: { title: string; type?: string; url: string; note?: string }
) {
  return prisma.providerAsset.create({
    data: {
      providerId,
      title: input.title,
      type: input.type ?? 'case',
      url: input.url,
      note: input.note,
    },
  });
}

export async function deleteProviderAsset(providerId: string, assetId: string) {
  const asset = await prisma.providerAsset.findFirst({ where: { id: assetId, providerId } });
  if (!asset) throw new Error('资源不存在');
  return prisma.providerAsset.delete({ where: { id: assetId } });
}

export async function listAllProvidersForPlatform(status?: string) {
  return prisma.provider.findMany({
    where: status ? { applicationStatus: status } : {},
    include: {
      applications: { orderBy: { createdAt: 'desc' }, take: 1 },
      reviewLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { orderApplications: true, assets: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function reviewProviderApplication(
  providerId: string,
  action: 'approve' | 'reject',
  note?: string
) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const provider = await prisma.provider.update({
    where: { id: providerId },
    data: {
      applicationStatus: status,
      reviewNote: note,
      status: action === 'approve' ? 'active' : 'suspended',
    },
  });

  await prisma.providerReviewLog.create({
    data: { providerId, action, note },
  });

  await prisma.providerApplication.updateMany({
    where: { providerId, status: 'submitted' },
    data: { status, reviewNote: note },
  });

  await appendAuditLog({
    action: `provider_application_${action}`,
    entity: 'Provider',
    entityId: providerId,
    detail: note,
  });

  await createProviderNotification({
    providerId,
    type: 'onboarding',
    title: action === 'approve' ? '入驻审核通过' : '入驻审核未通过',
    body: note ?? (action === 'approve' ? '可前往任务大厅接单' : '请修改资料后重新提交'),
  });

  return provider;
}

export async function listProviderPricingRules(providerId: string) {
  return prisma.providerPricingRule.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function upsertProviderPricingRule(
  providerId: string,
  data: { id?: string; taskType: string; minBudget?: number; maxBudget?: number; note?: string }
) {
  if (data.id) {
    return prisma.providerPricingRule.update({
      where: { id: data.id },
      data: {
        taskType: data.taskType,
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        note: data.note,
      },
    });
  }
  return prisma.providerPricingRule.create({
    data: {
      providerId,
      taskType: data.taskType,
      minBudget: data.minBudget,
      maxBudget: data.maxBudget,
      note: data.note,
    },
  });
}

export async function deleteProviderPricingRule(providerId: string, ruleId: string) {
  const row = await prisma.providerPricingRule.findFirst({ where: { id: ruleId, providerId } });
  if (!row) throw new Error('规则不存在');
  await prisma.providerPricingRule.delete({ where: { id: ruleId } });
}

export async function getProviderEarnings(providerId: string) {
  const { buildProviderEarningsTransactions } = await import('./withdrawal.service.js');
  return buildProviderEarningsTransactions(providerId);
}

export async function verifyProviderIdentity(
  providerId: string,
  input: { realName: string; idNumber: string }
) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');
  if (isProviderIdentityVerified(provider)) {
    throw new Error('已完成实名认证，如需修改请联系平台运营');
  }

  const parsed = validateProviderIdentityInput(input);
  if (!parsed.ok) throw new Error(parsed.error);

  return prisma.provider.update({
    where: { id: providerId },
    data: {
      identityRealName: parsed.realName,
      identityIdNumberMask: maskIdCardNumber(parsed.idNumber),
      identityVerifiedAt: new Date(),
    },
  });
}

export async function updateProviderPayoutAccount(
  providerId: string,
  input: {
    payoutChannel: string;
    payoutAccountName: string;
    payoutAccountLabel: string;
  }
) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');
  if (!isProviderIdentityVerified(provider)) {
    throw new Error('请先完成身份证实名认证');
  }

  const channel = input.payoutChannel.trim();
  const accountName = input.payoutAccountName.trim();
  const accountLabel = input.payoutAccountLabel.trim();

  if (!['bank', 'alipay', 'wechat'].includes(channel)) {
    throw new Error('请选择有效的提现渠道');
  }
  if (!isMvpPayoutChannel(channel)) {
    throw new Error('当前仅支持绑定支付宝账户');
  }
  if (!accountName) throw new Error('请填写账户实名');
  if (!accountLabel) throw new Error('请填写账户信息');
  if (provider.identityRealName && accountName !== provider.identityRealName) {
    throw new Error('提现账户实名须与身份证实名一致');
  }

  return prisma.provider.update({
    where: { id: providerId },
    data: {
      payoutChannel: channel,
      payoutAccountName: accountName,
      payoutAccountLabel: accountLabel,
    },
  });
}
