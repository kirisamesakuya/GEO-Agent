import type { AgentExecutor } from '../types.js';
import { DirectModelExecutor } from './direct-model.js';
import { NousHermesExecutor } from './hermes.js';
import {
  executorKindForTaskType,
  mapConfigExecutor,
  refreshSkillRoutesFromDb,
} from '../../lib/agent-skill.js';

/**
 * 根据 executor kind 获取对应的执行器实例。
 * 支持 direct_model（Web 内置 AI / 非 Hermes 任务）和 nous_hermes（本机 Hermes）。
 */
export function getExecutor(kind: 'direct_model' | 'nous_hermes'): AgentExecutor {
  if (kind === 'nous_hermes') return new NousHermesExecutor();
  return new DirectModelExecutor();
}

/**
 * 解析默认执行器类型。
 * 优先级：环境变量 HERMES_EXECUTOR > 默认为 direct_model。
 */
export function resolveExecutorKind(): 'direct_model' | 'nous_hermes' {
  const env = (process.env.HERMES_EXECUTOR ?? '').trim().toLowerCase();
  return mapConfigExecutor(env || 'direct_model');
}

/**
 * 按任务类型解析执行器。
 * 1. 刷新 DB 中的 skill_routes 配置
 * 2. 查找该 taskType 是否配置了专用 executor
 * 3. 回落至默认执行器
 */
export async function resolveExecutorKindForTask(
  taskType?: string,
): Promise<'direct_model' | 'nous_hermes'> {
  await refreshSkillRoutesFromDb();
  if (taskType) {
    const kind = executorKindForTaskType(taskType);
    if (kind === 'nous_hermes') return 'nous_hermes';
    // 如果 skill_routes 里配了 direct_model 以外的默认值，此处让 mapConfigExecutor 兜底
  }
  return resolveExecutorKind();
}

export { checkHermesHealth } from './hermes.js';
