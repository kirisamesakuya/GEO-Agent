import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, GitCompare, History, Search, X } from 'lucide-react';
import type { ViewType } from '../types';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import GeoReportPrintLayout, {
  pickGeoReportHtmlArtifact,
  type GeoReportPrintData,
} from './geo/GeoReportPrintLayout';
import { useToast } from '../context/ToastContext';
import { fetchGeoReports, formatGeoReportLabel, type GeoReportSummary } from '../lib/geo-report';
import { exportGeoReportToPdf } from '../lib/geo-report-pdf';
import {
  DEFAULT_GEO_REPORT_WATERMARK,
  loadGeoReportWatermark,
  saveGeoReportWatermark,
  type GeoReportWatermarkSettings,
} from '../lib/geo-report-watermark';
import {
  REPORT_TYPE_LABELS,
  confirmGeoAuditAction,
  submitGeoCompare,
  normalizeGeoAuditFindings,
  normalizeGeoAuditScores,
  filterDisplayableGeoArtifacts,
  type GeoAuditDetail,
  type GeoAuditArtifact,
} from '../lib/geo-audit-client';
import { isProspectBrandScope } from '../lib/brand-scope';
import { EFFECT_JUDGMENT_LABEL } from '../lib/article-effect-nav';
import { navigateToAgentTaskResult } from '../lib/agent-task-result-nav';
import OverlayDrawer from './common/OverlayDrawer';
import GeoArtifactPreview, { GeoArtifactList } from './geo/GeoArtifactPreview';
import GeoPreCrawlPanel, { extractPreCrawlFromAuditRaw } from './geo/GeoPreCrawlPanel';
import { buildLoopNavigateHint, applyLoopNavigateUrl } from '../lib/geo-capability-loop';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialReportId?: string;
  /** 由 GEO 分析页嵌入时不重复品牌条 */
  embedded?: boolean;
}

function reportSelectLabel(r: GeoReportSummary) {
  const title = formatGeoReportLabel(r).replace(/^【演示】/, '').trim();
  const parts: string[] = [];
  if (r.mentionRate != null) parts.push(`提及 ${r.mentionRate}%`);
  if (r.totalScore != null) parts.push(`${r.totalScore} 分`);
  return parts.length ? `${title}（${parts.join(' · ')}）` : title;
}

