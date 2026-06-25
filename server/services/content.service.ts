import { prisma } from '../db/client.js';
import { isAllBrandsScope } from './organization.service.js';
import type { ContentBatch, ContentItem } from '../content/types.js';

function mapItem(row: {
  id: string;
  batchId: string;
  title: string;
  platform: string;
  previewText: string;
  fullContent: string;
  structure: string;
  generationMetaJson?: string | null;
  qualityChecksJson?: string | null;
  effectBaselineJson?: string | null;
  effectVerificationJson?: string | null;
  projectId?: string | null;
  targetQuestionsJson?: string | null;
  publishStatus?: string | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ContentItem {
  return {
    id: row.id,
    batchId: row.batchId,
    projectId: row.projectId ?? undefined,
    title: row.title,
    platform: row.platform,
    targetQuestionsJson: row.targetQuestionsJson ?? undefined,
    publishStatus: row.publishStatus ?? undefined,
    previewText: row.previewText,
    fullContent: row.fullContent,
    structure: row.structure,
    generationMetaJson: row.generationMetaJson ?? undefined,
    qualityChecksJson: row.qualityChecksJson ?? undefined,
    effectBaselineJson: row.effectBaselineJson ?? undefined,
    effectVerificationJson: row.effectVerificationJson ?? undefined,
    status: row.status as ContentItem['status'],
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBatch(
  row: {
    id: string;
    brandName: string;
    platform: string;
    taskId: string | null;
    projectId?: string | null;
    articleCount: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  },
  items: ContentItem[]
): ContentBatch {
  const actualCount = items.length;
  return {
    id: row.id,
    brandName: row.brandName,
    platform: row.platform,
    projectId: row.projectId ?? undefined,
    taskId: row.taskId ?? undefined,
    articleCount: actualCount > 0 ? actualCount : row.articleCount,
    status: row.status as ContentBatch['status'],
    items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createContentBatch(input: {
  brandName: string;
  platform: string;
  projectId?: string;
  taskId?: string;
  articles: Array<{
    title: string;
    platform?: string;
    previewText: string;
    fullContent: string;
    structure: string;
    generationMetaJson?: string;
    qualityChecksJson?: string;
    effectBaselineJson?: string;
    targetQuestionsJson?: string;
  }>;
  status?: ContentBatch['status'];
}): Promise<ContentBatch> {
  const batch = await prisma.contentBatch.create({
    data: {
      brandName: input.brandName,
      platform: input.platform,
      projectId: input.projectId ?? null,
      taskId: input.taskId,
      articleCount: input.articles.length,
      status: input.status ?? 'ready',
      items: {
        create: input.articles.map((a) => ({
          title: a.title,
          platform: a.platform ?? input.platform,
          previewText: a.previewText,
          fullContent: a.fullContent,
          structure: a.structure,
          generationMetaJson: a.generationMetaJson,
          qualityChecksJson: a.qualityChecksJson,
          effectBaselineJson: a.effectBaselineJson,
          projectId: input.projectId ?? null,
          targetQuestionsJson: a.targetQuestionsJson,
          publishStatus: 'not_scheduled',
          status: 'draft',
          version: 1,
        })),
      },
    },
    include: { items: true },
  });
  return mapBatch(batch, batch.items.map(mapItem));
}

export async function listContentBatches(filters?: {
  brandName?: string;
  platform?: string;
  projectId?: string;
  limit?: number;
}): Promise<ContentBatch[]> {
  const brandFilter =
    filters?.brandName && !isAllBrandsScope(filters.brandName)
      ? { brandName: filters.brandName }
      : {};
  const rows = await prisma.contentBatch.findMany({
    where: {
      ...brandFilter,
      ...(filters?.platform ? { platform: filters.platform } : {}),
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
  });
  return rows.map((r) => mapBatch(r, r.items.map(mapItem)));
}

export async function getContentBatch(id: string): Promise<ContentBatch | undefined> {
  const row = await prisma.contentBatch.findUnique({
    where: { id },
    include: { items: true },
  });
  return row ? mapBatch(row, row.items.map(mapItem)) : undefined;
}

export async function confirmBatchPublish(batchId: string, brandName: string) {
  const batch = await prisma.contentBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error('内容批次不存在');

  const { createAndEnqueueTask } = await import('../agent/worker.js');
  const { resolveExecutorKindForTask } = await import('../agent/executors/index.js');
  const { appendAuditLog } = await import('./audit.service.js');

  const task = await createAndEnqueueTask({
    type: 'hermes_publish',
    title: `${brandName} · ${batch.platform} 自动发布`,
    brandName,
    input: {
      brand: brandName,
      targetPlatform: batch.platform,
      contentBatchId: batchId,
      userConfirmed: true,
    },
    executor: await resolveExecutorKindForTask('hermes_publish'),
    businessRef: batchId,
  });

  await appendAuditLog({
    action: 'publish_confirm',
    entity: 'ContentBatch',
    entityId: batchId,
    detail: batch.platform,
  });

  return task;
}

export async function updateContentItem(
  batchId: string,
  itemId: string,
  patch: Partial<
    Pick<
      ContentItem,
      'title' | 'previewText' | 'fullContent' | 'structure' | 'status' | 'generationMetaJson'
    >
  >
): Promise<ContentItem | undefined> {
  const existing = await prisma.contentItem.findFirst({ where: { id: itemId, batchId } });
  if (!existing) return undefined;
  const row = await prisma.contentItem.update({
    where: { id: itemId },
    data: {
      ...patch,
      version: existing.version + 1,
    },
  });
  return mapItem(row);
}

/** 批量删除文章；若批次下无剩余文章则删除空批次 */
export async function deleteContentItems(input: {
  itemIds: string[];
  brandName?: string;
}): Promise<{ deletedItemIds: string[]; deletedBatchIds: string[] }> {
  const ids = [...new Set(input.itemIds.filter(Boolean))];
  if (ids.length === 0) return { deletedItemIds: [], deletedBatchIds: [] };

  const rows = await prisma.contentItem.findMany({
    where: {
      id: { in: ids },
      ...(input.brandName && !isAllBrandsScope(input.brandName)
        ? { batch: { brandName: input.brandName } }
        : {}),
    },
    select: { id: true, batchId: true },
  });
  if (rows.length === 0) return { deletedItemIds: [], deletedBatchIds: [] };

  const foundIds = rows.map((r) => r.id);
  const batchIds = [...new Set(rows.map((r) => r.batchId))];

  await prisma.contentItem.deleteMany({ where: { id: { in: foundIds } } });

  const deletedBatchIds: string[] = [];
  for (const batchId of batchIds) {
    const remain = await prisma.contentItem.count({ where: { batchId } });
    if (remain === 0) {
      await prisma.contentBatch.delete({ where: { id: batchId } });
      deletedBatchIds.push(batchId);
    } else {
      await prisma.contentBatch.update({
        where: { id: batchId },
        data: { articleCount: remain },
      });
    }
  }

  return { deletedItemIds: foundIds, deletedBatchIds };
}

/**
 * 内容库 Hermes 发布：默认走本机 Hermes（nous_hermes）；仅 GEO_SKILL_MOCK_DEMO + mockHermes 时模拟。
 */
export async function enqueueHermesPublishFromLibrary(input: {
  brandName: string;
  batchId: string;
  contentItemIds: string[];
  accountBindingId: string;
  mockHermes?: boolean;
}) {
  const { findBrandRow } = await import('./brand.service.js');
  const { resolvePublishBindingForBrand } = await import('./ad-account.service.js');
  const {
    buildHermesPublishInput,
    createHermesPublishTask,
    allowsHermesPublishMock,
  } = await import('../lib/hermes-publish.js');

  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');

  const batch = await getContentBatch(input.batchId);
  if (!batch || batch.brandName !== brand.name) throw new Error('内容批次不存在');

  const { buildHermesAutoPublishBlockedMessage, isHermesAutoPublishSupported } = await import(
    '../../lib/publish-platform-capability.js'
  );
  if (!isHermesAutoPublishSupported(batch.platform)) {
    throw new Error(buildHermesAutoPublishBlockedMessage([batch.platform]));
  }

  const selectedItems = input.contentItemIds.length
    ? batch.items.filter((item) => input.contentItemIds.includes(item.id))
    : batch.items;
  if (selectedItems.length === 0) throw new Error('请选择要发布的文章');

  const account = await resolvePublishBindingForBrand(input.brandName, input.accountBindingId);

  const publishInput = buildHermesPublishInput({
    brandName: brand.name,
    batchId: batch.id,
    platform: batch.platform,
    account,
    items: selectedItems,
    extra: input.mockHermes ? { mockHermes: true } : undefined,
  });

  const task = await createHermesPublishTask({
    title: `${brand.name} · ${batch.platform} 内容库 Hermes 发布（${selectedItems.length} 篇）`,
    brandName: brand.name,
    input: publishInput,
    businessRef: batch.id,
  });

  const mock = allowsHermesPublishMock(publishInput);

  return {
    task,
    mock,
    itemCount: selectedItems.length,
    platform: batch.platform,
    accountName: account.accountName,
  };
}
