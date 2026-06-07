import { useCallback, useEffect, useState } from 'react';
import type { AgentTask, AgentTaskLog, ViewType } from '../../types';
import { AGENT_TASK_TYPE_LABELS } from '../../types';
import TaskStatusPill from '../common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, Bot, ChevronDown, ChevronUp, Cpu, ExternalLink, RefreshCw, ScrollText } from 'lucide-react';
import AgentTaskResultConfirmPanel from './AgentTaskResultConfirmPanel';
import AgentTaskOutputPanel, { type TaskDeliverableView } from './AgentTaskOutputPanel';
import HermesPublishResultPanel from './HermesPublishResultPanel';
import GeoAssetResultPanel from './GeoAssetResultPanel';
import AgentTaskResultSummary from './AgentTaskResultSummary';
import GeoArtifactPreview, { GeoArtifactList } from '../geo/GeoArtifactPreview';
import type { GeoAuditArtifact } from '../../lib/geo-audit-client';
import { getResultConfirmUiStatus, isResultConfirmPending } from '../../lib/agent-result-confirmation';
import { navigateToAgentTaskResult } from '../../lib/agent-task-result-nav';

const IN_PROGRESS = new Set([
  'pending',
  'pending_setup',
  'waiting_local_device',
  'pending_confirm',
  'queued',
  'running',
]);

