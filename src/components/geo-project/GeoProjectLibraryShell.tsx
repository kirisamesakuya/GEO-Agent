import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ViewType } from '../../types';
import ContentLibraryView, { type ArticleResultStatusFilter } from '../ContentLibraryView';
import PublishRecordsPanel from '../PublishRecordsPanel';
import GeoListPageShell from '../common/GeoListPageShell';
import {
  ARTICLE_RESULT_SECTIONS,
  ARTICLE_RESULT_STATUS_TABS,
  PUBLISH_RECORD_STATUS_TABS,
  type ArticleResultSection,
  type PublishRecordStatusFilter,
  parseArticleResultSectionFromUrl,
  parseArticleStatusFromUrl,
  parsePublishRecordStatusFromUrl,
  articleDetailHint,
  publishRecordDetailHint,
} from '../../lib/article-result-nav';
import type { GeoContentProjectSummary } from '../../lib/geo-content-project';
import { Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { syncContentDeliveryUrl } from '../../lib/content-delivery-nav';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialProjectId?: string;
  initialSection?: ArticleResultSection;
  /** 嵌入内容交付模块时锁定分区并隐藏内层 Tab */
  embeddedSection?: ArticleResultSection;
  pageTitle?: string;
}

export default function GeoProjectLibraryShell({
  brandName,
  onBrandChange,
  onNavigate,
  initialProjectId,
  initialSection,
  embeddedSection,
  pageTitle = '文章结果',
}: Props) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<GeoContentProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId ?? null);
  const [section, setSection] = useState<ArticleResultSection>(
    embeddedSection ?? initialSection ?? parseArticleResultSectionFromUrl()
  );
  const [statusFilter, setStatusFilter] = useState<ArticleResultStatusFilter>(parseArticleStatusFromUrl());
  const [publishStatusFilter, setPublishStatusFilter] = useState<PublishRecordStatusFilter>(
    parsePublishRecordStatusFromUrl()
  );
  const [checkedCount, setCheckedCount] = useState(0);
  const [bulkPublishTick, setBulkPublishTick] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<ArticleResultStatusFilter, number>>({
    all: 0,
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  });

  const loadProjects = useCallback(() => {
    fetch(`/api/geo-content-projects?brandName=${encodeURIComponent(brandName)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? '项目接口不可用');
        setProjects(d.projects ?? []);
      })
      .catch(() => setProjects([]));
  }, [brandName]);

  const loadStatusCounts = useCallback(() => {
    fetch(`/api/content-batches?brandName=${encodeURIComponent(brandName)}&limit=200`)
      .then((r) => r.json())
      .then((d) => {
        const batches = (d.batches ?? []) as Array<{
          status: string;
          items: Array<{ status: string; publishStatus?: string }>;
        }>;
        const counts: Record<ArticleResultStatusFilter, number> = {
          all: 0,
          draft: 0,
          scheduled: 0,
          published: 0,
          failed: 0,
        };
        for (const batch of batches) {
          for (const item of batch.items ?? []) {
            counts.all += 1;
            if (batch.status === 'failed' || item.publishStatus === 'failed') {
              counts.failed += 1;
            } else if (item.status === 'published' || item.publishStatus === 'published') {
              counts.published += 1;
            } else if (item.publishStatus === 'scheduled') {
              counts.scheduled += 1;
            } else {
              counts.draft += 1;
            }
          }
        }
        setStatusCounts(counts);
      })
      .catch(() => {
        setStatusCounts({ all: 0, draft: 0, scheduled: 0, published: 0, failed: 0 });
      });
  }, [brandName]);

  useEffect(() => {
    loadProjects();
    loadStatusCounts();
  }, [loadProjects, loadStatusCounts]);

  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (embeddedSection) setSection(embeddedSection);
  }, [embeddedSection]);

  const syncUrl = (nextSection: ArticleResultSection, articleStatus?: ArticleResultStatusFilter) => {
    if (embeddedSection) {
      syncContentDeliveryUrl('article');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'content_library');
    url.searchParams.set('contentTab', nextSection);
    if (nextSection === 'articles' && articleStatus) {
      if (articleStatus === 'all') url.searchParams.delete('articleStatus');
      else url.searchParams.set('articleStatus', articleStatus);
      url.searchParams.delete('publishStatus');
    }
    window.history.replaceState({}, '', url);
  };

  const switchSection = (next: ArticleResultSection) => {
    setSection(next);
    syncUrl(next, statusFilter);
  };

  const switchArticleStatus = (next: ArticleResultStatusFilter) => {
    setStatusFilter(next);
    syncUrl('articles', next);
  };

  const switchPublishStatus = (next: PublishRecordStatusFilter) => {
    setPublishStatusFilter(next);
    if (embeddedSection === 'publish_records') {
      syncContentDeliveryUrl('article');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('contentTab', 'publish_records');
    if (next) url.searchParams.set('publishStatus', next);
    else url.searchParams.delete('publishStatus');
    window.history.replaceState({}, '', url);
  };

  const articleStatusTabs = useMemo(
    () =>
      ARTICLE_RESULT_STATUS_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        count: statusCounts[tab.id],
      })),
    [statusCounts]
  );

  const projectFilter = (
    <select
      className="geo-input text-xs w-44"
      value={selectedProjectId ?? ''}
      onChange={(e) => setSelectedProjectId(e.target.value || null)}
    >
      <option value="">全部生成项目</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  return (
    <GeoListPageShell
      brandLabel="为哪个品牌管理文章"
      brandName={brandName}
      onBrandChange={onBrandChange}
      hidePageHeader={Boolean(embeddedSection)}
      title={pageTitle}
      primaryAction={
        section === 'articles' ? (
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm"
            disabled={checkedCount === 0}
            onClick={() => {
              if (checkedCount === 0) {
                toast('请先勾选要发布的文章', 'error');
                return;
              }
              setBulkPublishTick((t) => t + 1);
            }}
          >
            批量发布
          </button>
        ) : undefined
      }
      secondaryActions={
        onNavigate ? (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm"
            onClick={() => onNavigate('generate_article', 'quick')}
          >
            <Sparkles className="w-3.5 h-3.5" /> 新建生成
          </button>
        ) : undefined
      }
      sectionTabs={embeddedSection ? undefined : ARTICLE_RESULT_SECTIONS}
      activeSection={section}
      onSectionChange={embeddedSection ? undefined : (id) => switchSection(id as ArticleResultSection)}
      statusTabs={
        section === 'articles'
          ? articleStatusTabs
          : PUBLISH_RECORD_STATUS_TABS.map((t) => ({ id: t.id, label: t.label }))
      }
      activeStatus={section === 'articles' ? statusFilter : publishStatusFilter}
      onStatusChange={(id) => {
        if (section === 'articles') switchArticleStatus(id as ArticleResultStatusFilter);
        else switchPublishStatus(id as PublishRecordStatusFilter);
      }}
      toolbar={section === 'articles' ? projectFilter : undefined}
    >
      <div className="min-h-0 geo-card">
        {section === 'articles' ? (
          <ContentLibraryView
            brandName={brandName}
            onBrandChange={onBrandChange}
            onNavigate={onNavigate}
            projectId={selectedProjectId ?? undefined}
            statusFilter={statusFilter}
            embedded
            detailViaNavigation
            bulkPublishTick={bulkPublishTick}
            onCheckedCountChange={setCheckedCount}
            onArticlesChanged={loadStatusCounts}
            onOpenArticleDetail={(id) =>
              onNavigate?.(embeddedSection ? 'content_delivery' : 'content_library', articleDetailHint(id))
            }
          />
        ) : brandName === '__all__' ? (
          <p className="p-6 text-sm text-[var(--neutral-text-03)]">请选择具体品牌查看发布记录</p>
        ) : (
          <PublishRecordsPanel
            brandName={brandName}
            statusFilter={publishStatusFilter}
            onNavigate={onNavigate}
            onViewRecord={(id) =>
              onNavigate?.(embeddedSection ? 'content_delivery' : 'content_library', publishRecordDetailHint(id))
            }
          />
        )}
      </div>
    </GeoListPageShell>
  );
}
