export type HermesApprovalChoice = 'once' | 'session' | 'always' | 'deny';

export type GeoApprovalPolicy = {
  skipApprovalForGeo: boolean;
  updatedAt?: string;
};

export type HermesRunSnapshot = {
  runId: string;
  status?: string;
  lastEvent?: string;
  pendingApproval: boolean;
};

export async function fetchGeoApprovalPolicy(): Promise<GeoApprovalPolicy> {
  const res = await fetch('/api/hermes/approval-policy');
  if (!res.ok) throw new Error('加载审批策略失败');
  return res.json();
}

export async function updateGeoApprovalPolicy(
  skipApprovalForGeo: boolean
): Promise<GeoApprovalPolicy> {
  const res = await fetch('/api/hermes/approval-policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skipApprovalForGeo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '保存审批策略失败');
  return data;
}

export async function approveHermesTaskRun(
  taskId: string,
  choice: HermesApprovalChoice
): Promise<{ resolved: number }> {
  const res = await fetch(`/api/agent-tasks/${taskId}/hermes-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '批准失败');
  return data;
}
