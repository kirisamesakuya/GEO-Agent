import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, History, Search } from 'lucide-react';
import type { ViewType } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import GeoReportPrintLayout from './geo/GeoReportPrintLayout';
import { useToast } from '../context/ToastContext';
import { fetchGeoReports, formatGeoReportLabel, type GeoReportSummary } from '../lib/geo-report';
import { GEO_REPORT_FIELD_LABELS, GEO_REPORT_SECTION_ORDER } from '../lib/geo-report-fields';
import { exportGeoReportToPdf } from '../lib/geo-report-pdf';
import {
  DEFAULT_GEO_REPORT_WATERMARK,
  loadGeoReportWatermark,
  saveGeoReportWatermark,
  type GeoReportWatermarkSettings,
} from '../lib/geo-report-watermark';
import { isProspectBrandScope } from '../lib/brand-scope';
import { EFFECT_JUDGMENT_LABEL } from '../lib/article-effect-nav';
import {
  REPORT_TYPE_LABELS,
  SCORE_LABELS,
  confirmGeoAuditAction,
  setGeoReportBaseline,
  type GeoAuditDetail,
  type GeoAuditArtifact,
} from '../lib/geo-audit-client';
import GeoArtifactPreview, { GeoArtifactList } from './geo/GeoArtifactPreview';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialReportId?: string;
  /** 由 GEO 分析页嵌入时不重复品牌条 */
  embedded?: boolean;
}

