import type { AgentTask } from '../types';

export type HermesPublishSubmitMode = 'hermes_route' | 'agent_tasks' | 'client_mock';

export interface HermesPublishSubmitResult {
  mode: HermesPublishSubmitMode;
  taskId?: string;
}

export interface HermesPublishSubmitParams {
  batchId: string;
  brandName: string;
  platform: string;
  accountBindingId: string;
  accountName: string;
  contentItemIds: string[];
  contentTitles?: string[];
}

function buildTaskInput(params: HermesPublishSubmitParams) {
  return {
    contentBatchId: params.batchId,
    contentItemIds: params.contentItemIds,
    contentTitles: params.contentTitles ?? [],
    targetPlatform: params.platform,
    accountBindingId: params.accountBindingId,
    accountName: params.accountName,
    userConfirmed: true,
    mockHermes: true,
  };
}

function isMissingRoute(res: Response, data?: { error?: string }) {
  return res.status === 404 || data?.error === 'API route not found';
}

/** 优先 hermes-publish；旧服务端回退 agent-tasks；再回退纯前端 Mock */
export async function submitHermesPublish(
  params: HermesPublishSubmitParams
): Promise<HermesPublishSubmitResult> {
  const body = {
    brandName: params.brandName,
    accountBindingId: params.accountBindingId,
    contentItemIds: params.contentItemIds,
  };
  const title = `${params.brandName} · ${params.platform} 文章结果 Hermes 发布（${params.contentItemIds.length} 篇）`;
  const input = buildTaskInput(params);

  let res = await fetch(`/api/content-batches/${params.batchId}/hermes-publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = (await res.json().catch(() => ({}))) as {
    error?: string;
    task?: { id: string };
  };

  if (res.ok && data.task?.id) {
    return { mode: 'hermes_route', taskId: data.task.id };
  }
  if (res.ok && data.error) throw new Error(data.error);

  if (!isMissingRoute(res, data)) {
    if (data.error) throw new Error(data.error);
  }

  res = await fetch('/api/agent-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'hermes_publish',
      title,
      brandName: params.brandName,
      businessRef: params.batchId,
      executor: 'direct_model',
      input,
    }),
  });
  data = (await res.json().catch(() => ({}))) as { error?: string; task?: { id: string } };

  if (res.ok && data.task?.id) {
    return { mode: 'agent_tasks', taskId: data.task.id };
  }
  if (res.ok && data.error) throw new Error(data.error);
  if (!isMissingRoute(res, data) && data.error) throw new Error(data.error);

  return { mode: 'client_mock' };
}

const HERMES_MOCK_STEPS: Array<{ progress: number; message: string }> = [
  { progress: 12, message: '连接本机 Hermes…' },
  { progress: 32, message: '打开创作后台…' },
  { progress: 55, message: '填写正文与标题…' },
  { progress: 78, message: '校验账号与登录态…' },
  { progress: 92, message: '模拟提交发布…' },
  { progress: 100, message: '发布完成' },
];

export async function runClientMockHermesPublish(
  params: HermesPublishSubmitParams,
  onProgress: (progress: number, message: string) => void
): Promise<{ publishLink: string; publishedCount: number }> {
  for (const step of HERMES_MOCK_STEPS) {
    await new Promise((r) => setTimeout(r, 420));
    onProgress(step.progress, step.message);
  }
  const count = params.contentItemIds.length || 1;
  const publishLink = `https://publish-demo.geo.local/${encodeURIComponent(params.platform)}/${params.batchId}?n=${count}&mock=1`;
  return { publishLink, publishedCount: count };
}

export function hermesTaskProgressMessage(task: AgentTask, platform?: string): string {
  const label = platform ? `${platform} · ` : '';
  if (task.status === 'queued') return `${label}Hermes 排队中…`;
  if (task.status === 'running') {
    if (task.progress >= 70) return `${label}Hermes 正在提交…`;
    if (task.progress >= 35) return `${label}Hermes 填写正文中…`;
    return `${label}Hermes 打开创作后台…`;
  }
  if (task.status === 'succeeded') return `${label}Hermes 发布完成`;
  if (task.status === 'failed') return `${label}Hermes 发布失败`;
  return `${label}Hermes 工作中…`;
}

export async function waitForHermesAgentTask(
  taskId: string,
  onProgress: (progress: number, message: string, task: AgentTask) => void,
  maxMs = 25000
): Promise<AgentTask | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await fetch(`/api/agent-tasks/${taskId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { task?: AgentTask };
    const task = data.task;
    if (!task) return null;
    onProgress(task.progress ?? 10, hermesTaskProgressMessage(task), task);
    if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'canceled') {
      return task;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export function mockPublishLinkFromTask(task: AgentTask): string | undefined {
  const link = task.output?.publishLink;
  return link ? String(link) : undefined;
}
