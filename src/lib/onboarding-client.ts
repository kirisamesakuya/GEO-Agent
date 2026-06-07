import type { BrandProfile } from '../types';
import type { OnboardingGoal } from './brand-clue';

export type ReadinessUiState = 'ready' | 'partial' | 'needs_setup' | 'blocked';

export type HermesConnectionMode = 'api_gateway' | 'bound_pull' | 'offline';

export type GeoCapabilitiesSummary = {
  hermesVersion: string | null;
  geoSkillsVersion: string;
  source: 'hermes_gateway' | 'local_fallback';
  registeredTaskTypes: string[];
  skillCount: number;
  degradedSkills: string[];
  unavailableSkills: string[];
  workspace: {
    tempDirWritable: boolean;
    artifactUploadSupported: boolean;
  };
};

export type OnboardingStatus = {
  brandName: string | null;
  brandId: string | null;
  steps: Array<{ id: string; label: string; done: boolean; current?: boolean }>;
  hermesUiStatus: string;
  hermesReady: boolean;
  apiGatewayOk: boolean;
  connectionMode: HermesConnectionMode;
  readinessUiState: ReadinessUiState;
  geoCapabilities: GeoCapabilitiesSummary | null;
  setupReason: string | null;
  device: {
    deviceName: string;
    hermesVersion?: string | null;
    lastHeartbeatAt?: string | null;
    heartbeatOnline?: string;
  } | null;
  tokenCapacity: Record<string, unknown> | null;
  extractTaskId: string | null;
  quickStartTaskId: string | null;
  quickStartTaskStatus: string | null;
  activeGeoTaskId: string | null;
  activeGeoTaskStatus: string | null;
  firstReportId: string | null;
  latestReportId: string | null;
  showOnboardingHero: boolean;
  isNewUser: boolean;
};

export async function fetchGeoCapabilities() {
  const res = await fetch('/api/hermes/geo-capabilities');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `获取 GEO capabilities 失败 (${res.status})`);
  }
  return data;
}

export async function fetchOnboardingStatus(brandName?: string): Promise<OnboardingStatus> {
  const q = brandName ? `?brandName=${encodeURIComponent(brandName)}` : '';
  const res = await fetch(`/api/hermes/onboarding-status${q}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `获取首启状态失败 (${res.status})`);
  }
  return data;
}

export async function fetchHermesDownloadInfo() {
  const res = await fetch('/api/hermes/download-info');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `获取 Hermes 下载信息失败 (${res.status})`);
  }
  return data;
}

export async function startOnboarding(input: {
  brandName?: string;
  text?: string;
  inputType?: string;
  brandUrl?: string;
  website?: string;
  websiteUrl?: string;
  socialLink?: string;
  description?: string;
  files?: Array<{ id: string; name: string; url: string; mimeType?: string }>;
  goal?: OnboardingGoal;
}) {
  const res = await fetch('/api/onboarding/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '启动失败');
  return data as {
    brand: BrandProfile;
    extractTask: { id: string; status?: string };
    queueHint?: {
      isQueued?: boolean;
      queuePosition?: number;
      aheadCount?: number;
      userMessage?: string;
    };
    goal: OnboardingGoal;
    nextStep: string;
    clue?: {
      brandUrl?: string;
      website?: string;
      socialLink?: string;
      description?: string;
    };
  };
}

export async function confirmOnboardingBrand(input: {
  brandName: string;
  profile: Partial<BrandProfile>;
  goal?: OnboardingGoal;
}) {
  const res = await fetch('/api/onboarding/confirm-brand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '确认失败');
  return data as { brand: BrandProfile; task: { id: string; status: string }; nextStep: string };
}

export async function retryOnboardingAgentTask(taskId: string) {
  const res = await fetch(`/api/agent-tasks/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '重试失败');
  return data.task as { id: string; status: string };
}

export async function uploadBrandFile(file: File): Promise<{ url: string; name: string; mimeType: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, data: base64, mimeType: file.type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '上传失败');
  return { url: data.url, name: data.name, mimeType: data.mimeType };
}
