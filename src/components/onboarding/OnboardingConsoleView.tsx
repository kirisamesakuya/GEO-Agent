import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import type { AgentTaskStatus, ViewType } from '../../types';
import {
  fetchOnboardingStatus,
  fetchHermesDownloadInfo,
  retryOnboardingAgentTask,
  type OnboardingStatus,
} from '../../lib/onboarding-client';
import { fetchHermesHealth } from '../../lib/hermes-client';
import { OnboardingStepList } from './BrandConfirmView';
import TaskStatusPill from '../common/TaskStatusPill';

interface Props {
  brandName: string;
  taskId?: string;
  onNavigate: (view: ViewType, hint?: string) => void;
}

const HERMES_STATUS_LABELS: Record<string, string> = {
  not_installed: '未安装 Hermes',
  installed_not_running: '已安装但未运行',
  running_not_bound: '已运行，待开启 API Server',
  token_capacity_unavailable: '词元/模型能力不可用',
  ready: '本机 Hermes 已就绪',
  running_task: '正在执行 GEO 检测',
  completed: '报告已生成',
};

const TERMINAL_STATUSES = new Set<AgentTaskStatus>(['succeeded', 'partial', 'failed', 'canceled']);

function formatVersionLabel(health: {
  desktopAppVersion?: string | null;
  agentVersion?: string | null;
  clientVersion?: string | null;
}) {
  if (health.desktopAppVersion) {
    const core =
      health.agentVersion && health.agentVersion !== health.desktopAppVersion
        ? `，Agent 内核 v${health.agentVersion}`
        : '';
    return `v${health.desktopAppVersion}${core}`;
  }
  if (health.clientVersion) return `v${health.clientVersion}`;
  return '';
}

