import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AgentExecutor, AgentTask, AgentTaskStatus } from '../types.js';
import { skillNameForTaskType } from '../../lib/agent-skill.js';
import {
  buildGeoWebsiteConstraint,
  buildSkillPayloadForHermes,
  resolveCanonicalWebsite,
} from '../../lib/hermes-geo-input.js';
import {
  GEO_WEB_OUTPUT_CONTRACT,
  validateGeoWebOutput,
  type GeoWebArtifact,
} from '../../lib/geo-web-output-contract.js';
import { allowsDirectModelGeoFixtureMock } from '../../lib/agent-status.js';
import {
  extractKeywordSuggestions,
  normalizeTaskBusinessOutput,
} from '../../lib/task-business-output.js';

export const GEO_HERMES_SKILL_TASK_TYPES = new Set([
  'geo_quick_start',
  'geo_audit',
  'geo_schema',
  'geo_llmstxt',
  'geo_citability',
  'geo_technical',
  'geo_crawlers',
  'geo_content',
  'geo_platform_optimizer',
  'geo_report',
  'geo_report_pdf',
  'geo_compare',
  'geo_proposal',
  'geo_prospect',
]);

const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

const HERMES_DISCONNECTED_USER_MSG =
  '无法连接本机 Hermes：请保持 Gateway / API Server（8642）运行；关闭客户端会中断检测，不支持 Mock 降级';

function mapHermesStatus(status: string): AgentTaskStatus {
  switch (status) {
    case 'queued':
    case 'pending':
    case 'started':
      return 'queued';
    case 'running':
    case 'in_progress':
    case 'waiting_for_approval':
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

function parseHermesRunOutput(output: unknown): Record<string, unknown> {
  if (typeof output === 'string') {
    const trimmed = output.trim();
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try fenced or embedded JSON below.
    }
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidates = [
      fenced?.[1]?.trim(),
      trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1),
    ].filter(Boolean) as string[];
    for (const candidate of candidates) {
      if (!candidate.startsWith('{')) continue;
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (parsed && typeof parsed === 'object') {
          return {
            ...(parsed as Record<string, unknown>),
            summary: (parsed as Record<string, unknown>).summary ?? output,
            rawText: output,
          };
        }
      } catch {
        // keep trying candidates
      }
    }
    return { summary: output, rawText: output };
  }
  if (output && typeof output === 'object') {
    return output as Record<string, unknown>;
  }
  return {};
}

function estimateHermesRunProgress(data: {
  status?: string;
  last_event?: string;
}): number {
  const event = data.last_event ?? '';
  if (event === 'run.completed') return 95;
  if (event === 'tool.completed') return 70;
  if (event === 'tool.started') return 45;
  if (event === 'approval.request') return 35;
  if (data.status === 'waiting_for_approval') return 35;
  if (data.status === 'queued' || data.status === 'started') return 25;
  return 40;
}

