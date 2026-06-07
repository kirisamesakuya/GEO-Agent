import { useCallback, useEffect, useState } from 'react';
import type { AgentTask, AgentTaskLog, ViewType } from '../types';
import { AGENT_TASK_TYPE_LABELS } from '../types';
import TaskStatusPill from './common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../lib/agent-task-display';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Bot, RefreshCw, XCircle, ExternalLink, Cpu, Layers } from 'lucide-react';
import GeoArtifactPreview, { GeoArtifactList } from './geo/GeoArtifactPreview';
import type { GeoAuditArtifact } from '../lib/geo-audit-client';
import AgentTaskResultConfirmPanel from './agent/AgentTaskResultConfirmPanel';
import AgentTaskOutputPanel, { type TaskDeliverableView } from './agent/AgentTaskOutputPanel';
import HermesApprovalPanel from './agent/HermesApprovalPanel';
import type { GeoApprovalPolicy, HermesRunSnapshot } from '../lib/hermes-approval';
import HermesPublishResultPanel from './agent/HermesPublishResultPanel';
import GeoAssetResultPanel from './agent/GeoAssetResultPanel';
import { getResultConfirmUiStatus, isResultConfirmPending } from '../lib/agent-result-confirmation';

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
  onBack: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function AgentTaskDetailView({ taskId, onBack, onNavigate }: Props) {
  const { toast } = useToast();
  const [task, setTask] = useState<AgentTask | null>(null);
  const [logs, setLogs] = useState<AgentTaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoReportPreview, setGeoReportPreview] = useState<{
    mentionRate?: number;
    gapsFound?: number;
    brandMentionSummary?: string;
  } | null>(null);
  const [skillRuns, setSkillRuns] = useState<
    Array<{ id: string; skillName: string; status: string; durationMs?: number; outputSummary?: string }>
  >([]);
  const [localRuns, setLocalRuns] = useState<
    Array<{ id: string; automationType?: string; status: string; evidenceUrl?: string }>
  >([]);
  const [confirmations, setConfirmations] = useState<
    Array<{ id: string; actionType: string; riskLevel: string; confirmedAt?: string }>
  >([]);
  const [meta, setMeta] = useState<{
    skillName?: string;
    setupReasonLabel?: string | null;
    executorLabel?: string;
    device?: { deviceName: string; hermesVersion?: string | null; lastHeartbeatAt?: string | null } | null;
    artifacts?: GeoAuditArtifact[];
    deliverable?: TaskDeliverableView | null;
    approvalPolicy?: GeoApprovalPolicy | null;
    hermesRun?: HermesRunSnapshot | null;
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
    setSkillRuns(data.skillRuns ?? []);
    setLocalRuns(data.localRuns ?? []);
    setConfirmations(data.confirmations ?? []);
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
            mentionRate: rd.report.mentionRate,
            gapsFound: rd.report.gapsFound,
            brandMentionSummary: rd.report.brandMentionSummary,
          });
        }
      }
    } else {
      setGeoReportPreview(null);
    }
  }, [taskId]);

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
    await load();
  };

  const handleCancel = async () => {
    await fetch(`/api/agent-tasks/${taskId}/cancel`, { method: 'POST' });
    await load();
  };

  if (loading && !task) {
    return (
      <div className="geo-page-content h-full flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
        加载任务详情…
      </div>
    );
  }

  if (!task) {
    return (
      <div className="geo-page-content h-full space-y-4">
        <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          返回任务列表
        </button>
        <p className="text-sm text-[var(--color-text-secondary)]">任务不存在或已删除</p>
      </div>
    );
  }

  const display = resolveTaskPillDisplay(task);
  const canCancel = !['succeeded', 'failed', 'canceled', 'partial'].includes(task.status);
  const canRetry = task.status === 'failed' || task.status === 'canceled';
  const canConfirmExecution = task.status === 'pending_confirm';
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

  const handleConfirmExecution = async () => {
    const reportId = task.input.sourceReportId as string | undefined;
    const res = await fetch(`/api/agent-tasks/${taskId}/confirm-execution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast(data.error ?? '确认失败', 'error');
      return;
    }
    await load();
  };
  return (
    <div className="geo-page-content h-full overflow-y-auto space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          返回任务列表
        </button>
        <div className="flex gap-2">
          <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          {canConfirmExecution && (
            <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => void handleConfirmExecution()}>
              确认执行
            </button>
          )}
          {canRetry && (
            <button type="button" className="geo-btn-secondary text-sm" onClick={() => void handleRetry()}>
              重试
            </button>
          )}
          {canCancel && (
            <button type="button" className="geo-btn-danger geo-btn-sm flex items-center gap-1" onClick={() => void handleCancel()}>
              <XCircle className="w-4 h-4" />
              取消任务
            </button>
          )}
        </div>
      </div>

      <div className="geo-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Bot className="w-6 h-6 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--color-title)]">{task.title}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {AGENT_TASK_TYPE_LABELS[task.type] ?? task.type}
              {task.brandName ? ` · ${task.brandName}` : ''}
            </p>
          </div>
          <TaskStatusPill status={display.status} title={display.title} userErrorMessage={task.userErrorMessage} />
          {resultConfirmStatus && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 font-medium shrink-0">
              {resultConfirmStatus}
            </span>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--neutral-text-03)' }}>
            <span>执行进度</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, task.progress))}%`,
                background: 'var(--color-primary)',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span style={{ color: 'var(--neutral-text-03)' }}>创建时间</span>
            <p className="mt-0.5 font-medium">{new Date(task.createdAt).toLocaleString('zh-CN')}</p>
          </div>
          {task.startedAt && (
            <div>
              <span style={{ color: 'var(--neutral-text-03)' }}>开始时间</span>
              <p className="mt-0.5 font-medium">{new Date(task.startedAt).toLocaleString('zh-CN')}</p>
            </div>
          )}
          {task.finishedAt && (
            <div>
              <span style={{ color: 'var(--neutral-text-03)' }}>结束时间</span>
              <p className="mt-0.5 font-medium">{new Date(task.finishedAt).toLocaleString('zh-CN')}</p>
            </div>
          )}
          <div>
            <span style={{ color: 'var(--neutral-text-03)' }}>执行器</span>
            <p className="mt-0.5 font-medium">{meta?.executorLabel ?? task.executor}</p>
          </div>
        </div>

        {(meta?.skillName || meta?.device || task.reviewCategory) && (
          <div className="grid sm:grid-cols-3 gap-3 text-xs border-t pt-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            {meta?.skillName && (
              <div className="flex items-start gap-2">
                <Layers className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[var(--neutral-text-03)]">Skill</span>
                  <p className="font-mono font-medium">{meta.skillName}</p>
                </div>
              </div>
            )}
            {meta?.device && (
              <div className="flex items-start gap-2">
                <Cpu className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[var(--neutral-text-03)]">执行设备</span>
                  <p className="font-medium">{meta.device.deviceName}</p>
                  {meta.device.hermesVersion && (
                    <p className="text-[10px] text-[var(--neutral-text-03)]">v{meta.device.hermesVersion}</p>
                  )}
                </div>
              </div>
            )}
            {task.reviewCategory && meta?.setupReasonLabel && (
              <div>
                <span className="text-[var(--neutral-text-03)]">等待原因</span>
                <p className="font-medium">{meta.setupReasonLabel}</p>
              </div>
            )}
          </div>
        )}

        {task.userErrorMessage && <div className="geo-callout-danger">{task.userErrorMessage}</div>}
      </div>

      {task.executor === 'nous_hermes' && (
        <HermesApprovalPanel
          task={task}
          hermesRun={meta?.hermesRun}
          approvalPolicy={meta?.approvalPolicy}
          onUpdated={() => void load()}
        />
      )}

      {showResultConfirm && (
        <AgentTaskResultConfirmPanel
          task={task}
          onUpdated={() => void load()}
          onRegenerated={(newTaskId) => onNavigate?.('agent_tasks', newTaskId)}
          onNavigate={onNavigate}
        />
      )}

      {showHermesPublishResult && (
        <HermesPublishResultPanel task={task} onNavigate={onNavigate} />
      )}

      {showGeoAssetResult && (
        <GeoAssetResultPanel task={task} onNavigate={onNavigate} />
      )}

      {geoReportPreview && (
        <div className="geo-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-title)]">GEO 分析结果</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                提及率
              </span>
              <p className="geo-stat-value">{geoReportPreview.mentionRate ?? '—'}%</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                内容缺口
              </span>
              <p className="geo-stat-value">{geoReportPreview.gapsFound ?? '—'}</p>
            </div>
          </div>
          {geoReportPreview.brandMentionSummary && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--neutral-text-02)' }}>
              {geoReportPreview.brandMentionSummary}
            </p>
          )}
          {onNavigate && (
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm flex items-center gap-1"
              onClick={() => onNavigate('geo_analysis')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              前往 GEO 分析页查看完整报告
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="geo-card p-4">
          <h2 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">输入参数</h2>
          <pre className="text-xs bg-[var(--color-bg)] p-3 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(task.input, null, 2)}
          </pre>
        </div>

        {task.output && (
          <AgentTaskOutputPanel task={task} deliverable={meta?.deliverable} />
        )}
      </div>

      {(meta?.artifacts?.length ?? 0) > 0 && (
        <div className="geo-card p-4 grid lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-title)] mb-2">Artifacts</h2>
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

      {(skillRuns.length > 0 || localRuns.length > 0 || confirmations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {skillRuns.length > 0 && (
            <div className="geo-card p-4">
              <h2 className="text-xs font-semibold text-[var(--color-title)] mb-2">Skill Run</h2>
              <ul className="space-y-2 text-xs">
                {skillRuns.map((s) => (
                  <li key={s.id} className="border-b pb-2" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                    <p className="font-mono">{s.skillName}</p>
                    <p className="text-[var(--neutral-text-03)]">
                      {s.status}
                      {s.durationMs != null ? ` · ${s.durationMs}ms` : ''}
                    </p>
                    {s.outputSummary && <p className="mt-0.5">{s.outputSummary}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {localRuns.length > 0 && (
            <div className="geo-card p-4">
              <h2 className="text-xs font-semibold text-[var(--color-title)] mb-2">Artifacts / 自动化</h2>
              <ul className="space-y-2 text-xs">
                {localRuns.map((r) => (
                  <li key={r.id}>
                    <p>{r.automationType ?? 'automation'} · {r.status}</p>
                    {r.evidenceUrl && (
                      <a href={r.evidenceUrl} target="_blank" rel="noreferrer" className="geo-link text-[10px]">
                        证据链接
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {confirmations.length > 0 && (
            <div className="geo-card p-4">
              <h2 className="text-xs font-semibold text-[var(--color-title)] mb-2">风险确认</h2>
              <ul className="space-y-2 text-xs">
                {confirmations.map((c) => (
                  <li key={c.id}>
                    <p>{c.actionType} · <span className="geo-tag-muted">{c.riskLevel}</span></p>
                    {c.confirmedAt && (
                      <p className="text-[10px] text-[var(--neutral-text-03)]">
                        {new Date(c.confirmedAt).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="geo-card p-4">
        <h2 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-3">执行日志</h2>
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)]">
              {IN_PROGRESS.has(task.status) ? '任务执行中，日志将陆续更新…' : '暂无日志'}
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="text-xs border-l-2 border-[var(--color-border)] pl-3 py-1">
                <span
                  className={`font-medium ${
                    log.level === 'error' ? 'text-red-600' : log.level === 'warn' ? 'text-amber-600' : 'text-[var(--color-text)]'
                  }`}
                >
                  {log.message}
                </span>
                <span className="text-[var(--color-text-secondary)] ml-2">
                  {new Date(log.createdAt).toLocaleTimeString('zh-CN')}
                </span>
                {log.detail && <p className="text-[var(--color-text-secondary)] mt-0.5 whitespace-pre-wrap">{log.detail}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
