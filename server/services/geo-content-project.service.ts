import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';

export type GeoProjectSourceType = 'geo_report' | 'indexing_gap' | 'manual' | 'geo_project';
export type GeoProjectStatus =
  | 'draft'
  | 'writing'
  | 'ready'
  | 'scheduled'
  | 'publishing'
  | 'done'
  | 'partial_failed';

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function projectStats(items: Array<{ status: string; publishStatus: string; platform: string }>) {
  const byPlatform = new Map<string, number>();
  let generated = 0;
  let confirmed = 0;
  let published = 0;
  let scheduled = 0;
  for (const item of items) {
    generated += 1;
    byPlatform.set(item.platform, (byPlatform.get(item.platform) ?? 0) + 1);
    if (item.status === 'draft') confirmed += 0;
    else confirmed += item.status !== 'archived' ? 1 : 0;
    if (item.publishStatus === 'scheduled') scheduled += 1;
    if (item.status === 'published' || item.publishStatus === 'published') published += 1;
  }
  return {
    contentTotal: generated,
    contentConfirmed: confirmed,
    contentPublished: published,
    contentScheduled: scheduled,
    byPlatform: Object.fromEntries(byPlatform),
  };
}

function mapProject(row: {
  id: string;
  brandId: string;
  name: string;
  sourceType: string;
  sourceRef: string | null;
  targetQuestionsJson: string;
  targetKeywordsJson: string;
  targetAiPlatformsJson: string;
  targetPublishPlatformsJson: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    brandId: row.brandId,
    name: row.name,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef ?? undefined,
    targetQuestions: parseJsonArray(row.targetQuestionsJson),
    targetKeywords: parseJsonArray(row.targetKeywordsJson),
    targetAiPlatforms: parseJsonArray(row.targetAiPlatformsJson),
    targetPublishPlatforms: parseJsonArray(row.targetPublishPlatformsJson),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureLegacyContentProject(brand: { id: string; name: string }) {
  const orphanBatches = await prisma.contentBatch.findMany({
    where: { brandName: brand.name, projectId: null },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  if (orphanBatches.length === 0) return null;

  const platforms = [...new Set(orphanBatches.map((b) => b.platform).filter(Boolean))];
  const existing = await prisma.geoContentProject.findFirst({
    where: {
      brandId: brand.id,
      sourceType: 'manual',
      sourceRef: 'legacy-content-batches',
    },
  });
  const project =
    existing ??
    (await prisma.geoContentProject.create({
      data: {
        brandId: brand.id,
        name: `${brand.name} · 历史内容归档`,
        sourceType: 'manual',
        sourceRef: 'legacy-content-batches',
        targetPublishPlatformsJson: JSON.stringify(platforms),
        status: 'ready',
      },
    }));

  const batchIds = orphanBatches.map((b) => b.id);
  const itemIds = orphanBatches.flatMap((b) => b.items.map((i) => i.id));
  await prisma.contentBatch.updateMany({
    where: { id: { in: batchIds } },
    data: { projectId: project.id },
  });
  if (itemIds.length > 0) {
    await prisma.contentItem.updateMany({
      where: { id: { in: itemIds } },
      data: { projectId: project.id },
    });
  }
  await prisma.geoContentProject.update({
    where: { id: project.id },
    data: {
      targetPublishPlatformsJson: JSON.stringify(platforms),
      status: 'ready',
      updatedAt: new Date(),
    },
  });

  return project.id;
}

export async function createGeoContentProject(input: {
  brandName: string;
  name: string;
  sourceType?: GeoProjectSourceType;
  sourceRef?: string;
  targetQuestions?: string[];
  targetKeywords?: string[];
  targetAiPlatforms?: string[];
  targetPublishPlatforms?: string[];
  status?: GeoProjectStatus;
}) {
  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');
  const row = await prisma.geoContentProject.create({
    data: {
      brandId: brand.id,
      name: input.name.trim(),
      sourceType: input.sourceType ?? 'manual',
      sourceRef: input.sourceRef ?? null,
      targetQuestionsJson: JSON.stringify(input.targetQuestions ?? []),
      targetKeywordsJson: JSON.stringify(input.targetKeywords ?? []),
      targetAiPlatformsJson: JSON.stringify(input.targetAiPlatforms ?? []),
      targetPublishPlatformsJson: JSON.stringify(input.targetPublishPlatforms ?? []),
      status: input.status ?? 'draft',
    },
  });
  return mapProject(row);
}

export async function listGeoContentProjects(brandName: string) {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  await ensureLegacyContentProject({ id: brand.id, name: brand.name });
  const rows = await prisma.geoContentProject.findMany({
    where: { brandId: brand.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  const projectIds = rows.map((r) => r.id);
  const items = projectIds.length
    ? await prisma.contentItem.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, status: true, publishStatus: true, platform: true },
      })
    : [];
  const jobs = projectIds.length
    ? await prisma.publishJob.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, status: true },
      })
    : [];

  return rows.map((row) => {
    const projectItems = items.filter((i) => i.projectId === row.id);
    const stats = projectStats(projectItems);
    const projectJobs = jobs.filter((j) => j.projectId === row.id);
    const pendingJobs = projectJobs.filter((j) =>
      ['pending', 'ready', 'running'].includes(j.status)
    ).length;
    const failedJobs = projectJobs.filter((j) =>
      ['failed', 'need_manual'].includes(j.status)
    ).length;
    let publishProgress = '待排程';
    if (pendingJobs > 0) publishProgress = '待发布';
    if (projectJobs.some((j) => j.status === 'running')) publishProgress = '执行中';
    if (stats.contentPublished > 0 && failedJobs === 0 && pendingJobs === 0) publishProgress = '已完成';
    if (failedJobs > 0) publishProgress = '部分失败';

    return {
      ...mapProject(row),
      stats,
      publishProgress,
    };
  });
}

export async function getGeoContentProject(id: string, brandName?: string) {
  if (brandName) {
    const brand = await findBrandRow(brandName);
    if (brand) await ensureLegacyContentProject({ id: brand.id, name: brand.name });
  }
  const row = await prisma.geoContentProject.findUnique({
    where: { id },
    include: {
      items: { orderBy: { updatedAt: 'desc' } },
      batches: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!row) return null;
  if (brandName) {
    const brand = await findBrandRow(brandName);
    if (!brand || row.brandId !== brand.id) return null;
  }
  const stats = projectStats(row.items);
  const jobs = await prisma.publishJob.findMany({
    where: { projectId: row.id },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });
  return {
    ...mapProject(row),
    stats,
    items: row.items.map((item) => ({
      id: item.id,
      batchId: item.batchId,
      title: item.title,
      platform: item.platform,
      targetQuestions: parseJsonArray(item.targetQuestionsJson),
      status: item.status,
      publishStatus: item.publishStatus,
      previewText: item.previewText,
      updatedAt: item.updatedAt.toISOString(),
    })),
    batches: row.batches.map((b) => ({
      id: b.id,
      platform: b.platform,
      articleCount: b.articleCount,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    })),
    publishJobs: jobs.map((j) => ({
      id: j.id,
      contentItemId: j.contentItemId,
      platform: j.platform,
      scheduledAt: j.scheduledAt.toISOString(),
      status: j.status,
    })),
  };
}

export async function ensureProjectFromArticleTask(input: {
  brandName: string;
  geoProjectId?: string;
  sourceType?: string;
  geoReportId?: string | null;
  sourceIndexPlanId?: string | null;
  targetQuestions?: string[];
  targetKeywords?: string[];
  targetPlatforms?: string[];
  targetPlatform?: string;
  taskTitle?: string;
}) {
  if (input.geoProjectId) {
    const existing = await prisma.geoContentProject.findUnique({ where: { id: input.geoProjectId } });
    if (existing) return existing.id;
  }

  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');

  let sourceType: GeoProjectSourceType = 'manual';
  let sourceRef: string | undefined;
  let name = input.taskTitle?.slice(0, 48) ?? `${input.brandName} · GEO 写作项目`;

  if (input.sourceType === 'indexing_result' || input.sourceIndexPlanId) {
    sourceType = 'indexing_gap';
    sourceRef = input.sourceIndexPlanId ?? undefined;
    const q = input.targetQuestions?.[0];
    name = q ? `${input.brandName} · ${q.slice(0, 20)}补缺` : `${input.brandName} · 排名缺口项目`;
  } else if (input.sourceType === 'geo_report' || input.geoReportId) {
    sourceType = 'geo_report';
    sourceRef = input.geoReportId ?? undefined;
    name = `${input.brandName} · GEO 报告写作项目`;
  }

  const publishPlatforms = input.targetPlatform
    ? [input.targetPlatform]
    : input.targetPlatforms?.length
      ? input.targetPlatforms
      : ['小红书', '知乎'];

  const project = await prisma.geoContentProject.create({
    data: {
      brandId: brand.id,
      name,
      sourceType,
      sourceRef: sourceRef ?? null,
      targetQuestionsJson: JSON.stringify(input.targetQuestions ?? []),
      targetKeywordsJson: JSON.stringify(input.targetKeywords ?? []),
      targetAiPlatformsJson: JSON.stringify(input.targetPlatforms ?? []),
      targetPublishPlatformsJson: JSON.stringify(publishPlatforms),
      status: 'writing',
    },
  });
  return project.id;
}

export async function attachBatchToProject(
  projectId: string,
  batchId: string,
  itemIds: string[],
  targetQuestions?: string[]
) {
  await prisma.contentBatch.update({
    where: { id: batchId },
    data: { projectId },
  });
  await prisma.contentItem.updateMany({
    where: { id: { in: itemIds } },
    data: {
      projectId,
      ...(targetQuestions?.length
        ? { targetQuestionsJson: JSON.stringify(targetQuestions) }
        : {}),
    },
  });
  await prisma.geoContentProject.update({
    where: { id: projectId },
    data: { status: 'ready', updatedAt: new Date() },
  });
}
