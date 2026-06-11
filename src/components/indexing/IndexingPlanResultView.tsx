import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  buildContentItemEffectHint,
  buildIndexingGapHint,
  EFFECT_JUDGMENT_LABEL,
} from '../../lib/article-effect-nav';
import { fetchIndexingGapAnalysis, type IndexingGapAnalysis } from '../../lib/indexing-gap-client';
import { GEO_AI_PLATFORM_LABELS } from '../../../lib/media-platforms';
import { formatPlanDateTime } from '../../lib/datetime-local';
import { formatIndexPlanStatus, formatIndexSchedule } from '../../lib/indexing-schedule';

interface PlanRow {
  id: string;
  brandName: string;
  name: string;
  platforms: string[];
  keywords: string[];
  status: string;
  queryAt?: string;
  scheduleFrequency?: string;
  scheduleRunTime?: string;
  scheduleWeekday?: number;
  scheduleMonthDay?: number;
  hitCount?: number;
  resultCount?: number;
}

interface IndexCitationLink {
  title: string;
  url: string;
}

interface Result {
  id: string;
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant: boolean;
  citationSnippet?: string;
  aiResponse?: string;
  citationUrls?: IndexCitationLink[];
  sampledAt: string;
}

interface Props {
  planId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onBack: () => void;
}

