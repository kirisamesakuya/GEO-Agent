import { listBrands } from './brand.service.js';
import { listAgentTasks } from './agent-task.service.js';
import {
  getHermesLocalDevice,
  resolveHermesSetupReason,
} from './hermes-local.service.js';
import { getHermesExtendedHealth } from './hermes-binding.service.js';
import { SETUP_REASON_LABELS } from '../lib/agent-status.js';

export type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  current?: boolean;
};

export async function getHermesDownloadInfo() {
  const health = await getHermesExtendedHealth();
  return {
    downloadUrl: health.downloadUrl ?? 'https://hermes.agentsyun.com/',
    windowsAvailable: health.windowsAvailable ?? true,
    macLinuxComingSoon: health.macLinuxComingSoon ?? true,
    note: '当前支持 Windows 本机执行，安装后保持 Hermes 打开并完成绑定。',
  };
}

export async function getOnboardingStatus(brandName?: string) {
  const brands = await listBrands();
  const targetBrand = brandName
    ? brands.find((b) => b.name === brandName)
    : brands[0];

  const { device, tokenCapacity, healthOk } = await getHermesLocalDevice();
  const setupReason = await resolveHermesSetupReason();

  const brandTasks = targetBrand
    ? await listAgentTasks({ brandName: targetBrand.name, limit: 10 })
    : [];

  const extractTask = brandTasks.find((t) => t.type === 'brand_extract');
  const quickStartTask = brandTasks.find((t) => t.type === 'geo_quick_start');
  const firstReport = brandTasks.find(
    (t) => t.type === 'geo_quick_start' && t.status === 'succeeded'
  );

  const hermesReady =
    Boolean(device) &&
    healthOk &&
    (!tokenCapacity ||
      (tokenCapacity.tokenCapacityStatus === 'available' &&
        tokenCapacity.modelRuntimeStatus === 'available'));

  let hermesUiStatus:
    | 'not_installed'
    | 'installed_not_running'
    | 'running_not_bound'
    | 'token_capacity_unavailable'
    | 'ready'
    | 'running_task'
    | 'completed' = 'not_installed';

  if (firstReport) {
    hermesUiStatus = 'completed';
  } else if (quickStartTask?.status === 'running') {
    hermesUiStatus = 'running_task';
  } else if (hermesReady) {
    hermesUiStatus = 'ready';
  } else if (setupReason === 'token_capacity_unavailable') {
    hermesUiStatus = 'token_capacity_unavailable';
  } else if (setupReason === 'hermes_not_bound') {
    hermesUiStatus = 'running_not_bound';
  } else if (setupReason === 'hermes_not_running') {
    hermesUiStatus = 'installed_not_running';
  } else if (setupReason === 'hermes_not_installed') {
    hermesUiStatus = 'not_installed';
  } else {
    hermesUiStatus = 'not_installed';
  }

  const steps: OnboardingStep[] = [
    {
      id: 'brand_draft',
      label: targetBrand ? `品牌草稿已创建：${targetBrand.name}` : '创建品牌草稿',
      done: Boolean(targetBrand),
    },
    {
      id: 'brand_profile',
      label: '品牌资料已整理',
      done: Boolean(extractTask?.status === 'succeeded' || targetBrand?.industry),
      current: Boolean(targetBrand && !extractTask && !quickStartTask),
    },
    {
      id: 'quick_start_task',
      label: '首次检测任务已生成',
      done: Boolean(quickStartTask),
    },
    {
      id: 'hermes_ready',
      label: setupReason
        ? SETUP_REASON_LABELS[setupReason] ?? '等待本机 Hermes 就绪'
        : '本机 Hermes 已就绪',
      done: hermesReady,
      current: Boolean(quickStartTask && !hermesReady),
    },
    {
      id: 'first_report',
      label: firstReport ? '报告已生成' : '等待首次检测完成',
      done: Boolean(firstReport),
      current: Boolean(hermesReady && quickStartTask && !firstReport),
    },
  ];

  const showOnboardingHero =
    brands.length <= 1 && !firstReport && !hermesReady;

  return {
    brandName: targetBrand?.name ?? null,
    brandId: targetBrand?.id ?? null,
    steps,
    hermesUiStatus,
    hermesReady,
    setupReason,
    device: device
      ? {
          deviceName: device.deviceName,
          hermesVersion: device.hermesVersion,
          lastHeartbeatAt: device.lastHeartbeatAt,
          heartbeatOnline:
            device.lastHeartbeatAt &&
            Date.now() - new Date(device.lastHeartbeatAt).getTime() < 90_000
              ? 'online'
              : 'offline',
        }
      : null,
    tokenCapacity: tokenCapacity ?? null,
    extractTaskId: extractTask?.id ?? null,
    quickStartTaskId: quickStartTask?.id ?? null,
    quickStartTaskStatus: quickStartTask?.status ?? null,
    firstReportId:
      (firstReport?.output?.geoReportId as string | undefined) ?? null,
    showOnboardingHero,
    isNewUser: brands.length <= 1 && !firstReport,
  };
}
