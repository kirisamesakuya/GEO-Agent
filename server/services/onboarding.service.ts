import { listBrands } from './brand.service.js';
import { listAgentTasks } from './agent-task.service.js';
import {
  getHermesLocalDevice,
  resolveHermesSetupReason,
} from './hermes-local.service.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';
import { getHermesExtendedHealth } from './hermes-binding.service.js';
import { SETUP_REASON_LABELS, isTerminalStatus } from '../lib/agent-status.js';

export type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  current?: boolean;
};

const GEO_DETECTION_TYPES = new Set(['geo_quick_start', 'geo_audit']);

function reportIdFromTask(task?: { output?: Record<string, unknown> } | null) {
  return (task?.output?.geoReportId as string | undefined) ?? null;
}

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

  const health = await checkHermesHealth();
  const { device, tokenCapacity, healthOk } = await getHermesLocalDevice();
  const setupReason = await resolveHermesSetupReason();

  const brandTasks = targetBrand
    ? await listAgentTasks({ brandName: targetBrand.name, limit: 20 })
    : [];

  const extractTask = brandTasks.find((t) => t.type === 'brand_extract');
  const latestGeoTask = brandTasks.find((t) => GEO_DETECTION_TYPES.has(t.type));
  const activeGeoTask = brandTasks.find(
    (t) => GEO_DETECTION_TYPES.has(t.type) && !isTerminalStatus(t.status)
  );
  const quickStartTask = brandTasks.find((t) => t.type === 'geo_quick_start');
  const firstReport = brandTasks.find(
    (t) => t.type === 'geo_quick_start' && t.status === 'succeeded'
  );
  const latestSucceededGeo = brandTasks.find(
    (t) => GEO_DETECTION_TYPES.has(t.type) && (t.status === 'succeeded' || t.status === 'partial')
  );

  const hermesReady =
    (health.apiGatewayOk ||
      (Boolean(device) && healthOk)) &&
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

  if (activeGeoTask?.status === 'running') {
    hermesUiStatus = 'running_task';
  } else if (activeGeoTask) {
    if (hermesReady) {
      hermesUiStatus = 'running_task';
    } else if (setupReason === 'token_capacity_unavailable') {
      hermesUiStatus = 'token_capacity_unavailable';
    } else if (setupReason === 'api_server_not_enabled') {
      hermesUiStatus = 'running_not_bound';
    } else if (setupReason === 'hermes_not_bound') {
      hermesUiStatus = 'running_not_bound';
    } else if (setupReason === 'hermes_not_running') {
      hermesUiStatus = 'installed_not_running';
    } else if (setupReason === 'hermes_not_installed') {
      hermesUiStatus = 'not_installed';
    } else {
      hermesUiStatus = 'not_installed';
    }
  } else if (latestSucceededGeo || firstReport) {
    hermesUiStatus = 'completed';
  } else if (quickStartTask?.status === 'running') {
    hermesUiStatus = 'running_task';
  } else if (hermesReady) {
    hermesUiStatus = 'ready';
  } else if (setupReason === 'token_capacity_unavailable') {
    hermesUiStatus = 'token_capacity_unavailable';
  } else if (setupReason === 'api_server_not_enabled') {
    hermesUiStatus = 'running_not_bound';
  } else if (setupReason === 'hermes_not_bound') {
    hermesUiStatus = 'running_not_bound';
  } else if (setupReason === 'hermes_not_running') {
    hermesUiStatus = 'installed_not_running';
  } else if (setupReason === 'hermes_not_installed') {
    hermesUiStatus = 'not_installed';
  } else {
    hermesUiStatus = 'not_installed';
  }

  const displayGeoTask = activeGeoTask ?? latestGeoTask;

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
      current: Boolean(targetBrand && !extractTask && !displayGeoTask),
    },
    {
      id: 'quick_start_task',
      label: '检测任务已生成',
      done: Boolean(displayGeoTask),
    },
    {
      id: 'hermes_ready',
      label: setupReason
        ? SETUP_REASON_LABELS[setupReason] ?? '等待本机 Hermes 就绪'
        : '本机 Hermes 已就绪',
      done: hermesReady,
      current: Boolean(activeGeoTask && !hermesReady),
    },
    {
      id: 'first_report',
      label: activeGeoTask
        ? '等待本次检测完成'
        : latestSucceededGeo
          ? '报告已生成'
          : '等待检测完成',
      done: Boolean(latestSucceededGeo && !activeGeoTask),
      current: Boolean(activeGeoTask && hermesReady),
    },
  ];

  const showOnboardingHero =
    brands.length <= 1 && !firstReport && !hermesReady;

  const latestReportId =
    reportIdFromTask(latestSucceededGeo) ?? reportIdFromTask(firstReport);

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
    quickStartTaskId: displayGeoTask?.id ?? null,
    quickStartTaskStatus: displayGeoTask?.status ?? null,
    activeGeoTaskId: activeGeoTask?.id ?? null,
    activeGeoTaskStatus: activeGeoTask?.status ?? null,
    firstReportId: reportIdFromTask(firstReport),
    latestReportId,
    showOnboardingHero,
    isNewUser: brands.length <= 1 && !firstReport,
  };
}
