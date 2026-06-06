export type HermesHealth = {
  ok: boolean;
  url: string;
  detail?: string;
  clientVersion?: string | null;
  bound?: boolean;
  boundDevice?: string | null;
  heartbeat?: string;
  downloadUrl?: string;
  windowsAvailable?: boolean;
  macLinuxComingSoon?: boolean;
  executorDefault?: string;
  executorForGeoAudit?: string;
};

export type HermesSkill = {
  name: string;
  status: string;
  riskLevel: string;
};

export async function fetchHermesHealth(): Promise<HermesHealth> {
  const res = await fetch('/api/hermes/health');
  return res.json();
}

export async function fetchHermesSkills(): Promise<{
  installed: boolean;
  version: string;
  skills: HermesSkill[];
  note?: string;
}> {
  const res = await fetch('/api/hermes/skills');
  return res.json();
}

export async function createHermesBindToken(): Promise<{
  token: string;
  expiresAt: string;
  steps: string[];
}> {
  const res = await fetch('/api/hermes/bind-token', { method: 'POST' });
  return res.json();
}

export async function confirmHermesBinding(deviceName?: string) {
  const res = await fetch('/api/hermes/bind-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceName }),
  });
  return res.json();
}
