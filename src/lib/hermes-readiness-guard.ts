import { hermesSkillLabel } from './hermes-skill-labels';
import {
  fetchOnboardingStatus,
  type OnboardingStatus,
  type ReadinessUiState,
} from './onboarding-client';

export type HermesGuardResult =
  | { ok: true; state: 'ready' | 'partial' }
  | { ok: false; state: 'needs_setup' | 'blocked'; status: OnboardingStatus };

export async function checkHermesForGeoSubmit(brandName?: string): Promise<HermesGuardResult> {
  const status = await fetchOnboardingStatus(brandName);
  const state: ReadinessUiState =
    status.readinessUiState ?? (status.hermesReady ? 'ready' : 'needs_setup');
  if (state === 'ready' || state === 'partial') {
    return { ok: true, state };
  }
  return { ok: false, state, status };
}

export function isHermesRelatedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('hermes') ||
    message.includes('本机') ||
    message.includes('8642') ||
    message.includes('绑定') ||
    message.includes('API Server') ||
    lower.includes('executor')
  );
}

export function buildHermesSetupGuideCopy(status: OnboardingStatus): {
  title: string;
  lines: string[];
} {
  const state: ReadinessUiState =
    status.readinessUiState ?? (status.hermesReady ? 'ready' : 'needs_setup');
  const caps = status.geoCapabilities;

  if (state === 'blocked') {
    return {
      title: 'GEO 技能当前不可执行',
      lines: [
        caps?.unavailableSkills?.length
          ? `以下技能不可用：${caps.unavailableSkills.map((s) => hermesSkillLabel(s)).join('、')}`
          : '本机未检测到可用的 GEO 技能。',
        '请打开「本机 Hermes」，完成安装、绑定与技能同步后再试。',
      ],
    };
  }

  return {
    title: '需要先配置本机 Hermes',
    lines: [
      status.apiGatewayOk
        ? '请确认 Hermes 客户端与 API Server（8642）保持运行。'
        : status.connectionMode === 'bound_pull' || status.device
          ? '请在 Hermes 客户端输入绑定码并保持设备在线。'
          : status.setupReason === 'api_server_not_enabled'
            ? '请在 Hermes 中开启 Platforms → API Server（8642），保存后重启 Gateway。'
            : '请安装 Hermes，开启 API Server 或完成设备绑定后再提交 GEO 任务。',
      '可在「本机 Hermes → 技能清单」查看各能力是否可用。',
    ],
  };
}

/** @deprecated 使用 checkHermesForGeoSubmit */
export async function ensureHermesReadyForSubmit(brandName?: string): Promise<boolean> {
  const result = await checkHermesForGeoSubmit(brandName);
  return result.ok;
}
