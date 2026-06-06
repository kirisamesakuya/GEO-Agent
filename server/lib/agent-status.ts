import type { AgentTaskStatus } from '../agent/types.js';

export const AGENT_TASK_STATUS_LABELS: Record<AgentTaskStatus, string> = {
  pending: '待处理',
  pending_setup: '等待 Hermes 设置',
  waiting_local_device: '等待本机 Hermes',
  pending_confirm: '待确认',
  queued: '已进入队列',
  running: '本机 Hermes 执行中',
  succeeded: '已完成',
  partial: '部分完成',
  failed: '失败',
  canceled: '已取消',
};

export const SETUP_REASON_LABELS: Record<string, string> = {
  hermes_not_installed: '等待安装 Hermes',
  hermes_not_running: '等待打开 Hermes',
  hermes_not_bound: '等待绑定本机 Hermes',
  api_server_not_enabled: '等待开启 Hermes API Server',
  token_capacity_unavailable: '词元/模型能力不可用',
  skill_missing: 'GEO 技能包缺失',
  output_parse_failed: '结果解析失败，待人工复核',
  result_confirm_required: '待确认入库',
  result_rejected: '已忽略',
};

/** 读取时将旧 pending 映射为 pending_setup（若有 Hermes 相关 reviewCategory） */
export function normalizeAgentTaskStatus(
  status: string,
  reviewCategory?: string | null
): AgentTaskStatus {
  if (status === 'pending') {
    if (reviewCategory && reviewCategory in SETUP_REASON_LABELS) return 'pending_setup';
    return 'pending';
  }
  const known: AgentTaskStatus[] = [
    'pending_setup',
    'waiting_local_device',
    'pending_confirm',
    'queued',
    'running',
    'succeeded',
    'partial',
    'failed',
    'canceled',
  ];
  return known.includes(status as AgentTaskStatus) ? (status as AgentTaskStatus) : 'pending';
}

export function isTerminalStatus(status: AgentTaskStatus): boolean {
  return ['succeeded', 'partial', 'failed', 'canceled'].includes(status);
}

export function isHermesExecutorTask(executor: string): boolean {
  return executor === 'nous_hermes';
}

const HERMES_LOCAL_TASK_TYPES = new Set([
  'geo_quick_start',
  'geo_audit',
  'geo_schema',
  'geo_llmstxt',
  'geo_citability',
  'geo_report_pdf',
  'geo_compare',
  'brand_extract',
  'hermes_publish',
]);

export function isHermesLocalTaskType(type: string): boolean {
  return HERMES_LOCAL_TASK_TYPES.has(type);
}

const GEO_ASSET_TASK_TYPES = new Set(['geo_schema', 'geo_llmstxt', 'geo_citability']);

export function isGeoAssetTaskType(type: string): boolean {
  return GEO_ASSET_TASK_TYPES.has(type);
}

const GEO_FIXTURE_MOCK_TYPES = new Set([
  'geo_quick_start',
  'geo_audit',
  'geo_schema',
  'geo_llmstxt',
  'geo_citability',
  'geo_report_pdf',
  'geo_compare',
]);

/** 用户已确认执行时，允许 direct_model 用 fixture 模拟 GEO 技能（开发/POC） */
export function allowsDirectModelGeoFixtureMock(task: {
  type: string;
  input?: Record<string, unknown>;
}): boolean {
  const input = task.input ?? {};
  if (!input.userConfirmedExecution) return false;
  return GEO_FIXTURE_MOCK_TYPES.has(task.type);
}

/** POC / 开发：允许 direct_model 模拟本机 Hermes 发布与账号校验 */
export function allowsDirectModelHermesMock(task: {
  type: string;
  input?: Record<string, unknown>;
}): boolean {
  const input = task.input ?? {};
  if (task.type === 'hermes_publish') {
    return Boolean(input.mockHermes || input.userConfirmed);
  }
  if (task.type === 'account_verify') {
    return Boolean(input.mockVerify ?? input.bindSessionId ?? input.userConfirmed);
  }
  return false;
}

/** 正式环境禁止 Mock，必须走本机 Hermes（8642 Gateway） */
export function taskRequiresHermesExecutor(
  type: string,
  input?: Record<string, unknown>
): boolean {
  if (allowsDirectModelHermesMock({ type, input })) return false;
  if (allowsDirectModelGeoFixtureMock({ type, input })) return false;
  return isHermesLocalTaskType(type) || type === 'geo_analysis';
}
