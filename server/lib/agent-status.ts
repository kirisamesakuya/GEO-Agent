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
  token_capacity_unavailable: '词元/模型能力不可用',
  skill_missing: 'GEO 技能包缺失',
  output_parse_failed: '结果解析失败，待人工复核',
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
