import type { AgentExecutor } from '../types.js';
import { DirectModelExecutor } from './direct-model.js';

export function getExecutor(kind: 'direct_model' | 'nous_hermes'): AgentExecutor {
  void kind;
  return new DirectModelExecutor();
}

export function resolveExecutorKind(): 'direct_model' | 'nous_hermes' {
  return 'direct_model';
}

export async function resolveExecutorKindForTask(taskType?: string): Promise<'direct_model' | 'nous_hermes'> {
  void taskType;
  return resolveExecutorKind();
}

export { checkHermesHealth } from './hermes.js';
