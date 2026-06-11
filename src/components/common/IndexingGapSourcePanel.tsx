import type { ViewType } from '../../types';
import { buildIndexingGapHint } from '../../lib/article-effect-nav';

export interface IndexingGapSummary {
  targetQuestions: string[];
  targetPlatforms: string[];
  brandMentionRate: number;
  competitorMentions: string[];
  scheduleDays: number[];
}

interface Props {
  planId: string;
  resultIds: string[];
  onNavigate?: (view: ViewType, hint?: string) => void;
  /** 从排名监控选样后返回的目标页 */
  returnView: 'create_order' | 'generate_article';
  gapSummary?: IndexingGapSummary | null;
  summaryLoading?: boolean;
  showScheduleNote?: boolean;
  emptyHint?: string;
}

export default function IndexingGapSourcePanel({
  planId,
  resultIds,
  onNavigate,
  returnView,
  gapSummary,
  summaryLoading,
  showScheduleNote = false,
  emptyHint = '请先在排名监控勾选采样结果，再返回本页继续操作。',
}: Props) {
  const hasBindings = Boolean(planId && resultIds.length > 0);

  const goSelect = () => {
    if (!onNavigate) return;
    onNavigate('indexing_rank', planId || undefined);
  };

  const returnWithBindings = () => {
    if (!onNavigate || !hasBindings) return;
    onNavigate(returnView, buildIndexingGapHint(planId, resultIds));
  };

  return (
    <div className="text-xs geo-callout-warning p-3 space-y-2">
      {hasBindings ? (
        <>
          <p>
            已绑定 <strong>{resultIds.length}</strong> 条排名采样
            {planId ? `（计划 ${planId.slice(0, 8)}…）` : ''}
          </p>
          {showScheduleNote && <p>发布后自动创建 T+7 / T+14 / T+30 复测计划</p>}
          {summaryLoading && <p className="text-[var(--neutral-text-03)]">加载缺口摘要…</p>}
          {gapSummary && (
            <div
              className="rounded-md p-2.5 space-y-1 text-[var(--neutral-text-02)]"
              style={{ background: 'var(--neutral-bg-03)' }}
            >
              <p className="font-medium text-[var(--color-title)]">排名缺口</p>
              {gapSummary.targetQuestions.length > 0 && (
                <p>目标问题：{gapSummary.targetQuestions.join('、')}</p>
              )}
              {gapSummary.targetPlatforms.length > 0 && (
                <p>目标平台：{gapSummary.targetPlatforms.join('、')}</p>
              )}
              <p>当前品牌提及率：{gapSummary.brandMentionRate}%</p>
              {gapSummary.competitorMentions.length > 0 && (
                <p>竞品出现：{gapSummary.competitorMentions.join('、')}</p>
              )}
              {gapSummary.scheduleDays.length > 0 && (
                <p>
                  复测计划：发布后{' '}
                  {gapSummary.scheduleDays.map((d) => `T+${d}`).join(' / ')}
                </p>
              )}
            </div>
          )}
          {onNavigate && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              <button type="button" className="geo-link" onClick={goSelect}>
                调整采样
              </button>
              <button type="button" className="geo-link" onClick={returnWithBindings}>
                返回本页
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p>{emptyHint}</p>
          {onNavigate && (
            <button type="button" className="geo-link" onClick={goSelect}>
              去排名监控选择
            </button>
          )}
        </>
      )}
    </div>
  );
}
