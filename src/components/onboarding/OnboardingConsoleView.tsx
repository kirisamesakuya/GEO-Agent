import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import type { AgentTaskStatus, ViewType } from '../../types';
import {
  fetchOnboardingStatus,
  retryOnboardingAgentTask,
  type OnboardingStatus,
} from '../../lib/onboarding-client';
import { OnboardingStepList } from './BrandConfirmView';
import TaskStatusPill from '../common/TaskStatusPill';
import { navigateToAgentTaskResult } from '../../lib/agent-task-result-nav';

interface Props {
  brandName: string;
  taskId?: string;
  onNavigate: (view: ViewType, hint?: string) => void;
}

const DETECTION_STEP_IDS = new Set(['brand_draft', 'brand_profile', 'quick_start_task', 'first_report']);

const TERMINAL_STATUSES = new Set<AgentTaskStatus>(['succeeded', 'partial', 'failed', 'canceled']);

const HERMES_WAIT_STATUSES = new Set<AgentTaskStatus>(['pending_setup', 'waiting_local_device', 'pending']);

function resolvePageTitle(status: OnboardingStatus | null, hasTask: boolean): string {
  if (!hasTask) return 'GEO 检测';
  if (status?.activeGeoTaskId) return 'GEO 检测进行中';
  if (status?.firstReportId || status?.latestReportId) return '首次 GEO 检测已完成';
  return 'GEO 检测';
}

export default function OnboardingConsoleView({ brandName, taskId, onNavigate }: Props) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchOnboardingStatus(brandName);
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载检测状态失败');
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

  const hasTask = Boolean(displayTaskId);
  const pageTitle = resolvePageTitle(status, hasTask);
  const taskStatus = (displayTaskStatus ?? 'pending_setup') as AgentTaskStatus;
  const waitingForHermes = HERMES_WAIT_STATUSES.has(taskStatus);

  const detectionSteps = useMemo(
    () => status?.steps.filter((s) => DETECTION_STEP_IDS.has(s.id)) ?? [],
    [status?.steps]
  );

  const handleRetryTask = async () => {
    if (!displayTaskId) return;
    setRetrying(true);
    try {
      await retryOnboardingAgentTask(displayTaskId);
      await load();
      setFeedback({
        tone: 'success',
        message: '已重新提交检测任务。',
      });
    } catch (e) {
      setFeedback({
        tone: 'error',
        message: e instanceof Error ? e.message : '重试失败',
      });
    } finally {
      setRetrying(false);
    }
  };

  if (loading && !status && !error) {
    return <p className="text-sm text-[var(--neutral-text-03)] p-6">加载检测任务…</p>;
  }

  if (error && !status) {
    return (
      <div className="geo-page-content p-6">
        <div className="geo-card p-6 max-w-3xl mx-auto space-y-3">
          <h2 className="text-lg font-bold">检测任务暂时不可用</h2>
          <p className="text-sm text-[var(--neutral-text-03)]">{error}</p>
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
    <div className="geo-page-content space-y-4">
      <div className="max-w-3xl mx-auto space-y-4 pb-4">
        {!hasTask ? (
          <div className="geo-card p-6 space-y-3">
            <h2 className="text-lg font-bold">{pageTitle}</h2>
            <p className="text-sm text-[var(--neutral-text-03)]">
              尚未发起 GEO 检测。请在工作台通过「快速发起」创建品牌并提交检测任务。
            </p>
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm"
              onClick={() => onNavigate('workbench')}
            >
              前往工作台
            </button>
          </div>
        ) : (
          <div className="geo-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">{pageTitle}</h2>
              <p className="text-sm text-[var(--neutral-text-03)]">{brandName}</p>
            </div>

            {error && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {error}
              </p>
            )}

            {detectionSteps.length > 0 && <OnboardingStepList steps={detectionSteps} />}

            {waitingForHermes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <p className="text-sm font-medium text-amber-950">任务等待本机执行</p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  检测任务已创建，但尚未在本机执行。Hermes 是所有 GEO 功能的前置环境，需先在「本机 Hermes」页完成安装与绑定，与本检测流程相互独立。
                </p>
                <button
                  type="button"
                  className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1.5"
                  onClick={() =>
                    onNavigate('hermes_console', `return:onboarding:${displayTaskId}`)
                  }
                >
                  前往本机 Hermes
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
              <div>
                <p className="text-sm">任务 ID：{displayTaskId!.slice(0, 8)}…</p>
                <p className="text-sm flex items-center gap-2 mt-1">
                  状态：
                  <TaskStatusPill status={taskStatus} size="sm" />
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="geo-btn-primary geo-btn-sm"
                  onClick={() => navigateToAgentTaskResult(onNavigate, displayTaskId!)}
                >
                  查看结果
                </button>
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-sm"
                  onClick={() => onNavigate('agent_tasks', displayTaskId!)}
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

            {feedback && (
              <div
                className={`text-xs rounded-lg border p-3 ${
                  feedback.tone === 'success'
                    ? 'border-green-200 bg-green-50 text-green-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
                role="status"
              >
                {feedback.message}
              </div>
            )}

            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              刷新状态
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