function formatDelta(value: number, suffix = '') {
  if (value === 0) return `持平${suffix}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

function reportToPrintData(
  r: GeoReportSummary,
  title: string,
  audit?: GeoAuditDetail | null
): GeoReportPrintData {
  const raw = audit?.raw ?? {};
  const rawData = (raw.data ?? {}) as Record<string, unknown>;
  return {
    title,
    brandName: r.brandName,
    createdAt: r.createdAt,
    mentionRate: audit?.mentionRate ?? r.mentionRate,
    rank: audit?.rank ?? r.rank,
    gapsFound: audit?.gapsFound ?? r.gapsFound,
    totalScore: audit?.totalScore ?? null,
    prospectMode: r.prospectMode,
    sections: {
      brandMentionSummary: audit?.brandMentionSummary ?? r.brandMentionSummary,
      competitorAnalysis: audit?.competitorAnalysis ?? r.competitorAnalysis,
      contentGap: audit?.contentGap ?? r.contentGap,
      optimizationSuggestions: audit?.optimizationSuggestions ?? r.optimizationSuggestions,
    },
    scores: normalizeGeoAuditScores(audit?.scores),
    findings: normalizeGeoAuditFindings(audit?.findings),
    actionPlan: audit?.actionPlan,
    deliveryStatus: audit?.deliveryStatus ?? (raw.deliveryStatus as string | undefined),
    qualityGate: audit?.qualityGate ?? (raw.qualityGate as GeoReportPrintData['qualityGate']),
    executiveSummary: (rawData.executiveSummary ?? raw.executiveSummary) as GeoReportPrintData['executiveSummary'],
    nextBestAction: audit?.nextBestAction ?? (raw.nextBestAction as GeoReportPrintData['nextBestAction']),
  };
}

export default function GeoReportHistoryView({
  brandName,
  onBrandChange,
  onNavigate,
  initialReportId,
  embedded = false,
}: Props) {
  const { toast } = useToast();
  const [reports, setReports] = useState<GeoReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialReportId ?? null);
  const [query, setQuery] = useState('');
  const [watermark, setWatermark] = useState<GeoReportWatermarkSettings>(() => loadGeoReportWatermark());
  const [exporting, setExporting] = useState(false);
  const [auditDetail, setAuditDetail] = useState<GeoAuditDetail | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState('');
  const [articleEffects, setArticleEffects] = useState<
    Array<{
      contentItemId: string;
      title: string;
      platform: string;
      baseline?: { targetQuestions?: string[]; brandMentionRate?: number } | null;
      verification?: { overallJudgment?: string; checkpoints?: Record<string, { brandMentionRate?: number; judgment?: string }> } | null;
    }>
  >([]);
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!selectedId) setToolsDrawerOpen(false);
  }, [selectedId]);

  useEffect(() => {
    if (!brandName || brandName === '__all__' || isProspectBrandScope(brandName)) {
      setReports([]);
      setSelectedId(null);
      return;
    }
    setLoading(true);
    void fetchGeoReports(brandName)
      .then((rows) => {
        setReports(rows);
        setSelectedId((prev) => {
          if (initialReportId && rows.some((r) => r.id === initialReportId)) return initialReportId;
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows[0]?.id ?? null;
        });
      })
      .finally(() => setLoading(false));
  }, [brandName, initialReportId]);

  useEffect(() => {
    saveGeoReportWatermark(watermark);
  }, [watermark]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => formatGeoReportLabel(r).toLowerCase().includes(q));
  }, [reports, query]);

  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const selectedTitle = selected ? formatGeoReportLabel(selected) : '';
  const printData = selected ? reportToPrintData(selected, selectedTitle, auditDetail) : null;
  const displayArtifacts = useMemo(
    () => filterDisplayableGeoArtifacts(auditDetail?.artifacts),
    [auditDetail?.artifacts]
  );
  const htmlReport = pickGeoReportHtmlArtifact(displayArtifacts);
  const normalizedFindings = useMemo(
    () => normalizeGeoAuditFindings(auditDetail?.findings),
    [auditDetail?.findings]
  );
  const preCrawlCtx = extractPreCrawlFromAuditRaw(auditDetail?.raw ?? null);
  const reportsDesc = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports]
  );

  const compareBaseline = selected;
  const compareTarget = reports.find((r) => r.id === compareTargetId) ?? null;
  const otherReports = reports.filter((r) => r.id !== selectedId);
  const canSubmitCompare = Boolean(
    compareBaseline && compareTarget && compareTarget.id !== compareBaseline.id
  );
  const compareDeltaPreview =
    compareBaseline && compareTarget && canSubmitCompare
      ? {
          mention: (compareTarget.mentionRate ?? 0) - (compareBaseline.mentionRate ?? 0),
          score: (compareTarget.totalScore ?? 0) - (compareBaseline.totalScore ?? 0),
          gaps: (compareTarget.gapsFound ?? 0) - (compareBaseline.gapsFound ?? 0),
        }
      : null;

  useEffect(() => {
    if (!selectedId || !reports.length) {
      setCompareTargetId('');
      return;
    }
    setCompareTargetId((prev) => {
      if (prev && prev !== selectedId && reports.some((r) => r.id === prev)) return prev;
      return reportsDesc.find((r) => r.id !== selectedId)?.id ?? '';
    });
  }, [selectedId, reports, reportsDesc]);

  const handleGenerateCompare = async () => {
    if (!compareBaseline || !compareTarget || compareTarget.id === compareBaseline.id) return;

    setCompareLoading(true);
    try {
      const profileRes = await fetch(
        `/api/brand-profile?brandName=${encodeURIComponent(compareBaseline.brandName)}`
      );
      const profile = profileRes.ok ? await profileRes.json() : {};
      const { task, error } = await submitGeoCompare({
        brandName: compareBaseline.brandName,
        baselineReportId: compareBaseline.id,
        currentReportId: compareTarget.id,
        brandUrl: profile?.website,
      });
      if (error || !task) throw new Error(error ?? '提交失败');
      toast('对比报告已提交，请在任务结果查看交付物', 'success');
      if (onNavigate) navigateToAgentTaskResult(onNavigate, task.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : '对比失败', 'error');
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setAuditDetail(null);
      setArticleEffects([]);
      return;
    }
    void fetch(`/api/geo-audits/${selectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const audit = d?.audit ?? null;
        setAuditDetail(audit);
        const arts = filterDisplayableGeoArtifacts(audit?.artifacts as GeoAuditArtifact[] | undefined);
        const first = arts[0];
        setSelectedArtifactId(first ? (first.id ?? `${first.type ?? 'artifact'}-${first.name ?? 0}`) : null);
      });
    void fetch(`/api/geo-reports/${selectedId}/article-effects`)
      .then((r) => (r.ok ? r.json() : { effects: [] }))
      .then((d) => setArticleEffects(d.effects ?? []));
  }, [selectedId]);

  const downloadPdf = async () => {
    if (!selected || !printData) return;
    setExporting(true);
    try {
      await exportGeoReportToPdf(printData, watermark);
      toast('PDF 已下载', 'success');
    } catch {
      toast('PDF 生成失败，请重试', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (brandName === '__all__' || isProspectBrandScope(brandName)) {
    return (
      <div className={embedded ? 'p-6' : 'geo-page-content p-6'}>
        {!embedded && (
          <PageHeaderWithBrand
            title="GEO 报告历史"
            brandName={brandName}
            onBrandChange={onBrandChange}
          />
        )}
        <p className="text-sm text-[var(--neutral-text-03)] mt-4">请选择具体品牌后查看 GEO 分析报告历史。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {!embedded && (
        <div className="shrink-0 px-6 pt-3 pb-2">
          <PageHeaderWithBrand
            title="GEO 报告历史"
            brandName={brandName}
            onBrandChange={onBrandChange}
          />
        </div>
      )}

      <div
        className="flex items-start min-w-0 border-t"
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        <aside
          className="w-72 shrink-0 sticky top-0 self-start flex flex-col border-r geo-scroll-hide max-h-[calc(100vh-var(--layout-header-height))]"
          style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
        >
          <div className="p-3 space-y-2 shrink-0 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-title)]">
              <History className="w-3.5 h-3.5" />
              报告列表 ({reports.length})
            </div>
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--neutral-text-03)]"
                aria-hidden
              />
              <input
                className="geo-input geo-input-with-icon w-full text-xs"
                placeholder="搜索标题、平台、关键词…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {loading && (
              <p className="p-4 text-xs text-[var(--neutral-text-03)]">加载中…</p>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-4 text-xs text-[var(--neutral-text-03)] space-y-2">
                <p>暂无分析报告</p>
                {onNavigate && (
                  <button type="button" className="geo-link" onClick={() => onNavigate('geo_analysis')}>
                    去提交 GEO 分析
                  </button>
                )}
              </div>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left px-3 py-3 border-b text-xs transition-colors ${
                  selectedId === r.id ? 'geo-nav-active' : 'geo-nav-item'
                }`}
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <p className="font-medium line-clamp-2 leading-snug">{formatGeoReportLabel(r)}</p>
                <p className="mt-1 text-[10px] text-[var(--neutral-text-03)]">
                  {r.reportType ? `${REPORT_TYPE_LABELS[r.reportType] ?? '报告'} · ` : ''}
                  提及 {r.mentionRate ?? '—'}% · 缺口 {r.gapsFound ?? '—'}
                  {r.totalScore != null ? ` · ${r.totalScore}分` : ''}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--neutral-text-03)]">
              从左侧选择一份报告查看详情
            </div>
          ) : (
            <>
              <div
                className="shrink-0 px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-[var(--color-title)] truncate">{selectedTitle}</h2>
                  </div>
                  <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5">
                    编号 {selected.id.slice(0, 8)}…
                    {auditDetail?.taskMeta?.skillName && (
                      <> · Skill {auditDetail.taskMeta.skillName}</>
                    )}
                    {auditDetail?.taskMeta?.executor && (
                      <> · {auditDetail.taskMeta.executor === 'nous_hermes' ? '本机 Hermes' : auditDetail.taskMeta.executor}</>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
                    onClick={() => setToolsDrawerOpen(true)}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    对比复盘
                  </button>
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1.5"
                    disabled={exporting}
                    onClick={() => void downloadPdf()}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exporting ? '生成 PDF…' : '下载 PDF（含水印）'}
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
                      onClick={() => onNavigate('create_order', `geo:${selected.id}`)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      按报告发付费信源
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="geo-report-document-shell p-6 pb-10">
                  {htmlReport ? (
                    <div
                      className="geo-report-html-document mx-auto max-w-[820px] geo-card overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: htmlReport }}
                    />
                  ) : printData ? (
                    <div className="mx-auto max-w-[820px] space-y-4">
                      {(preCrawlCtx.snapshot || preCrawlCtx.rulePreview) && (
                        <GeoPreCrawlPanel
                          snapshot={preCrawlCtx.snapshot}
                          rulePreview={preCrawlCtx.rulePreview}
                          findings={normalizedFindings}
                          scoringSource={preCrawlCtx.scoringSource}
                        />
                      )}
                      <GeoReportPrintLayout preview data={printData} watermark={watermark.enabled ? watermark : null} />
                    </div>
                  ) : null}

                  {articleEffects.length > 0 && (
                    <section className="geo-card p-4 space-y-2 mx-auto max-w-[820px] mt-4">
                      <h3 className="text-sm font-semibold text-[var(--color-title)]">文章效果验证</h3>
                      <p className="text-[10px] text-[var(--neutral-text-03)]">
                        以下为采样对比，不代表 AI 平台稳定推荐；建议结合 7/14/30 天复测持续观察。
                      </p>
                      <table className="w-full text-xs geo-table">
                        <thead>
                          <tr>
                            <th className="text-left">文章</th>
                            <th>目标问题</th>
                            <th>平台</th>
                            <th>判断</th>
                          </tr>
                        </thead>
                        <tbody>
                          {articleEffects.map((row) => (
                            <tr key={row.contentItemId}>
                              <td className="max-w-[140px] truncate">{row.title}</td>
                              <td className="max-w-[120px] truncate">
                                {row.baseline?.targetQuestions?.[0] ?? '—'}
                              </td>
                              <td>{row.platform}</td>
                              <td>
                                {EFFECT_JUDGMENT_LABEL[row.verification?.overallJudgment ?? 'observing'] ??
                                  row.verification?.overallJudgment ??
                                  '待观察'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                </div>
              </div>

              {toolsDrawerOpen && (
              <OverlayDrawer
                onClose={() => setToolsDrawerOpen(false)}
                width={320}
                panelClassName="border-l"
                panelStyle={{ background: 'var(--neutral-bg-03)', borderColor: 'var(--neutral-divider-02)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-[var(--color-bg-card)]"
                  style={{ borderColor: 'var(--neutral-divider-02)' }}
                >
                  <h3 className="text-sm font-semibold text-[var(--color-title)]">对比复盘</h3>
                  <button type="button" onClick={() => setToolsDrawerOpen(false)} className="p-1 rounded hover:bg-[var(--color-bg)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                  <div
                    className="rounded-lg border p-3 space-y-3"
                    style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
                  >
                    <div>
                      <label className="geo-label text-[10px]">对比报告</label>
                      <select
                        className="geo-input w-full text-xs mt-1"
                        value={compareTargetId}
                        onChange={(e) => setCompareTargetId(e.target.value)}
                        disabled={!selected || otherReports.length === 0}
                      >
                        {!selected || otherReports.length === 0 ? (
                          <option value="">需至少 2 份报告</option>
                        ) : (
                          otherReports.map((r) => (
                            <option key={r.id} value={r.id}>
                              {reportSelectLabel(r)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {compareDeltaPreview && (
                      <div
                        className="grid grid-cols-3 gap-1 rounded-lg px-2 py-2 text-center text-[10px]"
                        style={{ background: 'var(--neutral-bg-02)' }}
                      >
                        <div>
                          <p className="text-[var(--neutral-text-03)]">提及率</p>
                          <p className="font-semibold text-[var(--color-title)]">
                            {formatDelta(compareDeltaPreview.mention, '%')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--neutral-text-03)]">总分</p>
                          <p className="font-semibold text-[var(--color-title)]">
                            {formatDelta(compareDeltaPreview.score, '')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--neutral-text-03)]">缺口</p>
                          <p className="font-semibold text-[var(--color-title)]">
                            {formatDelta(compareDeltaPreview.gaps, '项')}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="geo-btn-primary geo-btn-xs w-full"
                      disabled={!canSubmitCompare || compareLoading}
                      onClick={() => void handleGenerateCompare()}
                    >
                      {compareLoading ? '生成中…' : '生成对比报告'}
                    </button>

                    {onNavigate && (
                      <button
                        type="button"
                        className="geo-link text-[10px] text-left"
                        onClick={() => onNavigate('agent_task_results')}
                      >
                        查看任务结果 →
                      </button>
                    )}
                  </div>

                  {(preCrawlCtx.snapshot || preCrawlCtx.rulePreview) && (
                    <GeoPreCrawlPanel
                      compact
                      snapshot={preCrawlCtx.snapshot}
                      rulePreview={preCrawlCtx.rulePreview}
                      findings={normalizedFindings}
                      scoringSource={preCrawlCtx.scoringSource}
                    />
                  )}
                  {displayArtifacts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[var(--color-title)] mb-2">Artifacts</h3>
                      <GeoArtifactList
                        artifacts={displayArtifacts}
                        selectedId={selectedArtifactId}
                        onSelect={setSelectedArtifactId}
                      />
                      {selectedArtifactId && (
                        <div className="mt-3">
                          <GeoArtifactPreview
                            artifact={
                              displayArtifacts.find((a) => a.id === selectedArtifactId) ??
                              displayArtifacts[0]
                            }
                            onRegenerateAsset={
                              onNavigate
                                ? () => {
                                    onNavigate('site_optimize');
                                  }
                                : undefined
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-title)] mb-2">整改与投放</h3>
                    <div className="flex flex-col gap-2">
                      {onNavigate && (
                        <>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => onNavigate('geo_analysis', 'audit')}
                          >
                            继续深度分析
                          </button>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => onNavigate('site_optimize')}
                          >
                            自有网站优化
                          </button>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => onNavigate('keyword_library', 'mine')}
                          >
                            补挖关键词
                          </button>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => {
                              const nav = buildLoopNavigateHint('monitor', {
                                brandName: selected.brandName,
                                geoReportId: selected.id,
                              });
                              if (nav.urlParams) applyLoopNavigateUrl(nav.urlParams);
                              onNavigate(nav.view, nav.hint);
                            }}
                          >
                            创建监测计划
                          </button>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => onNavigate('generate_article', `geo:${selected.id}`)}
                          >
                            生成文章自己发布
                          </button>
                        </>
                      )}
                      {onNavigate && (
                        <button
                          type="button"
                          className="geo-btn-secondary geo-btn-xs w-full"
                          onClick={async () => {
                            try {
                              await confirmGeoAuditAction(selected.id, 'generate_task_pack', 'medium');
                              onNavigate('create_order', `geo:${selected.id}`);
                            } catch (e) {
                              toast(e instanceof Error ? e.message : '需先确认', 'error');
                            }
                          }}
                        >
                          生成整改任务包（需确认）
                        </button>
                      )}
                      {auditDetail?.taskId && onNavigate && (
                        <button
                          type="button"
                          className="geo-btn-secondary geo-btn-xs w-full"
                          onClick={() => navigateToAgentTaskResult(onNavigate, auditDetail.taskId!)}
                        >
                          查看关联任务
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-title)] mb-2">PDF 水印设置</h3>
                    <p className="text-[10px] text-[var(--neutral-text-03)] mb-3">
                      下载 PDF 时叠加水印，便于发给客户。设置会自动保存到本机。
                    </p>
                    <label className="flex items-center gap-2 text-xs mb-3">
                      <input
                        type="checkbox"
                        checked={watermark.enabled}
                        onChange={(e) => setWatermark((w) => ({ ...w, enabled: e.target.checked }))}
                      />
                      启用水印
                    </label>
                    <label className="geo-label">水印文字</label>
                    <input
                      className="geo-input w-full mt-1 text-sm mb-3"
                      value={watermark.text}
                      disabled={!watermark.enabled}
                      onChange={(e) => setWatermark((w) => ({ ...w, text: e.target.value }))}
                      placeholder="例如：云杉口腔 · 仅供客户查阅"
                    />
                    <label className="geo-label">
                      透明度 {Math.round(watermark.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={6}
                      max={35}
                      className="w-full mt-1 mb-3"
                      disabled={!watermark.enabled}
                      value={Math.round(watermark.opacity * 100)}
                      onChange={(e) =>
                        setWatermark((w) => ({ ...w, opacity: Number(e.target.value) / 100 }))
                      }
                    />
                    <label className="geo-label">字号 {watermark.fontSize}px</label>
                    <input
                      type="range"
                      min={24}
                      max={64}
                      className="w-full mt-1"
                      disabled={!watermark.enabled}
                      value={watermark.fontSize}
                      onChange={(e) =>
                        setWatermark((w) => ({ ...w, fontSize: Number(e.target.value) }))
                      }
                    />
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-xs mt-3 w-full"
                      onClick={() => setWatermark({ ...DEFAULT_GEO_REPORT_WATERMARK })}
                    >
                      恢复默认
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[var(--color-title)] mb-2">导出说明</p>
                    <p className="text-[10px] text-[var(--neutral-text-03)]">
                      左侧为报告正文。下载 PDF 时将按当前水印设置导出。
                    </p>
                  </div>
                </div>
              </OverlayDrawer>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