export default function IndexingPlanResultView({ planId, onNavigate, onBack }: Props) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<IndexingGapAnalysis | null>(null);
  const [gapCoverage, setGapCoverage] = useState<
    Record<string, { contentItemId: string; title: string; overallJudgment: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterHit, setFilterHit] = useState<string>('');
  const [detailResult, setDetailResult] = useState<Result | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, analysis] = await Promise.all([
        fetch(`/api/indexing/plans/${planId}`).then((r) => r.json()),
        fetchIndexingGapAnalysis(planId),
      ]);
      const planRow = (planRes.plan ?? null) as PlanRow | null;
      setPlan(planRow);
      setResults((planRes.results ?? []) as Result[]);
      setGapAnalysis(analysis);

      const brand = planRow?.brandName;
      if (brand) {
        const coverageRes = await fetch(
          `/api/indexing/plans/${planId}/gap-coverage?brandName=${encodeURIComponent(brand)}`
        ).then((r) => r.json());
        const map: Record<
          string,
          { contentItemId: string; title: string; overallJudgment: string }
        > = {};
        for (const link of (coverageRes.links ?? []) as Array<{
          question: string;
          contentItemId: string;
          title: string;
          overallJudgment: string;
        }>) {
          map[link.question] = {
            contentItemId: link.contentItemId,
            title: link.title,
            overallJudgment: link.overallJudgment,
          };
        }
        setGapCoverage(map);
      }
    } catch {
      toast('加载查询结果失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [planId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredResults = useMemo(
    () =>
      results.filter((r) => {
        if (filterPlatform && r.platform !== filterPlatform) return false;
        if (filterHit === 'true' && !r.hit) return false;
        if (filterHit === 'false' && r.hit) return false;
        return true;
      }),
    [results, filterPlatform, filterHit]
  );

  const gapResultIds = gapAnalysis?.gapResultIds ?? [];
  const canActOnGaps = gapResultIds.length > 0;

  const createGapCampaign = () => {
    if (!canActOnGaps || !onNavigate) {
      toast('暂无排名缺口可操作', 'error');
      return;
    }
    onNavigate('create_order', buildIndexingGapHint(planId, gapResultIds));
  };

  const generateGapArticles = () => {
    if (!canActOnGaps || !onNavigate) {
      toast('暂无排名缺口可操作', 'error');
      return;
    }
    onNavigate('generate_article', buildIndexingGapHint(planId, gapResultIds));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="geo-link text-xs inline-flex items-center gap-1 mb-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回查询计划
          </button>
          <h3 className="text-base font-semibold text-[var(--color-title)]">
            {plan?.name ?? '查询结果'}
          </h3>
          {plan && (
            <p className="text-xs text-[var(--neutral-text-03)] mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>{plan.brandName}</span>
              <span>{plan.platforms.join('、')}</span>
              <span>{formatPlanDateTime(plan.queryAt)}</span>
              <span>{formatIndexSchedule(plan)}</span>
              <span>{formatIndexPlanStatus(plan.status)}</span>
            </p>
          )}
        </div>
        {onNavigate && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm"
              disabled={!canActOnGaps}
              onClick={createGapCampaign}
            >
              制定投放方案
              {canActOnGaps ? `（${gapResultIds.length} 条缺口）` : ''}
            </button>
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm"
              disabled={!canActOnGaps}
              onClick={generateGapArticles}
            >
              生成补缺文章
              {canActOnGaps ? `（${gapResultIds.length} 条缺口）` : ''}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载中…</p>
      ) : (
        <>
          {gapAnalysis && (
            <div
              className="geo-card p-4 text-xs space-y-1.5"
              style={{ color: 'var(--neutral-text-02)' }}
            >
              {!gapAnalysis.hasResults ? (
                <p className="geo-callout-warning p-2 -m-1">该计划尚未执行采样。</p>
              ) : gapAnalysis.gapCount === 0 ? (
                <p className="geo-callout-success p-2 -m-1">
                  共 {gapAnalysis.totalCount} 条采样，品牌已全部命中，暂无补位缺口。
                </p>
              ) : (
                <>
                  <p className="font-medium text-sm text-[var(--color-title)]">AI 已梳理排名缺口</p>
                  <p>
                    共 {gapAnalysis.totalCount} 条采样，命中 {gapAnalysis.hitCount}，缺口{' '}
                    {gapAnalysis.gapCount}
                  </p>
                  {gapAnalysis.targetQuestions.length > 0 && (
                    <p>目标问题：{gapAnalysis.targetQuestions.join('、')}</p>
                  )}
                  {gapAnalysis.targetPlatforms.length > 0 && (
                    <p>目标平台：{gapAnalysis.targetPlatforms.join('、')}</p>
                  )}
                  <p>当前品牌提及率：{gapAnalysis.brandMentionRate}%</p>
                  {gapAnalysis.competitorMentions.length > 0 && (
                    <p>竞品出现：{gapAnalysis.competitorMentions.join('、')}</p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="geo-card p-4">
            <div className="flex flex-wrap gap-2 mb-3 items-center">
              <span className="text-sm font-semibold">采样明细</span>
              <select
                className="geo-input text-xs"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="">全部平台</option>
                {GEO_AI_PLATFORM_LABELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="geo-input text-xs"
                value={filterHit}
                onChange={(e) => setFilterHit(e.target.value)}
              >
                <option value="">全部命中</option>
                <option value="true">已命中</option>
                <option value="false">未命中</option>
              </select>
              <span className="text-xs text-[var(--neutral-text-03)] ml-auto">
                共 {filteredResults.length} 条
              </span>
            </div>
            <div className="geo-table-wrap">
              <table className="geo-table geo-table--compact">
                <thead>
                  <tr>
                    <th>品牌</th>
                    <th>关键词</th>
                    <th>平台</th>
                    <th>命中</th>
                    <th>引用商家文</th>
                    <th>AI 返回</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-[var(--neutral-text-03)]">
                        暂无采样结果
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.id}>
                        <td className="text-xs">{plan?.brandName ?? '—'}</td>
                        <td>
                          <div>{r.keyword}</div>
                          {gapCoverage[r.keyword] && onNavigate && (
                            <button
                              type="button"
                              className="geo-link text-[11px] mt-0.5"
                              onClick={() =>
                                onNavigate(
                                  'content_delivery',
                                  buildContentItemEffectHint(gapCoverage[r.keyword].contentItemId)
                                )
                              }
                            >
                              已有补缺文章，查看效果（
                              {EFFECT_JUDGMENT_LABEL[gapCoverage[r.keyword].overallJudgment] ??
                                '待观察'}
                              ）
                            </button>
                          )}
                        </td>
                        <td>{r.platform}</td>
                        <td>{r.hit ? '是' : '否'}</td>
                        <td>{r.citedMerchant ? '是' : '否'}</td>
                        <td className="text-xs">
                          <div className="flex items-center gap-2 min-w-0 max-w-[280px]">
                            <span className="truncate text-[var(--neutral-text-03)]">
                              {r.citationSnippet ?? (r.aiResponse ? '有完整回答' : '—')}
                            </span>
                            {(r.aiResponse || r.citationSnippet) && (
                              <button
                                type="button"
                                className="geo-link shrink-0 text-[11px]"
                                onClick={() => setDetailResult(r)}
                              >
                                查看
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="text-xs">{r.sampledAt.slice(0, 16).replace('T', ' ')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {detailResult && (
        <div
          className="geo-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="index-result-detail-title"
          onClick={() => setDetailResult(null)}
        >
          <div
            className="geo-modal max-w-2xl relative max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDetailResult(null)}
              className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg z-10"
              style={{ color: 'var(--neutral-text-03)' }}
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="geo-modal-head shrink-0">
              <h3
                id="index-result-detail-title"
                className="font-bold text-sm"
                style={{ color: 'var(--neutral-text-01)' }}
              >
                AI 返回详情
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                {detailResult.platform} · {detailResult.keyword}
              </p>
            </div>

            <div className="px-5 pb-5 space-y-4 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div style={{ color: 'var(--neutral-text-03)' }}>命中</div>
                  <div className="font-medium mt-0.5">{detailResult.hit ? '是' : '否'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--neutral-text-03)' }}>引用商家文</div>
                  <div className="font-medium mt-0.5">{detailResult.citedMerchant ? '是' : '否'}</div>
                </div>
                <div className="col-span-2">
                  <div style={{ color: 'var(--neutral-text-03)' }}>采样时间</div>
                  <div className="font-medium mt-0.5">
                    {detailResult.sampledAt.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--neutral-text-02)' }}>
                  完整 AI 回答
                </div>
                <pre
                  className="text-xs leading-relaxed whitespace-pre-wrap rounded-lg p-3 border max-h-[320px] overflow-y-auto"
                  style={{
                    color: 'var(--neutral-text-01)',
                    background: 'var(--neutral-bg-02)',
                    borderColor: 'var(--neutral-border-01)',
                  }}
                >
                  {detailResult.aiResponse ?? detailResult.citationSnippet ?? '暂无返回内容'}
                </pre>
              </div>

              {detailResult.citationUrls && detailResult.citationUrls.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--neutral-text-02)' }}>
                    引用文章（{detailResult.citationUrls.length}）
                  </div>
                  <ul className="space-y-2">
                    {detailResult.citationUrls.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="geo-link text-xs inline-flex items-center gap-1.5 max-w-full"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{link.title || link.url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="geo-modal-foot shrink-0 flex justify-end">
              <button
                type="button"
                className="geo-btn-secondary text-sm"
                onClick={() => setDetailResult(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
