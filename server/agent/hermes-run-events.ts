const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

const activeDrains = new Set<string>();

/**
 * 消费 Hermes /v1/runs/{id}/events，避免 run stream 长时间占用 API Server 额度。
 * 轮询仍由 worker poll 兜底。
 */
export function scheduleHermesRunEventDrain(externalRunId: string) {
  if (!externalRunId || activeDrains.has(externalRunId)) return;
  activeDrains.add(externalRunId);
  void drainHermesRunEvents(externalRunId).finally(() => {
    activeDrains.delete(externalRunId);
  });
}

async function drainHermesRunEvents(externalRunId: string) {
  const headers: Record<string, string> = { Accept: 'text/event-stream, application/json' };
  if (HERMES_API_KEY) headers.Authorization = `Bearer ${HERMES_API_KEY}`;

  try {
    const res = await fetch(`${HERMES_BASE_URL}/v1/runs/${externalRunId}/events`, {
      headers,
      signal: AbortSignal.timeout(290_000),
    });
    if (!res.ok) return;

    const reader = res.body?.getReader();
    if (!reader) {
      await res.arrayBuffer().catch(() => undefined);
      return;
    }

    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch {
    // best-effort drain
  }
}
