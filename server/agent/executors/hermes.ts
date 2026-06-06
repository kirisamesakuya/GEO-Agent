import type { AgentExecutor, AgentTask, AgentTaskStatus } from '../types.js';
import { DirectModelExecutor } from './direct-model.js';
import { skillNameForTaskType } from '../../lib/agent-skill.js';

const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';
/** Hermes 任务最长等待时间（毫秒），超时后返回 running 让 worker 下次继续轮询 */
const HERMES_POLL_TIMEOUT_MS = 300_000; // 5 分钟
const HERMES_POLL_INTERVAL_MS = 3_000; // 每 3 秒查询一次

function isDemoMode(): boolean {
  return process.env.GEO_DEMO_MODE === '1' || process.env.NODE_ENV !== 'production';
}

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
    const skill = skillNameForTaskType(task.type);
    const body = {
      skill,
      input: {
        brandName: task.brandName ?? (task.input.brand as string),
        ...task.input,
      },
      metadata: {
        taskId: task.id,
        type: task.type,
        skill,
      },
    };
    const data = (await hermesFetch('/v1/runs', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { id?: string; run_id?: string };
    return { externalRunId: data.id ?? data.run_id };
  }

  async poll(task: AgentTask): Promise<Awaited<ReturnType<AgentExecutor['poll']>>> {
    if (!task.externalRunId) {
      if (isDemoMode()) {
        return this.fallback.poll(task) as ReturnType<AgentExecutor['poll']>;
      }
      return {
        status: 'failed',
        progress: 0,
        errorMessage: 'Hermes run 未创建',
        userErrorMessage: '本机 Hermes 未就绪，请完成安装与绑定',
        log: { level: 'error', message: '缺少 Hermes externalRunId，生产环境禁止静默 mock' },
      };
    }

    const started = Date.now();

    while (Date.now() - started < HERMES_POLL_TIMEOUT_MS) {
      try {
        const data = (await hermesFetch(`/v1/runs/${task.externalRunId}`)) as {
          status?: string;
          output?: Record<string, unknown>;
          error?: string;
          progress?: number;
          summary?: string;
          artifacts?: Array<{
            type: string;
            name: string;
            url?: string;
            preview?: string;
          }>;
        };

        const status = mapHermesStatus(data.status ?? 'running') as AgentTaskStatus;
        const progress = data.progress ?? (status === 'succeeded' ? 100 : status === 'running' ? 50 : 10);

        // 终端状态：直接返回
        if (status === 'succeeded') {
          const normalized = this.normalizeResult(task, data.output ?? {}, data);
          return {
            status,
            progress: 100,
            output: normalized,
            log: { level: 'info' as const, message: data.summary ?? 'Hermes 任务已完成' },
          };
        }

        if (status === 'failed') {
          return {
            status,
            progress,
            errorMessage: data.error ?? 'Hermes run failed',
            userErrorMessage: 'Hermes 执行失败，可在 Agent 任务页重试',
            log: {
              level: 'error' as const,
              message: 'Hermes 执行失败',
              detail: data.error,
            },
          };
        }

        if (status === 'canceled') {
          return {
            status,
            progress,
            errorMessage: '任务已取消',
            log: { level: 'info' as const, message: 'Hermes 任务已取消' },
          };
        }

        // 非终端状态：等一会再查
        await new Promise((resolve) => setTimeout(resolve, HERMES_POLL_INTERVAL_MS));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // 连接失败，降级到 Mock
        if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
          if (isDemoMode()) {
            return this.fallback.poll(task) as unknown as Awaited<ReturnType<AgentExecutor['poll']>>;
          }
          return {
            status: 'failed' as const,
            progress: 0,
            errorMessage: message,
            userErrorMessage: '无法连接本机 Hermes，请确认 Hermes 已启动并完成绑定',
            log: { level: 'error' as const, message: 'Hermes 连接失败', detail: message },
          };
        }
        return {
          status: 'failed' as const,
          progress: 0,
          errorMessage: message,
          userErrorMessage: '无法连接 Hermes API Server，请确认 gateway 已启动',
          log: { level: 'error' as const, message: 'Hermes 连接失败', detail: message },
        };
      }
    }

    // 超时：返回 running 状态，让 worker 稍后重新 poll
    return {
      status: 'running',
      progress: 50,
      log: {
        level: 'info' as const,
        message: 'Hermes 任务仍在执行中，等待下次轮询',
      },
    };
  }

  async cancel(task: AgentTask) {
    if (!task.externalRunId) return;
    try {
      await hermesFetch(`/v1/runs/${task.externalRunId}/stop`, { method: 'POST' });
    } catch {
      // best-effort cancel
    }
  }

  /**
   * 将 Hermes 返回的原始 output 规范化为 GEO-Agent 内部格式。
   */
  private normalizeResult(
    task: AgentTask,
    raw: Record<string, unknown>,
    runData?: { artifacts?: Array<{ type: string; name: string; url?: string }> },
  ): Record<string, unknown> {
    // GEO 技能：快速检测 / 专业审计 / Schema / llmstxt / citability / compare / report_pdf
    const geoSkillTypes = new Set([
      'geo_quick_start',
      'geo_audit',
      'geo_schema',
      'geo_llmstxt',
      'geo_citability',
      'geo_report_pdf',
      'geo_compare',
    ]);

    if (geoSkillTypes.has(task.type)) {
      return {
        audit: raw.audit ?? raw,
        data: raw.data ?? {
          brandMentionSummary: raw.summary ?? (raw.brandMentionSummary as string),
          competitorAnalysis: raw.competitorAnalysis ?? '',
          contentGap: raw.contentGap ?? '',
          optimizationSuggestions: raw.optimizationSuggestions ?? '',
        },
        metrics: raw.metrics ?? raw.scores ?? {},
        findings: raw.findings ?? [],
        artifacts: raw.artifacts ?? runData?.artifacts ?? [],
        actionPlan: raw.actionPlan ?? [],
        ...raw,
      };
    }

    // 文章生成
    if (task.type === 'article_generation' || task.type === 'article_rewrite') {
      return {
        articles: raw.articles ?? [],
        qualityChecks: raw.qualityChecks ?? {},
        ...raw,
      };
    }

    // 发布任务
    if (task.type === 'hermes_publish') {
      const platform = String(task.input.targetPlatform ?? '小红书');
      const batchId = String(task.input.contentBatchId ?? task.id);
      return {
        publishLink:
          raw.publishLink ?? raw.url ?? `https://publish.hermes.local/${platform}/${batchId}`,
        publishedAt: new Date().toISOString(),
        platform,
        source: 'hermes_gateway',
        ...raw,
      };
    }

    // 账号校验
    if (task.type === 'account_verify') {
      return {
        verified: Boolean(raw.verified ?? raw.ok ?? true),
        platform: String(task.input.platform ?? raw.platform ?? ''),
        accountName: raw.accountName as string,
        authMethod: raw.authMethod as string,
        ...raw,
      };
    }

    return raw;
  }
}

