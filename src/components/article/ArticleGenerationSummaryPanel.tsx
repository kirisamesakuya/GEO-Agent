import type { ReactNode } from 'react';
import type { AgentTaskStatus } from '../../types';
import type { ArticleQualityChecks } from '../../lib/content-item-meta';
import TaskStatusPill from '../common/TaskStatusPill';
import { Database, Lightbulb, Monitor, ShieldCheck, Sparkles, Tag } from 'lucide-react';

export interface GenerationPreview {
  brandName: string;
  sourceType: 'brand_profile' | 'geo_report' | 'indexing_result';
  geoReportId: string | null;
  geoReportTitle: string | null;
  keywords: string[];
  negativeKeywords: string[];
  knowledgeCategories: string[];
  knowledgeWarning: string | null;
  reportSummary: {
    gapsFound: number | null;
    contentGap: string;
    topFindings: string[];
    actionPlan: string[];
    optimizationSuggestions: string;
  } | null;
  promptOutline: string[];
  modelLabel: string;
  quantity: number;
  targetPlatform: string;
  indexingGapSummary: {
    targetQuestions: string[];
    targetPlatforms: string[];
    brandMentionRate: number;
    competitorMentions: string[];
    scheduleDays: number[];
  } | null;
}

interface Props {
  preview: GenerationPreview | null;
  previewLoading?: boolean;
  qualityChecks?: ArticleQualityChecks | null;
  taskStatus?: AgentTaskStatus | null;
  taskProgress?: number;
  loading?: boolean;
  contentBatchId?: string | null;
  articleCount?: number;
  onPreviewInput: () => void;
  onViewReport?: () => void;
  onOpenContentLibrary?: () => void;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <span className={`block h-2.5 rounded-full bg-slate-100 ${className}`} />;
}

function SummarySkeletonBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3.5 space-y-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--neutral-text-02)]">
        <Icon className="w-4 h-4 text-[var(--neutral-text-03)]" />
        {title}
      </div>
      {children ?? (
        <div className="space-y-2">
          <SkeletonLine className="w-3/5" />
          <SkeletonLine className="w-4/5" />
          <SkeletonLine className="w-2/3" />
        </div>
      )}
    </div>
  );
}

