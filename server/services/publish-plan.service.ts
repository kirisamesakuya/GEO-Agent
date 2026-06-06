import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';
import { validateAutoPublish } from './gate.service.js';
import { createAndEnqueueTask } from '../agent/worker.js';

export interface PublishPlanDto {
  id: string;
  brandId: string;
  name: string;
  sourceType: string;
  sourceRef?: string;
  targetAccountIds: string[];
  firstPublishAt?: string;
  frequency: string;
  runCount: number;
  autoComment: boolean;
  status: string;
  createdAt: string;
}

export interface PublishRecordDto {
  id: string;
  planId?: string;
  brandId: string;
  contentItemId?: string;
  contentTitle?: string;
  platform: string;
  accountBindingId?: string;
  accountName?: string;
  status: string;
  publishedUrl?: string;
  errorCode?: string;
  reviewCategory?: string;
  executedAt?: string;
  createdAt: string;
}

function mapPlan(row: {
  id: string;
  brandId: string;
  name: string;
  sourceType: string;
  sourceRef: string | null;
  targetAccountIds: string;
  firstPublishAt: Date | null;
  frequency: string;
  runCount: number;
  autoComment: boolean;
  status: string;
  createdAt: Date;
}): PublishPlanDto {
  return {
    id: row.id,
    brandId: row.brandId,
    name: row.name,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef ?? undefined,
    targetAccountIds: JSON.parse(row.targetAccountIds || '[]') as string[],
    firstPublishAt: row.firstPublishAt?.toISOString(),
    frequency: row.frequency,
    runCount: row.runCount,
    autoComment: row.autoComment,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapRecord(row: {
  id: string;
  planId: string | null;
  brandId: string;
  contentItemId: string | null;
  contentTitle?: string;
  platform: string;
  status: string;
  accountBindingId?: string | null;
  accountName?: string;
  publishedUrl: string | null;
  errorCode: string | null;
  reviewCategory: string | null;
  executedAt: Date | null;
  createdAt: Date;
}): PublishRecordDto {
  return {
    id: row.id,
    planId: row.planId ?? undefined,
    brandId: row.brandId,
    contentItemId: row.contentItemId ?? undefined,
    contentTitle: row.contentTitle,
    platform: row.platform,
    accountBindingId: row.accountBindingId ?? undefined,
    accountName: row.accountName,
    status: row.status,
    publishedUrl: row.publishedUrl ?? undefined,
    errorCode: row.errorCode ?? undefined,
    reviewCategory: row.reviewCategory ?? undefined,
    executedAt: row.executedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function platformMatches(contentPlatform: string, accountPlatform: string) {
  if (contentPlatform === accountPlatform) return true;
  if (contentPlatform === '公众号' && accountPlatform === '微信公众号') return true;
  if (contentPlatform === '微信公众号' && accountPlatform === '公众号') return true;
  return false;
}

function isAuthorizedStatus(status: string) {
  return status === '已授权' || status === '正常';
}

export async function listPublishPlans(brandName: string): Promise<PublishPlanDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  const rows = await prisma.publishPlan.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapPlan);
}

export async function createPublishPlan(
  brandName: string,
  data: Omit<PublishPlanDto, 'id' | 'brandId' | 'createdAt' | 'status'> & { status?: string }
): Promise<PublishPlanDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const row = await prisma.publishPlan.create({
    data: {
      brandId: brand.id,
      name: data.name,
      sourceType: data.sourceType,
      sourceRef: data.sourceRef ?? null,
      targetAccountIds: JSON.stringify(data.targetAccountIds ?? []),
      firstPublishAt: data.firstPublishAt ? new Date(data.firstPublishAt) : null,
      frequency: data.frequency ?? 'once',
      runCount: data.runCount ?? 1,
      autoComment: data.autoComment ?? false,
      status: data.status ?? 'draft',
    },
  });
  return mapPlan(row);
}

export async function listPublishRecords(
  brandName: string,
  opts?: { status?: string; reviewCategory?: string }
): Promise<PublishRecordDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  const rows = await prisma.publishRecord.findMany({
    where: {
      brandId: brand.id,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.reviewCategory ? { reviewCategory: opts.reviewCategory } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const contentIds = rows.map((row) => row.contentItemId).filter((id): id is string => Boolean(id));
  const accountIds = rows.map((row) => row.accountBindingId).filter((id): id is string => Boolean(id));
  const [items, accounts] = await Promise.all([
    contentIds.length
      ? prisma.contentItem.findMany({ where: { id: { in: contentIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
    accountIds.length
      ? prisma.accountBinding.findMany({ where: { id: { in: accountIds } }, select: { id: true, accountName: true } })
      : Promise.resolve([]),
  ]);
  const titleById = new Map(items.map((item) => [item.id, item.title]));
  const accountById = new Map(accounts.map((account) => [account.id, account.accountName]));
  return rows.map((row) =>
    mapRecord({
      ...row,
      contentTitle: row.contentItemId ? titleById.get(row.contentItemId) : undefined,
      accountName: row.accountBindingId ? accountById.get(row.accountBindingId) : undefined,
    })
  );
}

export async function createSelfAccountPublishFromBatch(input: {
  brandName: string;
  batchId: string;
  contentItemIds?: string[];
  accountBindingId: string;
  frequency?: string;
  runCount?: number;
  autoComment?: boolean;
}) {
  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');

  const batch = await prisma.contentBatch.findFirst({
    where: { id: input.batchId, brandName: brand.name },
    include: { items: true },
  });
  if (!batch) throw new Error('内容批次不存在');

  const selectedItems = input.contentItemIds?.length
    ? batch.items.filter((item) => input.contentItemIds?.includes(item.id))
    : batch.items;
  if (selectedItems.length === 0) throw new Error('请选择要发布的文章');

  const { resolvePublishBindingForBrand } = await import('./ad-account.service.js');
  const account = await resolvePublishBindingForBrand(input.brandName, input.accountBindingId);
  if (!platformMatches(batch.platform, account.platform)) {
    throw new Error(`所选账号平台为 ${account.platform}，不能发布 ${batch.platform} 内容`);
  }

  const plan = await prisma.publishPlan.create({
    data: {
      brandId: brand.id,
      name: `${brand.name} · ${batch.platform} 自有账号发布`,
      sourceType: 'content_batch',
      sourceRef: batch.id,
      targetAccountIds: JSON.stringify([account.id]),
      frequency: input.frequency ?? 'once',
      runCount: input.runCount ?? 1,
      autoComment: input.autoComment ?? false,
      status: 'running',
    },
  });

  const record = await prisma.publishRecord.create({
    data: {
      planId: plan.id,
      brandId: brand.id,
      contentItemId: selectedItems[0].id,
      platform: batch.platform,
      accountBindingId: account.id,
      status: 'pending',
      executedAt: new Date(),
    },
  });

  const task = await createAndEnqueueTask({
    type: 'hermes_publish',
    title: `${brand.name} · ${batch.platform} 自有账号发布`,
    brandName: brand.name,
    input: {
      contentBatchId: batch.id,
      contentItemIds: selectedItems.map((item) => item.id),
      targetPlatform: batch.platform,
      accountBindingId: account.id,
      accountName: account.accountName,
      planId: plan.id,
      publishRecordId: record.id,
      userConfirmed: true,
    },
    businessRef: plan.id,
  });

  return {
    plan: mapPlan(plan),
    record: mapRecord({ ...record, contentTitle: selectedItems[0].title, accountName: account.accountName }),
    task,
  };
}

export async function executePublishPlan(planId: string, brandName: string): Promise<PublishRecordDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const plan = await prisma.publishPlan.findFirst({
    where: { id: planId, brandId: brand.id },
  });
  if (!plan) throw new Error('发布计划不存在');

  const batch = plan.sourceRef
    ? await prisma.contentBatch.findFirst({
        where: { id: plan.sourceRef, brandName: brand.name },
        include: { items: { take: 1 } },
      })
    : null;
  const platform = batch?.platform ?? '小红书';
  const gate = await validateAutoPublish(platform, brand.name);

  if (!gate.ok) {
    const rec = await prisma.publishRecord.create({
      data: {
        planId: plan.id,
        brandId: brand.id,
        contentItemId: batch?.items[0]?.id ?? null,
        platform,
        status: 'need_reauth',
        errorCode: gate.error,
        reviewCategory: 'need_reauth',
        executedAt: new Date(),
      },
    });
    const { notifyPublisherPublishNeedReauth } = await import(
      '../lib/publisher-notification-events.js'
    );
    await notifyPublisherPublishNeedReauth({
      brandName: brand.name,
      platform,
      recordId: rec.id,
      reason: gate.error,
    });
    return mapRecord(rec);
  }

  const task = await createAndEnqueueTask({
    type: 'hermes_publish',
    title: `发布计划：${plan.name}`,
    brandName: brand.name,
    input: {
      contentBatchId: plan.sourceRef,
      targetPlatform: platform,
      accountBindingId: JSON.parse(plan.targetAccountIds || '[]')[0],
      userConfirmed: true,
      planId: plan.id,
    },
    businessRef: plan.id,
  });

  const rec = await prisma.publishRecord.create({
    data: {
      planId: plan.id,
      brandId: brand.id,
      contentItemId: batch?.items[0]?.id ?? null,
      platform,
      accountBindingId: JSON.parse(plan.targetAccountIds || '[]')[0] ?? null,
      status: 'pending',
      executedAt: new Date(),
    },
  });

  await prisma.publishPlan.update({
    where: { id: planId },
    data: { status: 'running' },
  });

  void task;
  return mapRecord(rec);
}

export async function updatePublishRecordFromTask(
  planId: string,
  brandId: string,
  success: boolean,
  publishLink?: string,
  reviewCategory?: string
): Promise<void> {
  const rec = await prisma.publishRecord.findFirst({
    where: { planId, brandId },
    orderBy: { createdAt: 'desc' },
  });
  if (!rec) return;
  await prisma.publishRecord.update({
    where: { id: rec.id },
    data: {
      status: success ? 'succeeded' : 'failed',
      publishedUrl: publishLink ?? null,
      reviewCategory: reviewCategory ?? (success ? null : 'need_manual_publish'),
      executedAt: new Date(),
    },
  });
  await prisma.publishPlan.update({
    where: { id: planId },
    data: { status: success ? 'done' : 'failed' },
  });
}

export interface PublishJobDto {
  id: string;
  planId: string;
  projectId?: string;
  contentItemId: string;
  platform: string;
  accountBindingId?: string;
  scheduledAt: string;
  status: string;
  agentTaskId?: string;
  publishRecordId?: string;
  attemptCount: number;
  lastErrorCode?: string;
}

function mapJob(row: {
  id: string;
  planId: string;
  projectId: string | null;
  contentItemId: string;
  platform: string;
  accountBindingId: string | null;
  scheduledAt: Date;
  status: string;
  agentTaskId: string | null;
  publishRecordId: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
}): PublishJobDto {
  return {
    id: row.id,
    planId: row.planId,
    projectId: row.projectId ?? undefined,
    contentItemId: row.contentItemId,
    platform: row.platform,
    accountBindingId: row.accountBindingId ?? undefined,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    agentTaskId: row.agentTaskId ?? undefined,
    publishRecordId: row.publishRecordId ?? undefined,
    attemptCount: row.attemptCount,
    lastErrorCode: row.lastErrorCode ?? undefined,
  };
}

function resolveAccountForPlatform(
  platform: string,
  bindings: Array<{ platform: string; accountBindingId: string }>
) {
  return bindings.find((b) => platformMatches(platform, b.platform))?.accountBindingId;
}

function buildScheduleTimes(input: {
  count: number;
  mode: string;
  startAt: string;
  intervalMinutes?: number;
  timePoints?: string[];
}): Date[] {
  const start = new Date(input.startAt);
  if (input.mode === 'multi' && input.timePoints?.length) {
    const base = input.timePoints.map((t) => new Date(t));
    const out: Date[] = [];
    for (let i = 0; i < input.count; i++) {
      out.push(base[i % base.length]);
    }
    return out;
  }
  const interval = Math.max(5, input.intervalMinutes ?? 30);
  return Array.from({ length: input.count }, (_, i) => {
    const d = new Date(start);
    d.setMinutes(d.getMinutes() + i * interval);
    return d;
  });
}

export async function bulkSchedulePublishPlan(input: {
  brandName: string;
  name: string;
  projectIds?: string[];
  contentItemIds: string[];
  accountBindings: Array<{ platform: string; accountBindingId: string }>;
  schedule: {
    mode: 'single' | 'staggered' | 'multi';
    startAt: string;
    intervalMinutes?: number;
    timePoints?: string[];
  };
}) {
  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');
  if (!input.contentItemIds.length) throw new Error('请选择要发布的文章');

  const items = await prisma.contentItem.findMany({
    where: { id: { in: input.contentItemIds } },
    include: { batch: true },
  });
  if (items.length !== input.contentItemIds.length) throw new Error('部分文章不存在');
  for (const item of items) {
    if (item.batch.brandName !== brand.name) throw new Error('文章品牌不匹配');
  }

  const { resolvePublishBindingForBrand } = await import('./ad-account.service.js');
  for (const binding of input.accountBindings) {
    await resolvePublishBindingForBrand(input.brandName, binding.accountBindingId);
  }

  const scheduleTimes = buildScheduleTimes({
    count: items.length,
    mode: input.schedule.mode,
    startAt: input.schedule.startAt,
    intervalMinutes: input.schedule.intervalMinutes,
    timePoints: input.schedule.timePoints,
  });

  const plan = await prisma.publishPlan.create({
    data: {
      brandId: brand.id,
      name: input.name.trim(),
      sourceType: 'bulk_schedule',
      sourceRef: input.projectIds?.join(',') ?? null,
      targetAccountIds: JSON.stringify(input.accountBindings.map((b) => b.accountBindingId)),
      firstPublishAt: scheduleTimes[0] ?? null,
      frequency: input.schedule.mode,
      runCount: items.length,
      status: 'scheduled',
      scheduleMode: input.schedule.mode,
      scheduleMetaJson: JSON.stringify(input.schedule),
    },
  });

  const jobs = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const accountId = resolveAccountForPlatform(item.platform, input.accountBindings);
    if (!accountId) {
      throw new Error(`未配置 ${item.platform} 发布账号`);
    }
    const job = await prisma.publishJob.create({
      data: {
        planId: plan.id,
        projectId: item.projectId,
        contentItemId: item.id,
        platform: item.platform,
        accountBindingId: accountId,
        scheduledAt: scheduleTimes[i],
        status: 'pending',
      },
    });
    jobs.push(job);
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { publishStatus: 'scheduled' },
    });
  }

  if (input.projectIds?.length) {
    await prisma.geoContentProject.updateMany({
      where: { id: { in: input.projectIds }, brandId: brand.id },
      data: { status: 'scheduled' },
    });
  }

  return {
    planId: plan.id,
    jobCount: jobs.length,
    jobs: jobs.map(mapJob),
  };
}

export async function listPublishJobs(brandName: string, planId?: string) {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  const rows = await prisma.publishJob.findMany({
    where: {
      plan: { brandId: brand.id },
      ...(planId ? { planId } : {}),
    },
    orderBy: { scheduledAt: 'asc' },
    take: 200,
  });
  return rows.map(mapJob);
}

const runningAccounts = new Set<string>();

export async function processDuePublishJobs(): Promise<number> {
  const now = new Date();
  const due = await prisma.publishJob.findMany({
    where: {
      status: { in: ['pending', 'ready'] },
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 20,
    include: {
      plan: true,
    },
  });

  let dispatched = 0;
  for (const job of due) {
    const accountId = job.accountBindingId;
    if (!accountId || runningAccounts.has(accountId)) continue;

    const runningForAccount = await prisma.publishJob.count({
      where: { accountBindingId: accountId, status: 'running' },
    });
    if (runningForAccount > 0) continue;

    const item = await prisma.contentItem.findUnique({ where: { id: job.contentItemId } });
    if (!item) {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: 'failed', lastErrorCode: 'content_missing' },
      });
      continue;
    }

    const brand = await prisma.brand.findUnique({ where: { id: job.plan.brandId } });
    if (!brand) continue;

    const gate = await validateAutoPublish(job.platform, brand.name);
    if (!gate.ok) {
      const rec = await prisma.publishRecord.create({
        data: {
          planId: job.planId,
          brandId: brand.id,
          contentItemId: item.id,
          platform: job.platform,
          accountBindingId: accountId,
          status: 'need_reauth',
          errorCode: gate.error,
          reviewCategory: 'need_reauth',
          executedAt: new Date(),
        },
      });
      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: 'need_manual',
          publishRecordId: rec.id,
          lastErrorCode: gate.error,
          attemptCount: { increment: 1 },
        },
      });
      continue;
    }

    const { resolvePublishBindingForBrand } = await import('./ad-account.service.js');
    const account = await resolvePublishBindingForBrand(brand.name, accountId);

    const record = await prisma.publishRecord.create({
      data: {
        planId: job.planId,
        brandId: brand.id,
        contentItemId: item.id,
        platform: job.platform,
        accountBindingId: account.id,
        status: 'pending',
        executedAt: new Date(),
      },
    });

    const task = await createAndEnqueueTask({
      type: 'hermes_publish',
      title: `${brand.name} · ${item.title.slice(0, 24)}`,
      brandName: brand.name,
      input: {
        geoProjectId: job.projectId ?? undefined,
        contentBatchId: item.batchId,
        contentItemIds: [item.id],
        contentItemId: item.id,
        publishRecordId: record.id,
        publishJobId: job.id,
        targetPlatform: job.platform,
        accountBindingId: account.id,
        accountName: account.accountName,
        title: item.title,
        content: item.fullContent,
        scheduledAt: job.scheduledAt.toISOString(),
        planId: job.planId,
        userConfirmed: true,
        requiredEvidence: ['published_url', 'screenshot', 'platform_message'],
      },
      businessRef: job.id,
    });

    runningAccounts.add(accountId);
    await prisma.publishJob.update({
      where: { id: job.id },
      data: {
        status: 'running',
        agentTaskId: task.id,
        publishRecordId: record.id,
        attemptCount: { increment: 1 },
      },
    });
    await prisma.publishPlan.update({
      where: { id: job.planId },
      data: { status: 'running' },
    });
    dispatched += 1;
  }
  return dispatched;
}

