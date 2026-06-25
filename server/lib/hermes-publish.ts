import type { AgentTask } from '../agent/types.js';
import { isGeoSkillMockDemoMode } from './agent-status.js';

export type PublishEvidenceItem = {
  contentItemId: string;
  title: string;
  status: 'published' | 'failed' | 'need_manual';
  publishLink?: string;
  screenshotUrl?: string;
  platformMessage?: string;
  errorCode?: string;
};

/** 仅 GEO_SKILL_MOCK_DEMO=true 且显式 mockHermes 时走本地 Mock */
export function allowsHermesPublishMock(input?: Record<string, unknown>): boolean {
  return isGeoSkillMockDemoMode() && Boolean(input?.mockHermes);
}

export function buildHermesPublishInput(params: {
  brandName: string;
  batchId: string;
  platform: string;
  account: { id: string; accountName: string };
  items: Array<{ id: string; title: string; fullContent?: string; previewText?: string }>;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    brandName: params.brandName,
    contentBatchId: params.batchId,
    contentItemIds: params.items.map((i) => i.id),
    contentTitles: params.items.map((i) => i.title),
    contentItems: params.items.map((i) => ({
      contentItemId: i.id,
      title: i.title,
      content: i.fullContent ?? i.previewText ?? '',
    })),
    targetPlatform: params.platform,
    accountBindingId: params.account.id,
    accountName: params.account.accountName,
    accountId: params.account.id,
    userConfirmed: true,
    ...params.extra,
  };
}

function mapEvidenceStatus(status: string): PublishEvidenceItem['status'] {
  if (status === 'published') return 'published';
  if (status === 'manual_required' || status === 'need_manual' || status === 'skipped') {
    return 'need_manual';
  }
  return 'failed';
}

export function normalizeHermesPublishOutput(
  raw: Record<string, unknown>,
  taskInput?: Record<string, unknown>
): Record<string, unknown> {
  const platform = String(raw.platform ?? taskInput?.targetPlatform ?? '小红书');
  const itemIds = Array.isArray(taskInput?.contentItemIds)
    ? taskInput.contentItemIds.map((id) => String(id))
    : [];
  const titles = Array.isArray(taskInput?.contentTitles)
    ? taskInput.contentTitles.map((t) => String(t))
    : [];

  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.evidenceItems)
      ? raw.evidenceItems
      : [];

  const evidenceItems: PublishEvidenceItem[] = itemsRaw.map((row, index) => {
    const item = row as Record<string, unknown>;
    const contentItemId = String(item.contentItemId ?? item.id ?? itemIds[index] ?? `item-${index}`);
    const status = mapEvidenceStatus(String(item.status ?? 'failed'));
    return {
      contentItemId,
      title: String(item.title ?? titles[index] ?? ''),
      status,
      publishLink:
        typeof item.publishLink === 'string'
          ? item.publishLink
          : typeof item.url === 'string'
            ? item.url
            : undefined,
      screenshotUrl:
        typeof item.evidenceUrl === 'string'
          ? item.evidenceUrl
          : typeof item.screenshotUrl === 'string'
            ? item.screenshotUrl
            : undefined,
      platformMessage:
        typeof item.platformMessage === 'string'
          ? item.platformMessage
          : typeof item.errorMessage === 'string'
            ? item.errorMessage
            : undefined,
      errorCode:
        status === 'need_manual'
          ? 'need_manual_publish'
          : typeof item.errorCode === 'string'
            ? item.errorCode
            : undefined,
    };
  });

  const publishedItems = evidenceItems.filter((e) => e.status === 'published');
  const failedItems = evidenceItems.filter((e) => e.status !== 'published');
  const publishLink =
    (typeof raw.publishLink === 'string' ? raw.publishLink : null) ??
    publishedItems[0]?.publishLink ??
    null;

  let reviewCategory =
    typeof raw.reviewCategory === 'string' ? raw.reviewCategory : null;
  if (!reviewCategory && failedItems.some((e) => e.status === 'need_manual')) {
    reviewCategory = 'need_manual_publish';
  }

  return {
    ...raw,
    platform,
    publishLink,
    publishedAt:
      typeof raw.publishedAt === 'string' ? raw.publishedAt : new Date().toISOString(),
    publishedCount: publishedItems.length,
    failedCount: failedItems.length,
    evidenceItems,
    source: raw.source ?? 'hermes_gateway',
    accountName: raw.accountName ?? taskInput?.accountName,
    reviewCategory,
  };
}

/** 根据 evidenceItems 推导任务终态（Hermes run 常为 succeeded） */
export function deriveHermesPublishTaskStatus(
  normalized: Record<string, unknown>
): 'succeeded' | 'partial' | 'failed' {
  const published = Number(normalized.publishedCount ?? 0);
  const failed = Number(normalized.failedCount ?? 0);
  if (published > 0 && failed > 0) return 'partial';
  if (published > 0) return 'succeeded';
  if (failed > 0) return 'failed';
  return 'succeeded';
}

export async function createHermesPublishTask(params: {
  title: string;
  brandName: string;
  input: Record<string, unknown>;
  businessRef: string;
}): Promise<AgentTask> {
  const { createAndEnqueueTask } = await import('../agent/worker.js');
  const { resolveExecutorKindForTask } = await import('../agent/executors/index.js');

  const useMock = allowsHermesPublishMock(params.input);
  const input = { ...params.input, userConfirmed: true };
  if (useMock) {
    input.mockHermes = true;
  } else {
    delete input.mockHermes;
  }

  const executor = useMock ? 'direct_model' : await resolveExecutorKindForTask('hermes_publish');

  return createAndEnqueueTask({
    type: 'hermes_publish',
    title: params.title,
    brandName: params.brandName,
    executor,
    input,
    businessRef: params.businessRef,
  });
}
