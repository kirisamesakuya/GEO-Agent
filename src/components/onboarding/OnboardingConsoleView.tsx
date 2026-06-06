import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { ViewType } from '../../types';
import { fetchOnboardingStatus, fetchHermesDownloadInfo, type OnboardingStatus } from '../../lib/onboarding-client';
import { createHermesBindToken, fetchHermesHealth } from '../../lib/hermes-client';
import { OnboardingStepList } from './BrandConfirmView';
import TaskStatusPill from '../common/TaskStatusPill';

interface Props {
  brandName: string;
  onNavigate: (view: ViewType, hint?: string) => void;
}

const HERMES_STATUS_LABELS: Record<string, string> = {
  not_installed: '未安装 Hermes',
  installed_not_running: '已安装但未运行',
  running_not_bound: '已运行但未绑定',
  token_capacity_unavailable: '词元/模型能力不可用',
  ready: '本机 Hermes 已就绪',
  running_task: '正在执行首次检测',
  completed: '报告已生成',
};

export default function OnboardingConsoleView({ brandName, onNavigate }: Props) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [bindToken, setBindToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
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

  const handleGenerateBindToken = async () => {
    const token = await createHermesBindToken();
    setBindToken({ token: token.token, expiresAt: token.expiresAt });
  };

  const buildCheckMessage = (
    health: Awaited<ReturnType<typeof fetchHermesHealth>>,
    nextStatus: OnboardingStatus
  ) => {
    if (nextStatus.hermesReady) {
      return {
        tone: 'success' as const,
        message: `检测完成：本机 Hermes 已就绪${nextStatus.device?.deviceName ? `（${nextStatus.device.deviceName}）` : ''}，首次检测任务将自动推进。`,
      };
    }
    if (health.ok && !health.bound) {
      const versionHint = health.clientVersion ? `（v${health.clientVersion}）` : '';
      const apiHint =
        health.apiServerEnabled === false
          ? ' 桌面端 Gateway 已启动，但 API 服务（8642）未开启。'
          : '';
      return {
        tone: 'warning' as const,
        message: `检测完成：汇智爱马仕助手${versionHint} 已在运行，但尚未绑定 GEO 投放助手。${apiHint}请生成绑定码并在客户端完成绑定。`,
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
      message: `检测完成：未检测到 Hermes。请先安装并启动客户端，再点击检测。${health.detail ? `（${health.detail}）` : ''}`,
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

  return (
    <div className="geo-page-content overflow-y-auto h-full space-y-4">
      <div className="geo-card p-6 max-w-3xl mx-auto">
        <h2 className="text-lg font-bold mb-1">正在准备你的首次 GEO 检测</h2>
        <p className="text-sm text-[var(--neutral-text-03)] mb-6">{brandName}</p>

        {error && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
            {error}
          </p>
        )}

        {status && <OnboardingStepList steps={status.steps} />}

        <div className="mt-6 rounded-xl border border-[var(--color-border)] p-4 space-y-4">
          <h3 className="font-semibold text-sm">解锁本机 Hermes 执行</h3>
          <p className="text-xs text-[var(--neutral-text-03)]">
            Hermes 会在你的电脑上运行 AI 检测、网页读取和报告生成。模型调用由公司 Hermes / 词元体系支持，不在 Web 端配置 Key。
          </p>

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

          <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
            <p className="text-xs font-medium">Step 3 · 绑定当前账号</p>
            {bindToken ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-sm bg-[var(--color-accent-light)] px-2 py-1 rounded">
                  {bindToken.token}
                </code>
                <span className="text-[10px] text-[var(--neutral-text-03)]">
                  有效期至 {new Date(bindToken.expiresAt).toLocaleTimeString('zh-CN')}
                </span>
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-sm"
                  onClick={() => navigator.clipboard.writeText(bindToken.token)}
                >
                  复制绑定码
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                onClick={() => void handleGenerateBindToken()}
              >
                生成绑定码
              </button>
            )}
          </div>

          {status?.device && (
            <div className="text-xs text-[var(--neutral-text-02)] space-y-1">
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

        {status?.quickStartTaskId && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] p-4">
            <h3 className="font-semibold text-sm mb-2">首次检测任务</h3>
            <p className="text-sm">任务：AI 可见度快速体检</p>
            <p className="text-sm flex items-center gap-2 mt-1">
              状态：
              <TaskStatusPill status={status.quickStartTaskStatus ?? 'pending_setup'} size="sm" />
            </p>
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm mt-3"
              onClick={() => onNavigate('agent_tasks', status.quickStartTaskId ?? undefined)}
            >
              查看任务详情
            </button>
            {status.firstReportId && (
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm mt-3 ml-2"
                onClick={() => onNavigate('geo_analysis', `report:${status.firstReportId}`)}
              >
                查看报告
              </button>
            )}
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