function formatHermesRunEvent(data: {
  status?: string;
  last_event?: string;
}): string {
  if (data.status === 'waiting_for_approval' || data.last_event === 'approval.request') {
    return '等待工具审批确认（请在 Hermes 客户端批准）';
  }
  if (data.last_event === 'tool.started') return '正在调用工具';
  if (data.last_event === 'tool.completed') return '工具执行完成，继续分析';
  if (data.last_event) return data.last_event;
  return data.status ?? 'running';
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

function buildHermesRunPayload(task: AgentTask) {
  const skill = skillNameForTaskType(task.type);
  const payload = buildSkillPayloadForHermes(task);
  const website = resolveCanonicalWebsite(payload);
  const userMessage = [
    `请使用 Hermes 技能「${skill}」完成以下 GEO 任务，并输出结构化 JSON（含 audit、data、metrics、findings、actionPlan；如有报告文件写入 artifacts）。`,
    buildGeoWebsiteConstraint(payload),
    '',
    `任务类型：${task.type}`,
    `任务标题：${task.title}`,
    '结构化参数（已映射为技能字段 brandUrl / brandName）：',
    JSON.stringify(payload, null, 2),
  ].join('\n');

  return {
    input: userMessage,
    instructions: [
      `You are executing GEO-Agent task ${task.id}.`,
      `Required skill: ${skill}.`,
      website
        ? `Canonical website URL (brandUrl): ${website}. Never search for or substitute another domain.`
        : 'No website URL provided; do not invent a domain for technical site audits.',
      'Follow the skill contract and return machine-readable JSON when finished.',
      'Do not ask follow-up questions when brandUrl and brandName are already provided.',
    ].join(' '),
    metadata: {
      taskId: task.id,
      type: task.type,
      skill,
      brandName: task.brandName ?? null,
      input: payload,
      outputContract: GEO_WEB_OUTPUT_CONTRACT,
    },
  };
}

export class NousHermesExecutor implements AgentExecutor {
  async submit(task: AgentTask) {
    const body = buildHermesRunPayload(task);
    const data = (await hermesFetch('/v1/runs', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { id?: string; run_id?: string };
    return { externalRunId: data.id ?? data.run_id };
  }

  async poll(task: AgentTask): Promise<Awaited<ReturnType<AgentExecutor['poll']>>> {
    if (!task.externalRunId) {
      return {
        status: 'failed',
        progress: 0,
        errorMessage: 'Hermes run 未创建',
        userErrorMessage: HERMES_DISCONNECTED_USER_MSG,
        log: { level: 'error', message: '缺少 Hermes externalRunId，任务已终止（已禁用 Mock 降级）' },
      };
    }

    try {
      let data = (await hermesFetch(`/v1/runs/${task.externalRunId}`)) as {
        status?: string;
        output?: unknown;
        error?: string;
        progress?: number;
        summary?: string;
        last_event?: string;
        artifacts?: Array<{
          type: string;
          name: string;
          url?: string;
          preview?: string;
        }>;
      };

      if (
        task.externalRunId &&
        (data.status === 'waiting_for_approval' || data.last_event === 'approval.request')
      ) {
        const { maybeAutoApproveHermesRun } = await import(
          '../../services/hermes-approval.service.js'
        );
        const autoApproved = await maybeAutoApproveHermesRun(task.externalRunId);
        if (autoApproved) {
          data = (await hermesFetch(`/v1/runs/${task.externalRunId}`)) as typeof data;
          return {
            status: 'running' as const,
            progress: estimateHermesRunProgress(data),
            log: {
              level: 'info' as const,
              message: 'Hermes 执行中：已自动批准工具（GEO 跳过审批已开启）',
            },
          };
        }
      }

      const status = mapHermesStatus(data.status ?? 'running') as AgentTaskStatus;
      const progress =
        data.progress ??
        (status === 'succeeded' ? 100 : estimateHermesRunProgress(data));

      if (status === 'succeeded') {
        const rawOutput = parseHermesRunOutput(data.output);
        const normalized = this.normalizeResult(task, rawOutput, data);
        const contractInvalid =
          GEO_HERMES_SKILL_TASK_TYPES.has(task.type) &&
          normalized.contractValid === false &&
          !allowsDirectModelGeoFixtureMock(task);

        if (contractInvalid) {
          return {
            status: 'partial',
            progress: 100,
            output: {
              ...normalized,
              reviewCategory: 'output_parse_failed',
            },
            userErrorMessage: `Hermes 输出未满足 ${GEO_WEB_OUTPUT_CONTRACT.version} 契约，缺少字段：${(normalized.missingFields as string[] | undefined)?.join('、') ?? '未知'}`,
            log: {
              level: 'warn' as const,
              message: 'Hermes 输出契约校验未通过',
              detail: JSON.stringify(normalized.missingFields ?? []),
            },
          };
        }

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

      const eventLabel = formatHermesRunEvent(data);
      return {
        status: 'running',
        progress,
        log: {
          level: 'info' as const,
          message: `Hermes 执行中：${eventLabel}`,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const disconnected =
        message.includes('fetch failed') ||
        message.includes('ECONNREFUSED') ||
        message.includes('ECONNRESET') ||
        message.includes('socket hang up');
      return {
        status: 'failed' as const,
        progress: task.progress ?? 0,
        errorMessage: message,
        userErrorMessage: disconnected ? HERMES_DISCONNECTED_USER_MSG : 'Hermes API 调用失败',
        log: {
          level: 'error' as const,
          message: disconnected ? 'Hermes 连接中断（已禁用 Mock 降级）' : 'Hermes 连接失败',
          detail: message,
        },
      };
    }
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
    if (GEO_HERMES_SKILL_TASK_TYPES.has(task.type)) {
      const runArtifacts = runData?.artifacts as GeoWebArtifact[] | undefined;
      const validation = validateGeoWebOutput(raw, runArtifacts);
      return {
        ...validation.normalized,
        missingFields: validation.missingFields,
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

    if (task.type === 'keyword_mining') {
      const suggestions = extractKeywordSuggestions(raw);
      return normalizeTaskBusinessOutput(task.type, {
        ...raw,
        suggestions: suggestions.length ? suggestions : raw.suggestions,
      });
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
  /** Agent 内核版本（/api/status 的 version 字段） */
  agentVersion?: string | null;
  /** 桌面安装包版本（updates/state.json 的 installed_version） */
  desktopAppVersion?: string | null;
  /** 兼容旧字段：优先桌面版，其次 Agent 内核 */
  clientVersion?: string | null;
  apiServerEnabled?: boolean;
  bindClientSupported?: boolean;
};

function readInstalledDesktopVersion(): string | null {
  const candidates = [
    process.env.HERMES_HOME,
    process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? '', 'hermes')
      : path.join(os.homedir(), '.hermes'),
  ].filter(Boolean) as string[];

  for (const home of candidates) {
    const statePath = path.join(home, 'updates', 'state.json');
    try {
      if (!fs.existsSync(statePath)) continue;
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
        installed_version?: string;
      };
      const version = state.installed_version?.trim();
      if (version) return version;
    } catch {
      // ignore malformed state file
    }
  }
  return null;
}

function formatDesktopVersionLabel(
  desktopAppVersion: string | null | undefined,
  agentVersion: string | null | undefined
): string {
  if (desktopAppVersion) return `v${desktopAppVersion}`;
  if (agentVersion) return `Agent v${agentVersion}`;
  return '未知版本';
}

async function probeHermesDesktopStatus(): Promise<HermesHealthResult | null> {
  try {
    const res = await fetch(HERMES_DESKTOP_STATUS_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as HermesDesktopStatus;
    if (!data.gateway_running) return null;
    const apiServerEnabled = Boolean(data.gateway_health_url);
    const agentVersion = data.version ?? null;
    const desktopAppVersion = readInstalledDesktopVersion();
    const versionLabel = formatDesktopVersionLabel(desktopAppVersion, agentVersion);
    const versionNote =
      desktopAppVersion && agentVersion && desktopAppVersion !== agentVersion
        ? `（桌面 ${desktopAppVersion} · Agent 内核 ${agentVersion}）`
        : agentVersion && !desktopAppVersion
          ? `（Agent 内核 ${agentVersion}）`
          : '';
    return {
      ok: true,
      url: HERMES_DESKTOP_STATUS_URL,
      mode: 'desktop_only',
      apiGatewayOk: false,
      desktopRunning: true,
      gatewayRunning: true,
      agentVersion,
      desktopAppVersion,
      clientVersion: desktopAppVersion ?? agentVersion,
      apiServerEnabled,
      bindClientSupported: false,
      detail: apiServerEnabled
        ? `汇智爱马仕助手 ${versionLabel} 运行中${versionNote}`
        : `汇智爱马仕助手 ${versionLabel} 运行中${versionNote}，请在设置中开启 API Server（8642）以连接 GEO`,
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
      const desktopAppVersion = readInstalledDesktopVersion();
      return {
        ok: true,
        url: HERMES_BASE_URL,
        mode: 'api_gateway',
        apiGatewayOk: true,
        desktopRunning: true,
        gatewayRunning: true,
        apiServerEnabled: true,
        desktopAppVersion,
        clientVersion: desktopAppVersion,
        bindClientSupported: false,
        detail: desktopAppVersion
          ? `汇智爱马仕助手 v${desktopAppVersion} 已连接（API Gateway 8642）`
          : 'Hermes API Gateway 在线',
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