const HERMES_DESKTOP_STATUS_URL =
  process.env.HERMES_DESKTOP_STATUS_URL ?? 'http://127.0.0.1:9120/api/status';

type HermesDesktopStatus = {
  version?: string;
  gateway_running?: boolean;
  gateway_state?: string;
  gateway_health_url?: string | null;
};

export type HermesHealthResult = {
  ok: boolean;
  url: string;
  detail?: string;
  mode?: 'api_gateway' | 'desktop_only' | 'offline';
  apiGatewayOk?: boolean;
  desktopRunning?: boolean;
  gatewayRunning?: boolean;
  clientVersion?: string | null;
  apiServerEnabled?: boolean;
};

async function probeHermesDesktopStatus(): Promise<HermesHealthResult | null> {
  try {
    const res = await fetch(HERMES_DESKTOP_STATUS_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as HermesDesktopStatus;
    if (!data.gateway_running) return null;
    const apiServerEnabled = Boolean(data.gateway_health_url);
    return {
      ok: true,
      url: HERMES_DESKTOP_STATUS_URL,
      mode: 'desktop_only',
      apiGatewayOk: false,
      desktopRunning: true,
      gatewayRunning: true,
      clientVersion: data.version ?? null,
      apiServerEnabled,
      detail: apiServerEnabled
        ? `汇智爱马仕助手 v${data.version ?? '未知'} 运行中`
        : `汇智爱马仕助手 v${data.version ?? '未知'} 运行中，但 API 服务（8642）未开启，请完成绑定或启用 API Server`,
    };
  } catch {
    return null;
  }
}

export async function checkHermesHealth(): Promise<HermesHealthResult> {
  try {
    const res = await fetch(`${HERMES_BASE_URL}/health`, {
      headers: HERMES_API_KEY ? { Authorization: `Bearer ${HERMES_API_KEY}` } : {},
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return {
        ok: true,
        url: HERMES_BASE_URL,
        mode: 'api_gateway',
        apiGatewayOk: true,
        desktopRunning: true,
        gatewayRunning: true,
        apiServerEnabled: true,
        detail: 'Hermes API Gateway 在线',
      };
    }
  } catch {
    // fall through to desktop probe
  }

  const desktop = await probeHermesDesktopStatus();
  if (desktop) return desktop;

  return {
    ok: false,
    url: HERMES_BASE_URL,
    mode: 'offline',
    apiGatewayOk: false,
    desktopRunning: false,
    gatewayRunning: false,
    apiServerEnabled: false,
    detail: '未检测到 Hermes：请确认汇智爱马仕助手已打开，或启用 API Server（8642）',
  };
}
