import type { AgentTask } from '../agent/types.js';

export type PublishEvidenceItem = {
  contentItemId: string;
  title: string;
  status: 'published' | 'failed' | 'need_manual';
  publishLink?: string;
  screenshotUrl?: string;
  platformMessage?: string;
  errorCode?: string;
};

export function buildMockHermesPublishOutput(task: AgentTask) {
  const platform = String(task.input.targetPlatform ?? '小红书');
  const batchId = String(task.input.contentBatchId ?? task.businessRef ?? '');
  const accountName = String(task.input.accountName ?? '自有绑定账号');
  const itemIds = Array.isArray(task.input.contentItemIds)
    ? task.input.contentItemIds.map((id) => String(id))
    : [];
  const titles = Array.isArray(task.input.contentTitles)
    ? task.input.contentTitles.map((t) => String(t))
    : [];
  const count = Math.max(itemIds.length, 1);

  const evidenceItems: PublishEvidenceItem[] = (itemIds.length ? itemIds : ['demo-item']).map(
    (id, index) => {
      const title = titles[index] ?? `文章 ${index + 1}`;
      const simulateManual = index === itemIds.length - 1 && itemIds.length > 1;
      if (simulateManual) {
        return {
          contentItemId: id,
          title,
          status: 'need_manual' as const,
          platformMessage: '平台提示：需人工完成最后一步确认',
          errorCode: 'need_manual_publish',
          screenshotUrl: `https://publish-demo.geo.local/evidence/${task.id}/${id}.png`,
        };
      }
      const publishLink = `https://publish-demo.geo.local/${encodeURIComponent(platform)}/${batchId || task.id}/${id}`;
      return {
        contentItemId: id,
        title,
        status: 'published' as const,
        publishLink,
        screenshotUrl: `https://publish-demo.geo.local/evidence/${task.id}/${id}.png`,
        platformMessage: '发布成功（Mock Hermes）',
      };
    }
  );

  const publishedItems = evidenceItems.filter((e) => e.status === 'published');
  const failedItems = evidenceItems.filter((e) => e.status !== 'published');
  const publishLink = publishedItems[0]?.publishLink ?? null;
  const allPublished = failedItems.length === 0;
  const partial = publishedItems.length > 0 && failedItems.length > 0;

  return {
    status: (allPublished ? 'succeeded' : partial ? 'partial' : 'failed') as
      | 'succeeded'
      | 'partial'
      | 'failed',
    output: {
      publishLink,
      publishedAt: new Date().toISOString(),
      platform,
      accountName,
      publishedCount: publishedItems.length,
      failedCount: failedItems.length,
      contentItemIds: itemIds,
      contentTitles: titles,
      evidenceItems,
      reviewCategory: allPublished
        ? null
        : failedItems.some((e) => e.errorCode === 'need_reauth')
          ? 'need_reauth'
          : 'need_manual_publish',
      evidence: `Mock Hermes 发布 ${publishedItems.length}/${count} 篇；${failedItems.length ? `${failedItems.length} 篇需人工处理` : '全部成功'}`,
      source: 'mock_hermes_publish',
    },
    userErrorMessage: allPublished
      ? undefined
      : partial
        ? '部分文章发布成功，其余需人工处理'
        : '自动发布失败，请改用手动发布',
    errorMessage: allPublished ? undefined : 'hermes_publish_partial_or_failed',
    logMessage: `Mock Hermes：${accountName} → ${platform}，成功 ${publishedItems.length}/${count} 篇`,
  };
}

export function buildMockAccountVerifyOutput(task: AgentTask) {
  const platform = String(task.input.platform ?? '');
  const accountName = String(task.input.accountName ?? '绑定账号');
  const simulateFail = String(task.input.simulateVerifyFail ?? '') === 'true';
  if (simulateFail) {
    return {
      status: 'failed' as const,
      output: {
        verified: false,
        platform,
        accountName,
        authMethod: 'browser',
        checkedAt: new Date().toISOString(),
        evidence: 'Mock：未检测到有效登录态',
        reviewCategory: 'need_reauth',
        source: 'mock_account_verify',
      },
      userErrorMessage: '未检测到有效登录态，请重新授权后校验',
      errorMessage: 'account_verify_failed',
    };
  }
  return {
    status: 'succeeded' as const,
    output: {
      verified: true,
      platform,
      accountName,
      authMethod: 'browser',
      checkedAt: new Date().toISOString(),
      evidence: 'Mock Hermes：已检测到创作后台登录态（未读取 Cookie）',
      source: 'mock_account_verify',
    },
    logMessage: `Mock 账号校验通过：${platform} · ${accountName}`,
  };
}