export default function OnboardingConsoleView({ brandName, taskId, onNavigate }: Props) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<{
    tone: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        fetchOnboardingStatus(brandName),
        fetchHermesDownloadInfo(),
      ]);
      setStatus(s);
      setDownloadUrl(d.downloadUrl ?? 'https://hermes.agentsyun.com/');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载首启状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [brandName]);

  const displayTaskId = useMemo(
    () => taskId ?? status?.activeGeoTaskId ?? status?.quickStartTaskId ?? null,
    [taskId, status?.activeGeoTaskId, status?.quickStartTaskId]
  );

  const displayTaskStatus = useMemo(() => {
    if (taskId && taskId === status?.activeGeoTaskId) {
      return status.activeGeoTaskStatus;
    }
    if (taskId && taskId === status?.quickStartTaskId) {
      return status.quickStartTaskStatus;
    }
    return status?.activeGeoTaskStatus ?? status?.quickStartTaskStatus ?? null;
  }, [taskId, status]);

  const hasPriorReport = Boolean(status?.firstReportId);
  const pageTitle = hasPriorReport ? 'GEO 检测进行中' : '正在准备你的首次 GEO 检测';

  const buildCheckMessage = (
    health: Awaited<ReturnType<typeof fetchHermesHealth>>,
    nextStatus: OnboardingStatus
  ) => {
    const versionHint = formatVersionLabel(health);
    const taskHint = nextStatus.activeGeoTaskId ? '检测任务将自动推进。' : '可以提交新的检测任务。';

    if (nextStatus.hermesReady) {
      return {
        tone: 'success' as const,
        message: `检测完成：本机 Hermes 已就绪${versionHint ? `（${versionHint}）` : ''}${nextStatus.device?.deviceName ? `，设备 ${nextStatus.device.deviceName}` : ''}，${taskHint}`,
      };
    }

    if (health.apiGatewayOk) {
      return {
        tone: 'success' as const,
        message: `检测完成：汇智爱马仕助手${versionHint ? ` ${versionHint}` : ''} 已通过 API Server（8642）连接 GEO，可以执行任务。`,
      };
    }

    if (health.desktopRunning) {
      return {
        tone: 'warning' as const,
        message: `检测完成：汇智爱马仕助手${versionHint ? ` ${versionHint}` : ''} 已在运行，Gateway 已启动，但 API Server（8642）未开启。请在 Hermes 设置 → Platforms → API Server 中启用，保存后重启 Gateway，再点击检测。`,
      };
    }

    if (!health.ok && health.bound) {
      return {
        tone: 'warning' as const,
        message: `检测完成：账号已绑定，但 Hermes 当前离线。请打开客户端后再次检测。${health.detail ? `（${health.detail}）` : ''}`,
      };
    }

    if (nextStatus.hermesUiStatus === 'token_capacity_unavailable') {
      return {
        tone: 'warning' as const,
        message: '检测完成：Hermes 已连接，但词元/模型能力不可用。请在客户端检查词元登录与余额。',
      };
    }

    return {
      tone: 'error' as const,
      message: `检测完成：未检测到 Hermes。请先安装并启动汇智爱马仕助手，再点击检测。${health.detail ? `（${health.detail}）` : ''}`,
    };
  };

  const handleCheckHermes = async () => {
    setChecking(true);
    setCheckFeedback(null);
    try {
      const health = await fetchHermesHealth();
      const nextStatus = await fetchOnboardingStatus(brandName);
      setStatus(nextStatus);
      setCheckFeedback(buildCheckMessage(health, nextStatus));
      setError(null);
    } catch (e) {
      setCheckFeedback({
        tone: 'error',
        message: e instanceof Error ? e.message : 'Hermes 检测失败，请稍后重试',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleRetryTask = async () => {
    if (!displayTaskId) return;
    setRetrying(true);
    try {
      await retryOnboardingAgentTask(displayTaskId);
      await load();
      setCheckFeedback({
        tone: 'success',
        message: '已重新提交检测任务，Hermes 将自动领取执行。',
      });
    } catch (e) {
      setCheckFeedback({
        tone: 'error',
        message: e instanceof Error ? e.message : '重试失败',
      });
    } finally {
      setRetrying(false);
    }
  };

  if (loading && !status && !error) {
    return <p className="text-sm text-[var(--neutral-text-03)] p-6">加载首启控制台…</p>;
  }

  if (error && !status) {
    return (
      <div className="geo-page-content overflow-y-auto h-full p-6">
        <div className="geo-card p-6 max-w-3xl mx-auto space-y-3">
          <h2 className="text-lg font-bold">首启控制台暂时不可用</h2>
          <p className="text-sm text-[var(--neutral-text-03)]">{error}</p>
          <p className="text-xs text-[var(--neutral-text-03)]">
            若刚更新过代码，请先停止旧的 dev 进程，再执行 <code>npm run dev</code> 重启服务。
          </p>
          <button type="button" className="geo-btn-secondary geo-btn-sm" onClick={() => void load()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  const reportId = status?.latestReportId ?? status?.firstReportId;
  const canRetry =
    displayTaskId &&
    displayTaskStatus &&
    TERMINAL_STATUSES.has(displayTaskStatus as AgentTaskStatus) &&
    displayTaskStatus === 'failed';

  return (
    <div className="geo-page-content overflow-y-auto h-full space-y-4">
      <div className="geo-card p-6 max-w-3xl mx-auto">
        <h2 className="text-lg font-bold mb-1">{pageTitle}</h2>
        <p className="text-sm text-[var(--neutral-text-03)] mb-6">{brandName}</p>

        {error && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
            {error}
          </p>
        )}

        {status && <OnboardingStepList steps={status.steps} />}

        <div className="mt-6 rounded-xl border border-[var(--color-border)] p-4 space-y-4">
          <h3 className="font-semibold text-sm">连接本机 Hermes</h3>
          <p className="text-xs text-[var(--neutral-text-03)]">
            当前连调方式：在汇智爱马仕助手中开启 API Server（8642），GEO 通过本机接口调用任务。
            绑定码方案为商用版预留能力，需 Hermes 客户端后续开发，现阶段客户端尚无「绑定 GEO」入口。
          </p>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-accent-light)]/20 p-3 space-y-2">
            <p className="text-xs font-medium">Step 1 · 确认客户端已运行</p>
            <p className="text-xs text-[var(--neutral-text-03)]">
              打开 <code>D:\Hermes\汇智爱马仕助手.exe</code>，保持 Gateway 运行。
            </p>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-3 space-y-2">
            <p className="text-xs font-medium">Step 2 · 开启 API Server（当前必需）</p>
            <p className="text-xs text-[var(--neutral-text-03)]">
              在 Hermes 设置中找到 <strong>Platforms → API Server</strong>，将 <code>enabled</code> 设为{' '}
              <code>true</code>，端口保持 <code>8642</code>，保存后重启 Gateway。
            </p>
            <p className="text-[10px] text-[var(--neutral-text-03)]">
              配置文件：<code>C:\Users\win11\AppData\Local\hermes\config.yaml</code>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              下载 Windows 版 Hermes
            </a>
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
              disabled={checking}
              onClick={() => void handleCheckHermes()}
            >
              {checking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  检测中…
                </>
              ) : (
                '我已安装，检测一下'
              )}
            </button>
          </div>

          {checkFeedback && (
            <div
              className={`text-xs rounded-lg border p-3 ${
                checkFeedback.tone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-900'
                  : checkFeedback.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-red-200 bg-red-50 text-red-900'
              }`}
              role="status"
            >
              {checkFeedback.message}
            </div>
          )}

          {status?.device && (
            <div className="text-xs text-[var(--neutral-text-02)] space-y-1 border-t border-[var(--color-border)] pt-3">
              <p>设备：{status.device.deviceName}</p>
              <p>版本：{status.device.hermesVersion ?? '等待上报'}</p>
              <p>心跳：{status.device.heartbeatOnline === 'online' ? '在线' : '离线'}</p>
            </div>
          )}

          {status?.tokenCapacity && (
            <div className="text-xs rounded-lg bg-[var(--color-accent-light)]/30 p-3">
              <p className="font-medium mb-1">词元 / 模型能力</p>
              <p>
                词元：{String(status.tokenCapacity.tokenCapacityStatus ?? '未知')} · 模型：
                {String(status.tokenCapacity.modelRuntimeStatus ?? '未知')}
              </p>
            </div>
          )}

          <p className="text-xs text-[var(--neutral-text-03)]">
            当前状态：{HERMES_STATUS_LABELS[status?.hermesUiStatus ?? ''] ?? status?.hermesUiStatus}
          </p>
        </div>

        {displayTaskId && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] p-4">
            <h3 className="font-semibold text-sm mb-2">
              {hasPriorReport ? '当前检测任务' : '首次检测任务'}
            </h3>
            <p className="text-sm">任务 ID：{displayTaskId.slice(0, 8)}…</p>
            <p className="text-sm flex items-center gap-2 mt-1">
              状态：
              <TaskStatusPill status={(displayTaskStatus ?? 'pending_setup') as AgentTaskStatus} size="sm" />
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm"
                onClick={() => onNavigate('agent_tasks', displayTaskId)}
              >
                查看任务详情
              </button>
              {canRetry && (
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
                  disabled={retrying}
                  onClick={() => void handleRetryTask()}
                >
                  {retrying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  重试检测
                </button>
              )}
              {reportId && !status?.activeGeoTaskId && (
                <button
                  type="button"
                  className="geo-btn-primary geo-btn-sm"
                  onClick={() => onNavigate('geo_analysis', `report:${reportId}`)}
                >
                  查看报告
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          className="geo-btn-secondary geo-btn-sm mt-4 inline-flex items-center gap-1.5"
          onClick={() => void load()}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新状态
        </button>
      </div>
    </div>
  );
}