export async function updatePublishJobFromTask(
  jobId: string,
  success: boolean,
  opts?: { publishLink?: string; errorCode?: string; reviewCategory?: string }
) {
  const job = await prisma.publishJob.findUnique({ where: { id: jobId }, include: { plan: true } });
  if (!job) return;

  if (job.publishRecordId) {
    await prisma.publishRecord.update({
      where: { id: job.publishRecordId },
      data: {
        status: success ? 'succeeded' : 'failed',
        publishedUrl: opts?.publishLink ?? null,
        errorCode: opts?.errorCode ?? null,
        reviewCategory: opts?.reviewCategory ?? (success ? null : 'need_manual_publish'),
        executedAt: new Date(),
      },
    });
  }

  await prisma.publishJob.update({
    where: { id: jobId },
    data: {
      status: success ? 'succeeded' : opts?.reviewCategory === 'need_reauth' ? 'need_manual' : 'failed',
      lastErrorCode: opts?.errorCode,
    },
  });

  if (success) {
    await prisma.contentItem.update({
      where: { id: job.contentItemId },
      data: { status: 'published', publishStatus: 'published' },
    });
  } else {
    await prisma.contentItem.update({
      where: { id: job.contentItemId },
      data: { publishStatus: 'failed' },
    });
  }

  if (job.accountBindingId) runningAccounts.delete(job.accountBindingId);

  const pending = await prisma.publishJob.count({
    where: { planId: job.planId, status: { in: ['pending', 'ready', 'running'] } },
  });
  if (pending === 0) {
    const failed = await prisma.publishJob.count({
      where: { planId: job.planId, status: { in: ['failed', 'need_manual'] } },
    });
    await prisma.publishPlan.update({
      where: { id: job.planId },
      data: { status: failed > 0 ? 'partial_failed' : 'done' },
    });
  }
}
