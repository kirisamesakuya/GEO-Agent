import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import AgentTaskBackgroundCard, {
  isAgentTaskBlocking,
  type TaskQueueHint,
} from '../common/AgentTaskBackgroundCard';
import type { AgentTask, AgentTaskStatus } from '../../types';
import { submitGeoAgentTask } from '../../lib/geo-audit-client';
import { fetchGeoReports } from '../../lib/geo-report';
import { useHermesSubmitGuard } from '../hermes/HermesSubmitGuard';
import GeoArtifactPreview from './GeoArtifactPreview';
import { stashGeoAssetWebsitePrefill } from '../../lib/geo-asset-website-prefill';
import {
  resolveAuditModuleTask,
  WEBSITE_GEO_ANALYSIS_MODULE_IDS,
  websiteGeoAnalysisModuleLabels,
} from '../../lib/geo-audit-modules';
import { extractAssetPreview } from '../../lib/geo-asset';
import type { GeoAuditArtifact } from '../../lib/geo-audit-client';

const ANALYSIS_SCOPE = websiteGeoAnalysisModuleLabels();

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function GeoAssetsView({ brandName, onNavigate }: Props) {
  const { toast } = useToast();
  const { ensureHermesReady, showHermesError } = useHermesSubmitGuard();

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandHasWebsite, setBrandHasWebsite] = useState(false);
  const [preview, setPreview] = useState('');
  const [artifacts, setArtifacts] = useState<GeoAuditArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);

  useEffect(() => {
    if (!brandName || brandName === '__all__') return;

    void fetchGeoReports(brandName).then((rows) => {
      const latest =
        rows.find((r) => (r as { reportType?: string }).reportType === 'audit') ??
        rows.find((r) => (r as { reportType?: string }).reportType === 'quick_start') ??
        rows[0];
      if (latest) setReportId(latest.id);
    });

    void fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((data) => {
        const url = data?.website ? String(data.website).trim() : '';
        if (url) {
          setWebsiteUrl((prev) => prev || url);
          setBrandHasWebsite(true);
        }
      })
      .catch(() => {});
  }, [brandName]);

  const onComplete = (task: AgentTask) => {
    setLoading(false);
    setTaskStatus('succeeded');
    const output = task.output ?? {};
    const arts = (output.artifacts as GeoAuditArtifact[] | undefined) ?? [];
    setArtifacts(arts);
    setSelectedArtifactId(arts[0]?.id ?? null);
    setPreview(extractAssetPreview(output));
    if (output.geoReportId) setReportId(String(output.geoReportId));
    toast('网站 GEO 分析完成，可据此提交网页需求', 'success');
  };

  const runWebsiteAnalysis = async () => {
    if (brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    if (!websiteUrl.trim()) {
      toast('请填写官网 URL，或选择「还没有官网」直接提交需求', 'info');
      return;
    }
    if (!(await ensureHermesReady(brandName))) return;

    const plan = resolveAuditModuleTask([...WEBSITE_GEO_ANALYSIS_MODULE_IDS]);
    setLoading(true);
    setTaskStatus('queued');
    const title = `${brandName} · 网站 GEO 分析`;
    const { task, error, queueHint: hint } = await submitGeoAgentTask({
      type: plan.type,
      title,
      brandName,
      payload: {
        skill: plan.skill,
        brandName,
        brandUrl: websiteUrl.trim(),
        sourceReportId: reportId ?? undefined,
        ...(plan.modules ? { modules: plan.modules } : {}),
        outputContract: { format: 'json', version: 'geoWebOutput.v1', artifacts: ['markdown', 'json'] },
      },
    });

    if (error || !task) {
      if (error) showHermesError(error, brandName);
      toast(error ?? '分析失败', 'error');
      setLoading(false);
      return;
    }

    setTaskId(task.id);
    setTaskTitle(title);
    setTaskStatus(task.status);
    setQueueHint(hint ?? null);
  };

  const buildPrefillNotes = (withAnalysis: boolean) => {
    const summary = preview.trim().slice(0, 2000);
    if (!withAnalysis) {
      return [
        '来源：网站 GEO 资产 · 新建官网需求',
        '说明：品牌暂无线上官网，请接单方协助建站并完成 GEO 技术部署。',
      ].join('\n');
    }
    return [
      '来源：网站 GEO 资产 · 网站优化方案',
      reportId ? `关联报告：${reportId}` : '',
      websiteUrl.trim() ? `官网：${websiteUrl.trim()}` : '',
      `分析范围：${ANALYSIS_SCOPE.join('、')}`,
      summary ? `分析摘要：\n${summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const submitWebsiteRequirement = (withAnalysis: boolean) => {
    if (withAnalysis && !preview.trim()) {
      toast('请先运行网站分析，或选择直接提交需求', 'info');
      return;
    }
    stashGeoAssetWebsitePrefill({
      brandName,
      referenceUrl: websiteUrl.trim() || undefined,
      keywords: brandName,
      notes: buildPrefillNotes(withAnalysis),
    });
    onNavigate?.('site_optimize');
  };

  const hasUrl = Boolean(websiteUrl.trim());

  return (
    <div className="flex flex-col min-h-0 geo-page-content gap-3 p-4 pb-8">
      <div className="flex items-start gap-4">
        <div className="w-52 shrink-0 sticky top-0 self-start space-y-3 text-xs">
          <div>
            <p className="font-semibold text-[var(--color-title)] mb-2">网站 GEO 分析</p>
            <p className="text-xs font-medium text-[var(--neutral-text-02)] mb-2">分析范围</p>
            <ul className="space-y-1.5">
              {ANALYSIS_SCOPE.map((label) => (
                <li key={label} className="flex items-start gap-2 text-xs text-[var(--color-title)]">
                  <span className="text-[var(--color-primary)] font-bold">·</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
          {reportId && (
            <p className="text-[10px] text-[var(--neutral-text-03)]">
              关联报告：{reportId.slice(0, 8)}…
            </p>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="geo-card p-4 space-y-4">
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: 'var(--neutral-bg-02)' }}
            >
              <p className="text-xs font-medium text-[var(--color-title)]">还没有官网</p>
              {onNavigate && (
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-sm"
                  onClick={() => submitWebsiteRequirement(false)}
                >
                  直接提交网页需求
                </button>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-[var(--color-title)]">已有官网</p>
              <div>
                <label className="geo-label">官网 URL</label>
                <input
                  className="geo-input w-full mt-1 text-sm"
                  placeholder="https://www.example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                {brandHasWebsite && !hasUrl && (
                  <p className="text-[10px] text-[var(--neutral-text-03)] mt-1">
                    品牌档案中暂无官网，请填写或选择上方「直接提交」。
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  className="geo-btn-primary geo-btn-sm"
                  disabled={
                    loading || brandName === '__all__' || !hasUrl || isAgentTaskBlocking(taskId, taskStatus)
                  }
                  onClick={() => void runWebsiteAnalysis()}
                >
                  {loading ? '等待本机 Hermes…' : '运行网站分析'}
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-sm"
                    disabled={!preview.trim()}
                    onClick={() => submitWebsiteRequirement(true)}
                  >
                    根据分析结果提交需求
                  </button>
                )}
                {onNavigate && (
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-sm"
                    onClick={() => onNavigate('content_delivery', 'website')}
                  >
                    查看交付进度
                  </button>
                )}
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-sm"
                  disabled={!preview.trim()}
                  onClick={() => {
                    void navigator.clipboard.writeText(preview);
                    toast('已复制分析摘要', 'success');
                  }}
                >
                  复制摘要
                </button>
              </div>
              {taskId && (
                <AgentTaskBackgroundCard
                  taskId={taskId}
                  taskTitle={taskTitle}
                  initialStatus={taskStatus}
                  queueHint={queueHint}
                  onNavigate={onNavigate}
                  onComplete={onComplete}
                  onStatusChange={setTaskStatus}
                />
              )}
            </div>
          </div>

          <div className="geo-card p-4 min-h-[200px]">
            <p className="text-xs font-medium mb-2 text-[var(--neutral-text-02)]">分析结果</p>
            {preview ? (
              artifacts.length > 0 ? (
                <div className="space-y-3">
                  {artifacts.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {artifacts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`geo-btn-xs ${selectedArtifactId === a.id ? 'geo-btn-primary' : 'geo-btn-secondary'}`}
                          onClick={() => setSelectedArtifactId(a.id)}
                        >
                          {a.name ?? a.type ?? a.id}
                        </button>
                      ))}
                    </div>
                  )}
                  <GeoArtifactPreview
                    artifact={artifacts.find((a) => a.id === selectedArtifactId) ?? artifacts[0]}
                  />
                </div>
              ) : (
                <pre className="text-[11px] whitespace-pre-wrap overflow-auto max-h-[50vh] bg-[var(--neutral-bg-03)] p-3 rounded-lg">
                  {preview}
                </pre>
              )
            ) : (
              <p className="text-xs text-[var(--neutral-text-03)]">
                填写官网 URL 并运行分析后，优化方案与资产草稿将显示在这里，便于随网页需求交付给接单方。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
