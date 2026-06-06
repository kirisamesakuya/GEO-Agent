import { resolveTaskPillDisplay, resolveBatchPillDisplay } from '../src/lib/agent-task-display.ts';

const res = await fetch('http://localhost:3000/api/agent-tasks?limit=5');
const { tasks } = await res.json();
const partial = tasks?.find((t) => t.status === 'partial');
const pill = partial ? resolveTaskPillDisplay(partial) : null;

const batchesRes = await fetch('http://localhost:3000/api/content-batches?brandName=云杉口腔');
const batchesBody = await batchesRes.json().catch(() => ({}));
const batches = batchesBody.batches ?? [];
const partialBatch = batches.find((b) => b.status === 'partial');
const batchPill = partialBatch ? resolveBatchPillDisplay(partialBatch) : null;

const line = {
  partialTask: partial
    ? { status: partial.status, pillStatus: pill?.status, pillTitle: pill?.title }
    : null,
  partialBatch: partialBatch
    ? { status: partialBatch.status, pillStatus: batchPill?.status }
    : null,
};
console.log(JSON.stringify(line, null, 2));

const ok = (pill?.status === 'succeeded' || !partial) && (batchPill?.status === 'succeeded' || !partialBatch);
process.exit(ok ? 0 : 1);