interface Props {
  taskId: string;
  onBack?: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function AgentTaskResultView({ taskId, onBack, onNavigate }: Props) {
  const { toast } = useToast();
  const [task, setTask] = useState<AgentTask | null>(null);
  const [logs, setLogs] = useState<AgentTaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [geoReportPreview, setGeoReportPreview] = useState<{
    mentionRate?: number;
    gapsFound?: number;
    brandMentionSummary?: string;
    reportId?: string;
  } | null>(null);
  const [meta, setMeta] = useState<{
    executorLabel?: string;
    device?: { deviceName: string; hermesVersion?: string | null } | null;
    artifacts?: GeoAuditArtifact[];
    deliverable?: TaskDeliverableView | null;
  } | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/agent-tasks/${taskId}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTask(data.task ?? null);
    setLogs(data.logs ?? []);
    setMeta(data.meta ?? null);
    const arts = (data.meta?.artifacts ?? []) as GeoAuditArtifact[];
    if (arts.length && !arts.some((a) => a.id === selectedArtifactId)) {
      setSelectedArtifactId(arts[0]?.id ?? null);
    }
    setLoading(false);

    const reportId = data.task?.output?.geoReportId as string | undefined;
    if (reportId) {
      const rr = await fetch(`/api/geo-reports/${reportId}`);
      if (rr.ok) {
        const rd = await rr.json();
        if (rd.report) {
          setGeoReportPreview({
            reportId,
            mentionRate: rd.report.mentionRate,
            gapsFound: rd.report.gapsFound,
            brandMentionSummary: rd.report.brandMentionSummary,
          });
        }
      }
    } else {
      setGeoReportPreview(null);
    }
  }, [taskId, selectedArtifactId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!task || !IN_PROGRESS.has(task.status)) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [task?.status, load]);

  const handleRetry = async () => {
    await fetch(`/api/agent-tasks/${taskId}/retry`, { method: 'POST' });
    toast('已提交重试', 'success');
    await load();
  };

  const handleBack = () => {
    if (onBack) onBack();
    else onNavigate?.('notifications');
  };

  if (loading && !task) {
    return (
      <div className="geo-page-content h-full flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
        加载任务结果…
      </div>
    );
  }

  if (!task) {
    return (
      <div className="geo-page-content h-full space-y-4">
        <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <p className="text-sm text-[var(--color-text-secondary)]">任务不存在或已删除</p>
      </div>
    );
  }

  const display = resolveTaskPillDisplay(task);
  const resultConfirmStatus = getResultConfirmUiStatus(task);
  const showResultConfirm =
    (task.type === 'brand_extract' ||
      task.type === 'keyword_mining' ||
      task.type === 'knowledge_extract' ||
      task.type === 'geo_content') &&
    (isResultConfirmPending(task) ||
      Boolean(task.output?.confirmedAt) ||
      Boolean(task.output?.rejectedAt) ||
      task.reviewCategory === 'result_rejected');

  const showHermesPublishResult =
    (task.type === 'hermes_publish' || task.type === 'account_verify') &&
    Boolean(task.output && (task.status === 'succeeded' || task.status === 'partial' || task.status === 'failed'));

  const showGeoAssetResult =
    (task.type === 'geo_schema' || task.type === 'geo_llmstxt' || task.type === 'geo_citability') &&
    task.status === 'succeeded' &&
    Boolean(task.output);

  const canRetry = task.status === 'failed' || task.status === 'canceled';
  const inProgress = IN_PROGRESS.has(task.status);

  return (
    <div className="geo-page-content h-full overflow-y-auto space-y-4 pb-8 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
          返回通知
        </button>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          {onNavigate && (
            <button
              type="button"
              className="geo-btn-secondary text-sm flex items-center gap-2"
              onClick={() => onNavigate('agent_tasks', taskId)}
            >
              <ScrollText className="w-4 h-4" />
              查看完整日志
            </button>
          )}
          {canRetry && (
            <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => void handleRetry()}>
              重新生成
            </button>
          )}
        </div>
      </div>

      <div className="geo-card p-6 space-y-3">
        <div className="flex items-start gap-3">
          <Bot className="w-6 h-6 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--color-title)]">{task.title}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {AGENT_TASK_TYPE_LABELS[task.type] ?? task.type}
              {task.brandName ? ` · ${task.brandName}` : ''}
              {' · '}
              执行器：{meta?.executorLabel ?? '本机 Hermes'}
            </p>
          </div>
          <TaskStatusPill status={display.status} title={display.title} userErrorMessage={task.userErrorMessage} />
          {resultConfirmStatus && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 font-medium shrink-0">
              {resultConfirmStatus}
            </span>
          )}
        </div>

        {inProgress && (
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-[var(--neutral-text-03)]">
              <span>执行进度</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, task.progress))}%`, background: 'var(--color-primary)' }}
              />
            </div>
            <p className="text-xs mt-2 text-[var(--neutral-text-03)]">
              Hermes 仍在后台处理，你可以离开此页；完成后会通过通知提醒你。
            </p>
          </div>
        )}

        {meta?.device && (
          <p className="text-xs text-[var(--neutral-text-03)] flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            {meta.device.deviceName}
            {meta.device.hermesVersion ? ` · v${meta.device.hermesVersion}` : ''}
          </p>
        )}

        {task.userErrorMessage && <div className="geo-callout-danger">{task.userErrorMessage}</div>}
      </div>

      {!inProgress && <AgentTaskResultSummary task={task} />}

      {showResultConfirm && (
        <AgentTaskResultConfirmPanel
          task={task}
          onUpdated={() => void load()}
          onRegenerated={(newTaskId) => navigateToAgentTaskResult(onNavigate, newTaskId)}
          onNavigate={onNavigate}
        />
      )}

      {showHermesPublishResult && <HermesPublishResultPanel task={task} onNavigate={onNavigate} />}

      {showGeoAssetResult && <GeoAssetResultPanel task={task} onNavigate={onNavigate} />}

      {geoReportPreview && (
        <div className="geo-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-title)]">GEO 报告指标</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-[var(--neutral-text-03)]">提及率</span>
              <p className="geo-stat-value">{geoReportPreview.mentionRate ?? '—'}%</p>
            </div>
            <div>
              <span className="text-xs text-[var(--neutral-text-03)]">内容缺口</span>
              <p className="geo-stat-value">{geoReportPreview.gapsFound ?? '—'}</p>
            </div>
          </div>
          {geoReportPreview.brandMentionSummary && (
            <p className="text-sm leading-relaxed text-[var(--neutral-text-02)]">{geoReportPreview.brandMentionSummary}</p>
          )}
          {onNavigate && geoReportPreview.reportId && (
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm flex items-center gap-1"
              onClick={() => onNavigate('geo_analysis', `report:${geoReportPreview.reportId}`)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              查看完整 GEO 报告
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {task.output && <AgentTaskOutputPanel task={task} deliverable={meta?.deliverable} />}
      </div>

      {(meta?.artifacts?.length ?? 0) > 0 && (
        <div className="geo-card p-4 grid lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-title)] mb-2">证据与产物</h2>
            <GeoArtifactList
              artifacts={meta!.artifacts!}
              selectedId={selectedArtifactId}
              onSelect={setSelectedArtifactId}
            />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-title)] mb-2">预览</h2>
            {selectedArtifactId && meta?.artifacts && (
              <GeoArtifactPreview
                artifact={meta.artifacts.find((a) => a.id === selectedArtifactId) ?? meta.artifacts[0]}
              />
            )}
          </div>
        </div>
      )}

      <div className="geo-card overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-[var(--color-title)]"
          onClick={() => setShowLogs((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            执行日志
          </span>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showLogs && (
          <div className="px-4 pb-4 space-y-2 max-h-[320px] overflow-y-auto border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            {logs.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] pt-3">暂无日志</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-[var(--color-border)] pl-3 py-1">
                  <span
                    className={`font-medium ${
                      log.level === 'error' ? 'text-red-600' : log.level === 'warn' ? 'text-amber-600' : ''
                    }`}
                  >
                    {log.message}
                  </span>
                  <span className="text-[var(--color-text-secondary)] ml-2">
                    {new Date(log.createdAt).toLocaleTimeString('zh-CN')}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
