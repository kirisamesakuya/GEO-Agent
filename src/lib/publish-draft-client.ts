/** 内容库统一发布入口：publish-draft → Hermes 执行 */
export async function submitPublishDraft(params: {
  batchId: string;
  brandName: string;
  accountBindingId: string;
  contentItemIds: string[];
}): Promise<{ task?: { id: string }; error?: string }> {
  const res = await fetch(`/api/content-batches/${params.batchId}/publish-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: params.brandName,
      accountBindingId: params.accountBindingId,
      contentItemIds: params.contentItemIds,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    task?: { id: string };
  };
  if (!res.ok || data.error) {
    throw new Error(data.error ?? '发布确认失败');
  }
  return data;
}