function reportToPrintData(r: GeoReportSummary, title: string) {
  return {
    title,
    brandName: r.brandName,
    createdAt: r.createdAt,
    mentionRate: r.mentionRate,
    rank: r.rank,
    gapsFound: r.gapsFound,
    prospectMode: r.prospectMode,
    sections: {
      brandMentionSummary: r.brandMentionSummary,
      competitorAnalysis: r.competitorAnalysis,
      contentGap: r.contentGap,
      optimizationSuggestions: r.optimizationSuggestions,
    },
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
  const [articleEffects, setArticleEffects] = useState<
    Array<{
      contentItemId: string;
      title: string;
      platform: string;
      baseline?: { targetQuestions?: string[]; brandMentionRate?: number } | null;
      verification?: { overallJudgment?: string; checkpoints?: Record<string, { brandMentionRate?: number; judgment?: string }> } | null;
    }>
  >([]);

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
        const arts = (audit?.artifacts ?? []) as GeoAuditArtifact[];
        setSelectedArtifactId(arts[0]?.id ?? null);
      });
    void fetch(`/api/geo-reports/${selectedId}/article-effects`)
      .then((r) => (r.ok ? r.json() : { effects: [] }))
      .then((d) => setArticleEffects(d.effects ?? []));
  }, [selectedId]);

  const downloadPdf = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      await exportGeoReportToPdf(reportToPrintData(selected, selectedTitle), watermark);
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
          <BrandScopeBar label="查看哪个品牌的报告" brandName={brandName} onBrandChange={onBrandChange} />
        )}
        <p className="text-sm text-[var(--neutral-text-03)] mt-4">请选择具体品牌后查看 GEO 分析报告历史。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {!embedded && (
        <div className="shrink-0 px-6 pt-3 pb-2">
          <BrandScopeBar label="查看哪个品牌的报告" brandName={brandName} onBrandChange={onBrandChange} />
        </div>
      )}

      <div className="flex flex-1 min-h-0 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <aside
          className="w-72 shrink-0 flex flex-col border-r overflow-hidden"
          style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
        >
          <div className="p-3 space-y-2 shrink-0 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-title)]">
              <History className="w-3.5 h-3.5" />
              报告列表 ({reports.length})
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-text-03)]" />
              <input
                className="geo-input w-full pl-8 text-xs"
                placeholder="搜索标题、平台、关键词…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
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
                  {(r as GeoReportSummary).reportType
                    ? `${REPORT_TYPE_LABELS[(r as GeoReportSummary).reportType!] ?? '报告'} · `
                    : ''}
                  提及 {r.mentionRate ?? '—'}% · 缺口 {r.gapsFound ?? '—'}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
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
                    {auditDetail?.isBaseline && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                        基线报告
                      </span>
                    )}
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
                      生成任务包
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto geo-page-content p-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                    {auditDetail?.totalScore != null && (
                      <div className="geo-card p-3 text-center">
                        <p className="text-xs text-[var(--neutral-text-03)]">总分</p>
                        <p className="text-lg font-bold">{auditDetail.totalScore}</p>
                      </div>
                    )}
                    <div className="geo-card p-3 text-center">
                      <p className="text-xs text-[var(--neutral-text-03)]">提及率</p>
                      <p className="text-lg font-bold">{selected.mentionRate ?? '—'}%</p>
                    </div>
                    <div className="geo-card p-3 text-center">
                      <p className="text-xs text-[var(--neutral-text-03)]">排名</p>
                      <p className="text-lg font-bold">#{selected.rank ?? '—'}</p>
                    </div>
                    <div className="geo-card p-3 text-center">
                      <p className="text-xs text-[var(--neutral-text-03)]">内容缺口</p>
                      <p className="text-lg font-bold">{selected.gapsFound ?? '—'}</p>
                    </div>
                  </div>

                  {articleEffects.length > 0 && (
                    <section className="geo-card p-4 space-y-2">
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

                  {auditDetail?.scores && (
                    <section className="geo-card p-4">
                      <h3 className="text-sm font-semibold mb-3 text-[var(--color-title)]">分项评分</h3>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(auditDetail.scores).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2 py-1 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                            <span className="text-[var(--neutral-text-03)]">{SCORE_LABELS[k] ?? k}</span>
                            <span className="font-semibold">{v}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {(auditDetail?.findings?.length ?? 0) > 0 && (
                    <section className="geo-card p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-[var(--color-title)]">关键问题</h3>
                      {auditDetail!.findings!.map((f) => (
                        <div key={f.id} className="text-xs border rounded-lg p-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                          <p className="font-medium">
                            <span className="geo-tag-muted mr-1">{f.level}</span>
                            {f.title}
                          </p>
                          <p className="mt-1 text-[var(--neutral-text-03)]">{f.impact}</p>
                          <p className="mt-1">建议：{f.suggestion}</p>
                          {f.owner && <p className="mt-0.5 text-[10px] text-[var(--neutral-text-03)]">责任：{f.owner}</p>}
                        </div>
                      ))}
                    </section>
                  )}

                  {(auditDetail?.actionPlan?.length ?? 0) > 0 && (
                    <section className="geo-card p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-[var(--color-title)]">7 天行动计划</h3>
                      {auditDetail!.actionPlan!.map((a) => (
                        <div key={a.id} className="text-xs">
                          <span className="geo-tag-muted mr-1">{a.horizon}</span>
                          <strong>{a.title}</strong>
                          <p className="text-[var(--neutral-text-03)] mt-0.5">{a.detail}</p>
                        </div>
                      ))}
                    </section>
                  )}
                  {GEO_REPORT_SECTION_ORDER.map((key) => (
                    <section key={key} className="geo-card p-4">
                      <h3 className="text-sm font-semibold mb-2 text-[var(--color-title)]">
                        {GEO_REPORT_FIELD_LABELS[key]}
                      </h3>
                      <p className="text-sm whitespace-pre-wrap text-[var(--neutral-text-02)]">
                        {selected[key]}
                      </p>
                    </section>
                  ))}
                </div>

                <div
                  className="w-80 shrink-0 border-l overflow-y-auto p-4 space-y-4"
                  style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
                >
                  {(auditDetail?.artifacts?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[var(--color-title)] mb-2">Artifacts</h3>
                      <GeoArtifactList
                        artifacts={auditDetail!.artifacts!}
                        selectedId={selectedArtifactId}
                        onSelect={setSelectedArtifactId}
                      />
                      {selectedArtifactId && auditDetail?.artifacts && (
                        <div className="mt-3">
                          <GeoArtifactPreview
                            artifact={
                              auditDetail.artifacts.find((a) => a.id === selectedArtifactId) ??
                              auditDetail.artifacts[0]
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-title)] mb-2">下一步</h3>
                    <div className="flex flex-col gap-2">
                      {onNavigate && (
                        <>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => onNavigate('geo_analysis', 'audit')}
                          >
                            进入专业审计
                          </button>
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs w-full"
                            onClick={() => onNavigate('geo_analysis', 'assets')}
                          >
                            生成 Schema / llms.txt
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
                      <button
                        type="button"
                        className="geo-btn-secondary geo-btn-xs w-full"
                        onClick={async () => {
                          try {
                            await setGeoReportBaseline(selected.id);
                            setAuditDetail((d) => (d ? { ...d, isBaseline: true } : d));
                            toast('已设为月度对比基线', 'success');
                          } catch (e) {
                            toast(e instanceof Error ? e.message : '设置失败', 'error');
                          }
                        }}
                      >
                        {auditDetail?.isBaseline ? '已是基线报告' : '设为基线'}
                      </button>
                      {auditDetail?.taskId && onNavigate && (
                        <button
                          type="button"
                          className="geo-btn-secondary geo-btn-xs w-full"
                          onClick={() => onNavigate('agent_tasks', auditDetail.taskId!)}
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
                    <p className="text-xs font-semibold text-[var(--color-title)] mb-2">PDF 预览</p>
                    <div
                      className="rounded-lg border overflow-hidden bg-white"
                      style={{ borderColor: 'var(--neutral-divider-02)', maxHeight: 280 }}
                    >
                      <div
                        style={{
                          transform: 'scale(0.32)',
                          transformOrigin: 'top left',
                          width: '312%',
                          height: 400,
                        }}
                      >
                        <GeoReportPrintLayout
                          preview
                          data={reportToPrintData(selected, selectedTitle)}
                          watermark={watermark}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
