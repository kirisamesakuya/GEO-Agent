export type HermesConnectionMode = 'api_gateway' | 'bound_pull' | 'offline';

export type HermesConcurrencyMode =
  | 'conservative'
  | 'balanced'
  | 'accelerated'
  | 'do_not_disturb';

export type HermesCapacitySnapshot = {
  deviceIdHash?: string;
  deviceName?: string;
  hermesVersion?: string | null;
  apiServerReady: boolean;
  apiServerMaxRuns: number;
  geoRecommendedMaxRuns: number;
  geoRecommendedAnalysisRuns: number;
  geoRecommendedPublishRuns: number;
  activeSessions: number;
  desktopProtection: boolean;
  desktopActive: boolean;
  lastCheckedAt: string;
  effectivePolicy: {
    mode: HermesConcurrencyMode;
    maxTotalRuns: number;
    maxAnalysisRuns: number;
    maxPublishRuns: number;
    maxAccountRuns: number;
    reserveDesktopSlots: number;
    pausePublishWhenDesktopActive: boolean;
  };
  runningCounts: { total: number; analysis: number; publish: number; account: number };
  queuedCounts: { total: number; analysis: number; publish: number; account: number };
  occupiedCounts?: { total: number; analysis: number; publish: number; account: number };
  deviceReportedSlots?: number | null;
  userSummary: string;
  capacityHint?: string;
};

export type HermesPullCapacityAdvice = {
  requestedLimit: number;
  effectiveLimit: number;
  availableSlots: number;
  policyMaxTotalRuns: number;
  occupiedTotal: number;
  deviceReportedSlots?: number | null;
  mode: HermesConcurrencyMode;
  userSummary: string;
};

export type HermesHealth = {
  ok: boolean;
  url: string;
  detail?: string;
  mode?: 'api_gateway' | 'desktop_only' | 'offline';
  apiGatewayOk?: boolean;
  desktopRunning?: boolean;
  gatewayRunning?: boolean;
  apiServerEnabled?: boolean;
  agentVersion?: string | null;
  desktopAppVersion?: string | null;
  clientVersion?: string | null;
  bindClientSupported?: boolean;
  bound?: boolean;
  boundDevice?: string | null;
  heartbeat?: string;
  connectionMode?: HermesConnectionMode;
  downloadUrl?: string;
  windowsAvailable?: boolean;
  macLinuxComingSoon?: boolean;
  executorDefault?: string;
  executorForPublish?: string;
  executorForGeoAudit?: string;
  capacity?: HermesCapacitySnapshot;
  concurrencySettings?: {
    policy: HermesCapacitySnapshot['effectivePolicy'];
    desktopProtectionEnabled: boolean;
    publishSerialEnabled: boolean;
  };
  tokenCapacity?: {
    tokenCapacityStatus?: string;
    modelRuntimeStatus?: string;
    provider?: string;
  } | null;
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

export async function updateHermesConcurrencySettings(input: {
  mode?: HermesConcurrencyMode;
  desktopProtectionEnabled?: boolean;
}): Promise<{ capacity: HermesCapacitySnapshot }> {
  const res = await fetch('/api/hermes/concurrency-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? '保存失败');
  }
  return res.json();
}