export default function ArticleGenerationSummaryPanel({
  preview,
  previewLoading,
  qualityChecks,
  taskStatus,
  taskProgress = 0,
  loading,
  contentBatchId,
  articleCount = 0,
  onPreviewInput,
  onViewReport,
  onOpenContentLibrary,
}: Props) {
  const showTaskStatus = Boolean(loading || taskStatus);
  const showSuccess = Boolean(contentBatchId && articleCount > 0 && !loading);

  return (
    <aside className="geo-card overflow-hidden w-full min-h-[240px] xl:min-h-[calc(100vh-10rem)] h-fit xl:sticky xl:top-4">
      <div
        className="px-5 py-4 border-b flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        <h3 className="text-base font-semibold text-[var(--color-title)]">写作上下文摘要</h3>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--neutral-text-03)]">
          <ShieldCheck className="w-4 h-4" />
          提交前校验 · 不创建任务
        </span>
      </div>

      <div className="p-5 space-y-4">

      {showTaskStatus && (
        <div className="rounded-lg p-3 bg-[var(--neutral-bg-03)] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {taskStatus && <TaskStatusPill status={taskStatus} />}
            {loading && taskProgress > 0 && (
              <span className="text-xs text-[var(--neutral-text-03)]">进度 {taskProgress}%</span>
            )}
          </div>
          {loading && taskProgress > 0 && (
            <div className="h-1.5 rounded-full bg-[var(--neutral-divider-02)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${Math.min(100, taskProgress)}%` }}
              />
            </div>
          )}
          <p className="text-xs text-[var(--neutral-text-03)]">生成结果进入内容交付，不会自动发布</p>
        </div>
      )}

      {showSuccess && (
        <div className="geo-callout-success text-xs space-y-2">
          <p>
            已生成 <strong>{articleCount}</strong> 篇并进入内容交付。
          </p>
          {onOpenContentLibrary && (
            <button type="button" className="geo-btn-primary geo-btn-sm" onClick={onOpenContentLibrary}>
              打开内容交付
            </button>
          )}
        </div>
      )}

      {!preview && !previewLoading && !showTaskStatus && (
        <div className="space-y-3">
          <div className="space-y-2 pb-2">
            <SkeletonLine className="w-32" />
            <SkeletonLine className="w-2/3" />
          </div>
          <SummarySkeletonBlock icon={Sparkles} title="基础信息" />
          <SummarySkeletonBlock icon={Tag} title="关键词">
            <div className="flex gap-2 flex-wrap">
              <SkeletonLine className="w-16" />
              <SkeletonLine className="w-20" />
              <SkeletonLine className="w-14" />
              <SkeletonLine className="w-18" />
            </div>
          </SummarySkeletonBlock>
          <SummarySkeletonBlock icon={Database} title="知识库引用">
            <div className="flex gap-2 flex-wrap">
              <SkeletonLine className="w-16" />
              <SkeletonLine className="w-20" />
              <SkeletonLine className="w-14" />
              <SkeletonLine className="w-18" />
              <SkeletonLine className="w-12" />
            </div>
          </SummarySkeletonBlock>
          <SummarySkeletonBlock icon={Monitor} title="目标平台">
            <div className="flex gap-2 flex-wrap">
              <SkeletonLine className="w-16" />
              <SkeletonLine className="w-14" />
              <SkeletonLine className="w-18" />
              <SkeletonLine className="w-16" />
            </div>
          </SummarySkeletonBlock>
          <SummarySkeletonBlock icon={Lightbulb} title="微调设置" />
          <p className="pt-3 text-center text-sm text-[var(--neutral-text-03)]">
            配置写作参数后，点击「预览输入摘要」查看上下文
          </p>
        </div>
      )}

      {previewLoading && <p className="text-xs text-[var(--neutral-text-03)]">加载摘要…</p>}

      {preview && (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-[var(--neutral-text-03)] mb-1">生成来源</p>
            <p className="font-medium">
              {preview.sourceType === 'geo_report'
                ? '根据 GEO 报告'
                : preview.sourceType === 'indexing_result'
                  ? '根据排名缺口'
                  : '按品牌资料'}
            </p>
            {preview.geoReportTitle && (
              <p className="mt-1 text-[var(--neutral-text-02)] line-clamp-2">{preview.geoReportTitle}</p>
            )}
          </div>

          {preview.indexingGapSummary && (
            <div className="rounded-lg p-2.5 bg-[var(--neutral-bg-03)] space-y-1.5">
              <p className="font-medium">排名缺口</p>
              <p>目标问题：{preview.indexingGapSummary.targetQuestions.join('、')}</p>
              <p>目标平台：{preview.indexingGapSummary.targetPlatforms.join('、')}</p>
              <p>当前品牌提及率：{preview.indexingGapSummary.brandMentionRate}%</p>
              {preview.indexingGapSummary.competitorMentions.length > 0 && (
                <p>竞品出现：{preview.indexingGapSummary.competitorMentions.join('、')}</p>
              )}
              <p>
                复测计划：发布后{' '}
                {preview.indexingGapSummary.scheduleDays.map((d) => `T+${d}`).join(' / ')}
              </p>
            </div>
          )}

          {preview.reportSummary && (
            <div className="rounded-lg p-2.5 bg-[var(--neutral-bg-03)] space-y-1.5">
              <p>
                报告缺口：
                <strong>{preview.reportSummary.gapsFound ?? '—'}</strong> 项
              </p>
              {preview.reportSummary.topFindings.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 text-[var(--neutral-text-02)]">
                  {preview.reportSummary.topFindings.slice(0, 3).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <p className="text-[var(--neutral-text-03)] mb-1">关键词</p>
            <p className="text-[var(--neutral-text-02)]">
              {preview.keywords.length ? preview.keywords.join('、') : '未选'}
            </p>
          </div>

          <div>
            <p className="text-[var(--neutral-text-03)] mb-1">知识库</p>
            <p className="text-[var(--neutral-text-02)]">{preview.knowledgeCategories.join('、') || '无'}</p>
            {preview.knowledgeWarning && (
              <p className="geo-callout-warning mt-1 p-2 text-[10px]">{preview.knowledgeWarning}</p>
            )}
          </div>

          <div>
            <p className="text-[var(--neutral-text-03)] mb-1">禁用词</p>
            <p>{preview.negativeKeywords.length} 个</p>
          </div>

          <div>
            <p className="text-[var(--neutral-text-03)] mb-1">模型</p>
            <p className="text-[var(--neutral-text-02)]">{preview.modelLabel}</p>
          </div>

          {preview.promptOutline.length > 0 && (
            <div>
              <p className="text-[var(--neutral-text-03)] mb-1">提交上下文概要</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--neutral-text-02)]">
                {preview.promptOutline.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {qualityChecks && (
        <div className="border-t border-[var(--neutral-divider-02)] pt-3 space-y-2 text-xs">
          <p className="font-semibold">生成后质检</p>
          <p className={qualityChecks.forbiddenWords?.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
            禁用词：{qualityChecks.forbiddenWords?.passed ? '通过' : `未通过（${qualityChecks.forbiddenWords?.hits?.join('、')}）`}
          </p>
          <p className={qualityChecks.factCoverage?.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
            事实覆盖：{qualityChecks.factCoverage?.passed ? '通过' : `待补：${qualityChecks.factCoverage?.missing?.join('、')}`}
          </p>
          <p>
            GEO 可引用性：
            <strong>{qualityChecks.geoCitability?.score ?? '—'}</strong>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {preview?.geoReportId && onViewReport && (
          <button type="button" className="geo-btn-secondary geo-btn-sm w-full" onClick={onViewReport}>
            查看报告
          </button>
        )}
      </div>
      </div>
    </aside>
  );
}
