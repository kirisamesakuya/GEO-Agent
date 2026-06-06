import type { AgentExecutor, AgentTask, AgentTaskStatus } from '../types.js';
import { DirectModelExecutor } from './direct-model.js';

const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

function mapHermesStatus(status: string): AgentTaskStatus {
  switch (status) {
    case 'queued':
    case 'pending':
      return 'queued';
    case 'running':
    case 'in_progress':
      return 'running';
    case 'completed':
    case 'succeeded':
      return 'succeeded';
    case 'failed':
    case 'error':
      return 'failed';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    default:
      return 'running';
  }
}

async function hermesFetch(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (HERMES_API_KEY) {
    headers.Authorization = `Bearer ${HERMES_API_KEY}`;
  }
  const res = await fetch(`${HERMES_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hermes API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export class NousHermesExecutor implements AgentExecutor {
  private fallback = new DirectModelExecutor();

  async submit(task: AgentTask) {
    const prompt = this.buildPrompt(task);
    const body = {
      input: prompt,
      metadata: { taskId: task.id, type: task.type },
    };
    const data = (await hermesFetch('/v1/runs', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { id?: string; run_id?: string };
    return { externalRunId: data.id ?? data.run_id };
  }

  async poll(task: AgentTask) {
    if (task.type === 'hermes_publish') {
      const health = await checkHermesHealth();
      if (!health.ok) {
        return this.fallback.poll(task);
      }
    }

    if (!task.externalRunId) {
      return this.fallback.poll(task);
    }

    try {
      const data = (await hermesFetch(`/v1/runs/${task.externalRunId}`)) as {
        status?: string;
        output?: Record<string, unknown>;
        error?: string;
      };
      const status = mapHermesStatus(data.status ?? 'running');
      if (status === 'succeeded') {
        const normalized = this.normalizeResult(task, data.output ?? {});
        return {
          status,
          progress: 100,
          output: normalized,
          log: { level: 'info' as const, message: 'Hermes 任务已完成' },
        };
      }
      if (status === 'failed') {
        return {
          status,
          progress: 100,
          errorMessage: data.error ?? 'Hermes run failed',
          userErrorMessage: 'Hermes 执行失败，可在 Agent 任务页重试',
          log: { level: 'error' as const, message: 'Hermes 执行失败', detail: data.error },
        };
      }
      return {
        status,
        progress: status === 'running' ? 50 : 10,
        log: { level: 'info' as const, message: `Hermes 状态：${data.status}` },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        progress: 0,
        errorMessage: message,
        userErrorMessage: '无法连接 Hermes API Server，请确认 gateway 已启动',
        log: { level: 'error' as const, message: 'Hermes 连接失败', detail: message },
      };
    }
  }

  async cancel(task: AgentTask) {
    if (!task.externalRunId) return;
    await hermesFetch(`/v1/runs/${task.externalRunId}/stop`, { method: 'POST' });
  }

  private buildPrompt(task: AgentTask): string {
    if (task.type === 'article_generation') {
      const { brand, targetPlatform, quantity, keywords } = task.input;
      return `Generate ${quantity} GEO-friendly articles for brand ${brand} on platform ${targetPlatform}. Keywords: ${(keywords as string[])?.join(', ')}. Return structured JSON with articles array.`;
    }
    if (task.type === 'hermes_publish') {
      return `Publish approved content batch ${task.input.contentBatchId} to ${task.input.targetPlatform} for brand ${task.input.brand}. Return JSON with publishLink.`;
    }
    return JSON.stringify(task.input);
  }

  normalizeResult(task: AgentTask, raw: Record<string, unknown>): Record<string, unknown> {
    if (task.type === 'article_generation' && raw.articles) {
      return { articles: raw.articles, batchId: `hermes-${Date.now()}` };
    }
    if (task.type === 'hermes_publish') {
      const platform = String(task.input.targetPlatform ?? '小红书');
      const batchId = String(task.input.contentBatchId ?? task.id);
      return {
        publishLink: String(raw.publishLink ?? raw.url ?? `https://publish.hermes.local/${platform}/${batchId}`),
        publishedAt: new Date().toISOString(),
        platform,
        source: 'hermes_gateway',
        ...raw,
      };
    }
    return raw;
  }
}

export async function checkHermesHealth(): Promise<{ ok: boolean; url: string; detail?: string }> {
  try {
    const res = await fetch(`${HERMES_BASE_URL}/health`, {
      headers: HERMES_API_KEY ? { Authorization: `Bearer ${HERMES_API_KEY}` } : {},
    });
    if (!res.ok) {
      return { ok: false, url: HERMES_BASE_URL, detail: `HTTP ${res.status}` };
    }
    return { ok: true, url: HERMES_BASE_URL };
  } catch (error: unknown) {
    return {
      ok: false,
      url: HERMES_BASE_URL,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
