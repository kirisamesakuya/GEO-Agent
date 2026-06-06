import { useEffect, useRef, useCallback } from 'react';
import type { AgentTask } from '../types';

interface UseAgentTaskPollingOptions {
  taskId: string | null;
  intervalMs?: number;
  onUpdate?: (task: AgentTask) => void;
  onComplete?: (task: AgentTask) => void;
  enabled?: boolean;
}

const TERMINAL = new Set(['succeeded', 'partial', 'failed', 'canceled']);

export function useAgentTaskPolling({
  taskId,
  intervalMs = 2500,
  onUpdate,
  onComplete,
  enabled = true,
}: UseAgentTaskPollingOptions) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return null;
    const res = await fetch(`/api/agent-tasks/${taskId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const task = data.task as AgentTask;
    onUpdate?.(task);
    if (TERMINAL.has(task.status)) {
      onComplete?.(task);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return task;
  }, [taskId, onUpdate, onComplete]);

  useEffect(() => {
    if (!taskId || !enabled) return;
    void fetchTask();
    timerRef.current = setInterval(() => {
      void fetchTask();
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [taskId, enabled, intervalMs, fetchTask]);

  return { refetch: fetchTask };
}
