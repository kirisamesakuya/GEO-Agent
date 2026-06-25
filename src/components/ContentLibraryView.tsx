import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import type { ViewType, AccountBinding, ContentBatch, ContentItem } from '../types';
import {
  buildContentLibraryPlatformFilters,
  platformMatches,
} from '../lib/content-library-platforms';
import { waitForHermesAgentTask } from '../lib/hermes-publish-client';
import { submitPublishDraft } from '../lib/publish-draft-client';
import {
  isPublishBlockedByQuality,
  parseEffectBaseline,
  parseEffectVerification,
  parseGenerationMeta,
  parseQualityChecks,
} from '../lib/content-item-meta';
import ArticleEffectVerificationPanel from './article/ArticleEffectVerificationPanel';
import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../lib/publish-accounts';
import { isPublishReady } from '../lib/publish-account-login-status';
import TaskStatusPill from './common/TaskStatusPill';
import { resolveBatchPillDisplay } from '../lib/agent-task-display';
import BrandSwitcher from './common/BrandSwitcher';
import HermesWorkingOverlay from './common/HermesWorkingOverlay';
import HermesPublishConfirmDialog, {
  type HermesPublishConfirmPayload,
} from './agent/HermesPublishConfirmDialog';
import PublishPlatformUnavailableDialog from './agent/PublishPlatformUnavailableDialog';
import {
  isHermesAutoPublishSupported,
  partitionPublishPlatforms,
} from '../lib/hermes-auto-publish-gate';
import { buildManualPublishCopyText } from '../lib/manual-publish-copy';
import type { PublishUnavailableDialogState } from '../lib/publish-unavailable-dialog-state';
import RightPreviewPanel from './common/RightPreviewPanel';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Folder,
  Pencil,
  Search,
  Send,
  Trash2,
  RefreshCw,
  Eye,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { submitGeoAgentTask } from '../lib/geo-audit-client';
import { navigateToAgentTaskResult } from '../lib/agent-task-result-nav';
import { getResultConfirmUiStatus } from '../lib/agent-result-confirmation';

export type ArticleResultStatusFilter = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';

interface ContentLibraryViewProps {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialContentItemId?: string;
  /** 按 GEO 写作项目筛选批次；嵌入项目内容库时传入 */
  projectId?: string;
  /** 嵌入 GeoProjectLibraryShell 时隐藏品牌栏并收紧顶栏 */
  embedded?: boolean;
  projectTitle?: string;
  statusFilter?: ArticleResultStatusFilter;
  bulkPublishTick?: number;
  onCheckedCountChange?: (count: number) => void;
  onArticlesChanged?: () => void;
  /** 统一列表规范：查看进详情页，不在右侧展开 */
  detailViaNavigation?: boolean;
  onOpenArticleDetail?: (contentItemId: string) => void;
}

const EXPLORER_WIDTH = 300;
const INSPECTOR_WIDTH = 300;

export default function ContentLibraryView({
  brandName,
  onBrandChange,
  onNavigate,
  initialContentItemId,
  projectId,
  embedded = false,
  projectTitle,
  statusFilter = 'all',
  bulkPublishTick = 0,
  onCheckedCountChange,
  onArticlesChanged,
  detailViaNavigation = false,
  onOpenArticleDetail,
}: ContentLibraryViewProps) {
  const { toast } = useToast();
  const [batches, setBatches] = useState<ContentBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ContentBatch | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hermesWork, setHermesWork] = useState<{
    open: boolean;
    progress: number;
    message: string;
    detail?: string;
  }>({ open: false, progress: 0, message: '' });
  const [publishConfirm, setPublishConfirm] = useState<{
    open: boolean;
    payload: HermesPublishConfirmPayload | null;
    onlyItemId?: string;
  }>({ open: false, payload: null });
  const [publishUnavailableDialog, setPublishUnavailableDialog] =
    useState<PublishUnavailableDialogState | null>(null);
  const [pendingManualDialog, setPendingManualDialog] =
    useState<PublishUnavailableDialogState | null>(null);
  const [activePublishGroups, setActivePublishGroups] = useState<
    Array<{ batchId: string; platform: string; itemIds: string[] }> | null
  >(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  /** 可同时展开多个批次文件夹 */
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set());
  const [loadedBatches, setLoadedBatches] = useState<Record<string, ContentBatch>>({});
  const [loadingBatchIds, setLoadingBatchIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [showFullContent, setShowFullContent] = useState(false);
  const [geoContentLoading, setGeoContentLoading] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const PAGE_SIZE = 20;

  const platformFilterOptions = useMemo(
    () => buildContentLibraryPlatformFilters({ accounts, batches }),
    [accounts, batches]
  );

  useEffect(() => {
    if (filterPlatform && !platformFilterOptions.some((o) => o.value === filterPlatform)) {
      setFilterPlatform('');
    }
  }, [filterPlatform, platformFilterOptions]);

  useEffect(() => {
    if (selectedBatch || selectedItem) setInspectorOpen(true);
  }, [selectedBatch?.id, selectedItem?.id]);

  const closeArticleInspector = () => setInspectorOpen(false);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ brandName });
      if (filterPlatform) params.set('platform', filterPlatform);
      if (projectId) params.set('projectId', projectId);
      const res = await fetch(`/api/content-batches?${params}`);
      const data = await res.json();
      setBatches(data.batches ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedBatch(null);
    setSelectedItem(null);
    setEditContent('');
    setIsEditing(false);
    setCheckedIds(new Set());
    setExpandedBatchIds(new Set());
    setLoadedBatches({});
    setLoadingBatchIds(new Set());
    setPage(1);
    setShowFullContent(false);
    void loadBatches();
    void fetchAvailablePublishAccounts(brandName)
      .then((rows) => setAccounts(rows.map(toAccountBindingShape)))
      .catch(() => setAccounts([]));
  }, [brandName, filterPlatform, projectId]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, filterPlatform]);

  useEffect(() => {
    onCheckedCountChange?.(checkedIds.size);
  }, [checkedIds, onCheckedCountChange]);

  const itemCount = (batch: ContentBatch) =>
    batch.items?.length > 0 ? batch.items.length : batch.articleCount;

  const fetchBatchDetail = async (batchId: string): Promise<ContentBatch | null> => {
    if (loadedBatches[batchId]) return loadedBatches[batchId];
    setLoadingBatchIds((prev) => new Set(prev).add(batchId));
    try {
      const res = await fetch(`/api/content-batches/${batchId}`);
      const data = await res.json();
      const loaded = data.batch as ContentBatch | undefined;
      if (!loaded) return null;
      const items = loaded.items ?? [];
      const full = { ...loaded, articleCount: items.length, items };
      setLoadedBatches((prev) => ({ ...prev, [batchId]: full }));
      return full;
    } finally {
      setLoadingBatchIds((prev) => {
        const next = new Set(prev);
        next.delete(batchId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!embedded || batches.length === 0) return;
    const missing = batches.filter((batch) => !loadedBatches[batch.id] && !loadingBatchIds.has(batch.id));
    if (missing.length === 0) return;
    void Promise.all(missing.map((batch) => fetchBatchDetail(batch.id)));
  }, [embedded, batches.length, projectId]);

  const toggleFolderExpand = (batch: ContentBatch, e: MouseEvent) => {
    e.stopPropagation();
    const id = batch.id;
    if (expandedBatchIds.has(id)) {
      setExpandedBatchIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    setExpandedBatchIds((prev) => new Set(prev).add(id));
    void fetchBatchDetail(id);
  };

  const activateBatch = async (batch: ContentBatch, itemToSelect?: ContentItem) => {
    const full = (await fetchBatchDetail(batch.id)) ?? batch;
    const items = full.items ?? [];
    setSelectedBatch(full);
    setExpandedBatchIds((prev) => new Set(prev).add(batch.id));
    const target = itemToSelect ?? items[0] ?? null;
    if (target) {
      if (isEditing && selectedItem && editContent !== selectedItem.fullContent) {
        toast('请先保存或取消编辑', 'error');
        return;
      }
      setSelectedItem(target);
      setEditContent(target.fullContent);
      setIsEditing(false);
    } else {
      setSelectedItem(null);
      setEditContent('');
      setIsEditing(false);
    }
  };

  const selectItemInBatch = async (batch: ContentBatch, item: ContentItem) => {
    if (isEditing && selectedItem && editContent !== selectedItem.fullContent) {
      toast('请先保存或取消编辑', 'error');
      return;
    }
    if (selectedBatch?.id !== batch.id) {
      const full = (await fetchBatchDetail(batch.id)) ?? batch;
      setSelectedBatch(full);
      setExpandedBatchIds((prev) => new Set(prev).add(batch.id));
    }
    selectItem(item);
  };

  useEffect(() => {
    if (!initialContentItemId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/content-items/${initialContentItemId}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        item?: ContentItem & { batchId: string; brandName: string };
      };
      const row = data.item;
      if (!row?.batchId || cancelled) return;
      const batchRes = await fetch(`/api/content-batches/${row.batchId}`);
      if (!batchRes.ok || cancelled) return;
      const batchData = (await batchRes.json()) as { batch?: ContentBatch };
      const batch = batchData.batch;
      if (!batch || cancelled) return;
      const items = batch.items ?? [];
      const target = items.find((i) => i.id === row.id) ?? row;
      const full = (await fetchBatchDetail(batch.id)) ?? { ...batch, items, articleCount: items.length };
      if (cancelled) return;
      setSelectedBatch(full);
      setExpandedBatchIds((prev) => new Set(prev).add(batch.id));
      setSelectedItem(target);
      setEditContent(target.fullContent);
      setIsEditing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialContentItemId, brandName]);

  const selectItem = (item: ContentItem) => {
    if (isEditing && selectedItem && editContent !== selectedItem.fullContent) {
      toast('请先保存或取消编辑', 'error');
      return;
    }
    setSelectedItem(item);
    setEditContent(item.fullContent);
    setIsEditing(false);
  };

  const toggleChecked = (itemId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const toggleBatchAll = (batchId: string, checked: boolean) => {
    const items = loadedBatches[batchId]?.items ?? [];
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const selectAllExpanded = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const batchId of expandedBatchIds) {
        for (const item of loadedBatches[batchId]?.items ?? []) {
          next.add(item.id);
        }
      }
      return next;
    });
  };

  const selectVisibleArticles = (rows: Array<{ item: ContentItem }>) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const row of rows) next.add(row.item.id);
      return next;
    });
  };

  const clearChecked = () => setCheckedIds(new Set());

  const groupCheckedByBatch = () => {
    const groups: { batchId: string; platform: string; itemIds: string[] }[] = [];
    const byBatch = new Map<string, string[]>();
    for (const itemId of checkedIds) {
      for (const batchId of Object.keys(loadedBatches)) {
        const batch = loadedBatches[batchId];
        if (!batch) continue;
        if (batch.items.some((i) => i.id === itemId)) {
          const list = byBatch.get(batchId) ?? [];
          list.push(itemId);
          byBatch.set(batchId, list);
          break;
        }
      }
    }
    for (const [batchId, itemIds] of byBatch) {
      const batch = loadedBatches[batchId];
      if (batch) groups.push({ batchId, platform: batch.platform, itemIds });
    }
    return groups;
  };

  const deleteChecked = async (overrideIds?: string[]) => {
    const ids = overrideIds ?? Array.from(checkedIds);
    if (ids.length === 0) {
      toast('请先勾选要删除的文章', 'error');
      return;
    }
    if (!confirm(`确定删除已选 ${ids.length} 篇文章？删除后不可恢复。`)) return;
    if (isEditing && selectedItem && checkedIds.has(selectedItem.id)) {
      toast('请先保存或取消正在编辑的文章', 'error');
      return;
    }
    setBulkWorking(true);
    try {
      const res = await fetch('/api/content-batches/items/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: ids, brandName }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      const deletedBatches = new Set<string>(data.deletedBatchIds ?? []);
      setCheckedIds(new Set());
      if (selectedItem && (data.deletedItemIds ?? []).includes(selectedItem.id)) {
        setSelectedItem(null);
        setEditContent('');
        setIsEditing(false);
      }
      setLoadedBatches((prev) => {
        const next = { ...prev };
        for (const batchId of Object.keys(next)) {
          if (deletedBatches.has(batchId)) {
            delete next[batchId];
            setExpandedBatchIds((exp) => {
              const n = new Set(exp);
              n.delete(batchId);
              return n;
            });
            if (selectedBatch?.id === batchId) setSelectedBatch(null);
          } else {
            next[batchId] = {
              ...next[batchId],
              items: next[batchId].items.filter((i) => !ids.includes(i.id)),
              articleCount: next[batchId].items.filter((i) => !ids.includes(i.id)).length,
            };
          }
        }
        return next;
      });
      await loadBatches();
      onArticlesChanged?.();
      toast(`已删除 ${data.deletedItemIds?.length ?? ids.length} 篇文章`, 'success');
    } finally {
      setBulkWorking(false);
    }
  };

  const saveItem = async () => {
    if (!selectedBatch || !selectedItem) return;
    const res = await fetch(
      `/api/content-batches/${selectedBatch.id}/items/${selectedItem.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullContent: editContent }),
      }
    );
    const data = await res.json();
    if (data.item) {
      setSelectedItem(data.item);
      setEditContent(data.item.fullContent);
      const batchId = selectedBatch.id;
      setSelectedBatch((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === data.item.id ? data.item : i)),
            }
          : prev
      );
      setLoadedBatches((prev) => {
        const row = prev[batchId];
        if (!row) return prev;
        return {
          ...prev,
          [batchId]: {
            ...row,
            items: row.items.map((i) => (i.id === data.item.id ? data.item : i)),
          },
        };
      });
      setIsEditing(false);
      void loadBatches();
      toast('内容已保存', 'success');
    }
  };

  const collectItemsForPublish = (itemIds: string[]) => {
    const items: ContentItem[] = [];
    for (const batchId of Object.keys(loadedBatches)) {
      const batch = loadedBatches[batchId];
      if (!batch) continue;
      for (const item of batch.items) {
        if (itemIds.includes(item.id)) items.push(item);
      }
    }
    return items;
  };

  const resolvePublishGroups = (onlyItemId?: string) => {
    if (onlyItemId) {
      for (const batchId of Object.keys(loadedBatches)) {
        const batch = loadedBatches[batchId];
        if (batch?.items.some((i) => i.id === onlyItemId)) {
          return [{ batchId, platform: batch.platform, itemIds: [onlyItemId] }];
        }
      }
      return [];
    }
    return groupCheckedByBatch();
  };

  const requestPublish = (onlyItemId?: string) => {
    const groups = resolvePublishGroups(onlyItemId);
    if (groups.length === 0) {
      toast('请至少勾选一篇要发布的文章', 'error');
      return;
    }
    if (isEditing && selectedItem && editContent !== selectedItem.fullContent) {
      toast('当前文章有未保存修改，请先保存', 'error');
      return;
    }
    const allItemIds = groups.flatMap((g) => g.itemIds);
    const blocked = collectItemsForPublish(allItemIds).filter((item) =>
      isPublishBlockedByQuality(parseQualityChecks(item.qualityChecksJson))
    );
    if (blocked.length > 0) {
      toast(`有 ${blocked.length} 篇禁用词未通过，请修改后再发布`, 'error');
      return;
    }

    const platformLabels = [...new Set(groups.map((g) => g.platform))];
    const { supported, unsupported } = partitionPublishPlatforms(platformLabels);

    if (unsupported.length > 0 && supported.length === 0) {
      setPublishUnavailableDialog({
        unsupported,
        copyText: buildManualPublishCopyText({
          groups,
          loadedBatches,
          platforms: unsupported,
        }),
      });
      return;
    }

    const effectiveGroups =
      unsupported.length > 0
        ? groups.filter((group) => isHermesAutoPublishSupported(group.platform))
        : groups;

    if (unsupported.length > 0) {
      setPendingManualDialog({
        unsupported,
        autoPublished: supported,
        copyText: buildManualPublishCopyText({
          groups,
          loadedBatches,
          platforms: unsupported,
        }),
      });
    } else {
      setPendingManualDialog(null);
    }

    setActivePublishGroups(effectiveGroups);

    const effectivePlatformLabels = [...new Set(effectiveGroups.map((g) => g.platform))];
    const accountLabels = effectiveGroups.map((group) => {
      const matching = accounts.filter(
        (a) => platformMatches(group.platform, a.platform) && isPublishReady(a.status)
      );
      const accountId =
        group.platform === selectedBatch?.platform && selectedAccountId
          ? selectedAccountId
          : matching[0]?.id;
      const account = matching.find((a) => a.id === accountId) ?? matching[0];
      return account ? `${account.platform} · ${account.accountName}` : `${group.platform}（无账号）`;
    });

    setPublishConfirm({
      open: true,
      onlyItemId,
      payload: {
        articleCount: effectiveGroups.reduce((sum, g) => sum + g.itemIds.length, 0),
        platformLabels: effectivePlatformLabels,
        accountLabel: accountLabels.join('；'),
      },
    });
  };

  const publishChecked = async (onlyItemId?: string) => {
    const groups = activePublishGroups ?? resolvePublishGroups(onlyItemId);

    if (groups.length === 0) {
      toast('请至少勾选一篇要发布的文章', 'error');
      return;
    }
    setPublishing(true);
    let published = 0;
    const errors: string[] = [];
    const mockLinks: string[] = [];
    setHermesWork({
      open: true,
      progress: 4,
      message: '准备 Hermes 发布…',
      detail: `共 ${groups.length} 个批次`,
    });
    try {
      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const matching = accounts.filter(
          (a) => platformMatches(group.platform, a.platform) && isPublishReady(a.status)
        );
        const accountId =
          group.platform === selectedBatch?.platform && selectedAccountId
            ? selectedAccountId
            : matching[0]?.id;
        if (!accountId) {
          errors.push(`${group.platform} 无可用发布账号`);
          continue;
        }
        const batch = loadedBatches[group.batchId];
        const titles =
          batch?.items
            .filter((i) => group.itemIds.includes(i.id))
            .map((i) => i.title) ?? [];

        setHermesWork({
          open: true,
          progress: 8 + Math.round((gi / groups.length) * 15),
          message: `正在提交 ${group.platform}…`,
          detail: `${gi + 1} / ${groups.length}`,
        });

        try {
          const submit = await submitPublishDraft({
            batchId: group.batchId,
            brandName,
            accountBindingId: accountId,
            contentItemIds: group.itemIds,
          });

          if (submit.task?.id) {
            const task = await waitForHermesAgentTask(submit.task.id, (progress, message) => {
              setHermesWork({
                open: true,
                progress,
                message,
                detail: `${group.platform} · ${gi + 1}/${groups.length}`,
              });
            });
            if (!task) {
              errors.push(`${group.platform}: Hermes 任务超时`);
              continue;
            }
            if (task.status === 'succeeded' || task.status === 'partial') {
              published += Number(
                (task.output as { publishedCount?: number } | undefined)?.publishedCount ??
                  (task.status === 'partial' ? 0 : group.itemIds.length)
              );
              const link = (task.output as { publishLink?: string } | undefined)?.publishLink;
              if (link) mockLinks.push(link);
              if (task.status === 'partial') {
                errors.push(
                  `${group.platform}: ${task.userErrorMessage ?? '部分文章需人工发布'}`
                );
              }
            } else {
              errors.push(
                `${group.platform}: ${task.userErrorMessage ?? 'Hermes 发布失败'}`
              );
            }
          } else {
            published += group.itemIds.length;
          }
          void titles;
        } catch (err) {
          errors.push(
            `${group.platform}: ${err instanceof Error ? err.message : '发布失败'}`
          );
        }
      }

      if (published > 0) {
        const linkHint = mockLinks[0] ? ` · ${mockLinks[0]}` : '';
        toast(
          `Hermes 发布完成（${published} 篇）${linkHint}${errors.length ? `；${errors.length} 项需关注` : ''}`,
          errors.length ? 'info' : 'success'
        );
        if (pendingManualDialog) {
          setPublishUnavailableDialog(pendingManualDialog);
          setPendingManualDialog(null);
        }
        void loadBatches();
        onArticlesChanged?.();
        if (selectedBatch) await fetchBatchDetail(selectedBatch.id);
      } else if (errors.length) {
        toast(errors[0], 'error');
      }
    } finally {
      setPublishing(false);
      setActivePublishGroups(null);
      setHermesWork({ open: false, progress: 0, message: '' });
    }
  };

  const deleteCurrentArticle = async () => {
    if (!selectedItem) return;
    if (!confirm(`确定删除「${selectedItem.title.slice(0, 24)}…」？删除后不可恢复。`)) return;
    await deleteChecked([selectedItem.id]);
  };

  useEffect(() => {
    if (!embedded || bulkPublishTick === 0) return;
    if (checkedIds.size === 0) return;
    void requestPublish();
  }, [bulkPublishTick, embedded, checkedIds.size]);

  const downloadItem = () => {
    if (!selectedItem) return;
    const blob = new Blob([editContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedItem.title.slice(0, 30)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBatches = batches.filter(
    (b) =>
      !search ||
      b.brandName.includes(search) ||
      b.platform.includes(search) ||
      b.items.some((i) => i.title.includes(search))
  );

  const articleRows = batches.flatMap((batch) => {
    const loaded = loadedBatches[batch.id] ?? batch;
    return (loaded.items ?? []).map((item) => ({ batch: loaded, item }));
  });

  const resolveArticleStatus = (row: { batch: ContentBatch; item: ContentItem }): ArticleResultStatusFilter => {
    if (row.batch.status === 'failed' || row.item.publishStatus === 'failed') return 'failed';
    if (row.item.status === 'published' || row.item.publishStatus === 'published') return 'published';
    if (row.item.publishStatus === 'scheduled') return 'scheduled';
    return 'draft';
  };

  const statusLabel: Record<ArticleResultStatusFilter, string> = {
    all: '全部文章',
    draft: '待发布',
    scheduled: '已排程',
    published: '已发布',
    failed: '发布失败',
  };

  const articleStatusDisplay = (status: ArticleResultStatusFilter) => statusLabel[status];

  const articleStatusClass = (status: ArticleResultStatusFilter) => {
    if (status === 'published') return 'bg-emerald-50 text-emerald-700';
    if (status === 'scheduled') return 'bg-amber-50 text-amber-700';
    if (status === 'failed') return 'bg-red-50 text-red-700';
    return 'bg-sky-50 text-sky-700';
  };

  const visibleArticleRows = articleRows.filter((row) => {
    const status = resolveArticleStatus(row);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (search) {
      const q = search.trim();
      if (
        !row.item.title.includes(q) &&
        !row.item.previewText.includes(q) &&
        !row.batch.platform.includes(q)
      ) {
        return false;
      }
    }
    if (filterPlatform && !platformMatches(row.batch.platform, filterPlatform)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(visibleArticleRows.length / PAGE_SIZE));
  const paginatedArticleRows = visibleArticleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const batchItems = selectedBatch?.items ?? [];
  const selectedIndex = selectedItem ? batchItems.findIndex((i) => i.id === selectedItem.id) : -1;
  const checkedCount = checkedIds.size;
  const checkedPlatforms = [...new Set(groupCheckedByBatch().map((g) => g.platform))];
  const singlePlatform = checkedPlatforms.length === 1 ? checkedPlatforms[0] : null;
  const publishAccounts = selectedBatch
    ? accounts.filter((a) => platformMatches(selectedBatch.platform, a.platform))
    : [];
  const publishAccountsForChecked = singlePlatform
    ? accounts.filter((a) => platformMatches(singlePlatform, a.platform))
    : publishAccounts;

  const batchCheckedCount = (batchId: string) => {
    const items = loadedBatches[batchId]?.items ?? [];
    return items.filter((i) => checkedIds.has(i.id)).length;
  };

  useEffect(() => {
    const platform = singlePlatform ?? selectedBatch?.platform;
    if (!platform) {
      setSelectedAccountId('');
      return;
    }
    const matching = accounts.filter(
      (a) => platformMatches(platform, a.platform) && isPublishReady(a.status)
    );
    if (matching.length === 0) {
      setSelectedAccountId('');
      return;
    }
    if (!matching.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(matching[0].id);
    }
  }, [singlePlatform, selectedBatch?.id, accounts, selectedAccountId]);

  const goToItem = (delta: number) => {
    if (batchItems.length === 0) return;
    const idx = selectedIndex < 0 ? 0 : selectedIndex + delta;
    const next = batchItems[Math.max(0, Math.min(batchItems.length - 1, idx))];
    if (next) selectItem(next);
  };

  const publishFooter = (
    <div className="space-y-3 text-xs">
      <p style={{ color: 'var(--neutral-text-03)' }}>
        已勾选 <strong>{checkedCount}</strong> 篇
        {checkedPlatforms.length > 1 && (
          <span className="block mt-1 text-amber-700">含多个平台，将按批次分别 Hermes 发布</span>
        )}
        <span className="block mt-1">经 publish-draft 确认后由 Hermes 执行发布</span>
      </p>
      {checkedCount > 0 && (
        <>
          <div>
            <label className="geo-label block mb-1">发布账号</label>
            {singlePlatform ? (
              publishAccountsForChecked.length === 0 ? (
                <p style={{ color: 'var(--neutral-text-03)' }}>暂无匹配 {singlePlatform} 的账号</p>
              ) : (
                <select
                  className="geo-input w-full text-xs"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {publishAccountsForChecked.map((account) => (
                    <option key={account.id} value={account.id} disabled={!isPublishReady(account.status)}>
                      {account.accountName} · {account.status}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <p style={{ color: 'var(--neutral-text-03)' }}>多平台选中时将自动匹配各批次账号</p>
            )}
          </div>
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm w-full flex items-center justify-center gap-1"
            disabled={publishing || checkedCount === 0}
            onClick={() => requestPublish()}
          >
            <Send className="w-3.5 h-3.5" />
            {publishing ? '发布中…' : `确认发布所选（${checkedCount}）`}
          </button>
        </>
      )}
      {selectedItem && (
        <button
          type="button"
          className="geo-btn-secondary geo-btn-xs w-full"
          disabled={publishing}
          onClick={() => requestPublish(selectedItem.id)}
        >
          Hermes 仅发布当前篇
        </button>
      )}
      <button
        type="button"
        className="geo-btn-danger geo-btn-xs w-full flex items-center justify-center gap-1"
        disabled={bulkWorking || checkedCount === 0}
        onClick={() => void deleteChecked()}
      >
        <Trash2 className="w-3.5 h-3.5" />
        删除所选（{checkedCount}）
      </button>
    </div>
  );

  const openArticleDetail = (batch: ContentBatch, item: ContentItem) => {
    if (detailViaNavigation && onOpenArticleDetail) {
      onOpenArticleDetail(item.id);
      return;
    }
    setShowFullContent(false);
    void selectItemInBatch(batch, item);
  };

  if (embedded) {
    const selectedStatus = selectedItem
      ? resolveArticleStatus({
          batch: selectedBatch ?? ({ platform: selectedItem.platform } as ContentBatch),
          item: selectedItem,
        })
      : null;
    const wordCount = selectedItem ? (editContent || selectedItem.fullContent).length : 0;

    return (
      <>
        <HermesWorkingOverlay
          open={hermesWork.open}
          progress={hermesWork.progress}
          message={hermesWork.message}
          detail={hermesWork.detail}
        />
        <HermesPublishConfirmDialog
          open={publishConfirm.open}
          payload={publishConfirm.payload}
          loading={publishing}
          onCancel={() => setPublishConfirm({ open: false, payload: null })}
          onConfirm={() => {
            const onlyItemId = publishConfirm.onlyItemId;
            setPublishConfirm({ open: false, payload: null });
            void publishChecked(onlyItemId);
          }}
        />
        <PublishPlatformUnavailableDialog
          open={Boolean(publishUnavailableDialog?.unsupported.length)}
          state={publishUnavailableDialog}
          brandName={brandName}
          onClose={() => setPublishUnavailableDialog(null)}
        />
        <div className="grid grid-cols-1 items-start">
          <main className="min-w-0 min-h-0 flex flex-col">
            <div className="shrink-0 px-4 py-3 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <h3 className="text-sm font-bold text-[var(--color-title)]">文章列表</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div
                  className="flex flex-1 min-w-[200px] items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--neutral-divider-02)' }}
                >
                  <Search className="w-4 h-4 shrink-0 opacity-50" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索文章标题或关键词..."
                    className="flex-1 min-w-0 outline-none bg-transparent text-xs"
                    style={{ color: 'var(--neutral-text-01)' }}
                  />
                </div>
                <select
                  className="geo-input w-[140px] text-xs shrink-0"
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                >
                  {platformFilterOptions.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs shrink-0"
                  title="刷新列表"
                  onClick={() => void loadBatches()}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              {loading || (batches.length > 0 && articleRows.length === 0) ? (
                <p className="p-6 text-sm text-[var(--neutral-text-03)]">加载文章结果…</p>
              ) : visibleArticleRows.length === 0 ? (
                <div className="h-full grid place-items-center p-8 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-[var(--neutral-text-03)]">当前筛选下暂无文章</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-[var(--neutral-bg-03)] text-[var(--neutral-text-03)]">
                    <tr className="border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                      <th className="w-9 px-3 py-2.5 text-left"></th>
                      <th className="px-2 py-2.5 text-left font-medium">文章标题</th>
                      <th className="w-24 px-2 py-2.5 text-left font-medium">平台</th>
                      <th className="w-20 px-2 py-2.5 text-left font-medium">状态</th>
                      <th className="w-32 px-2 py-2.5 text-left font-medium">生成时间</th>
                      <th className="w-16 px-2 py-2.5 text-left font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedArticleRows.map((row) => {
                      const status = resolveArticleStatus(row);
                      const selected = selectedItem?.id === row.item.id;
                      return (
                        <tr
                          key={row.item.id}
                          className={`border-b cursor-pointer hover:bg-[var(--neutral-bg-03)] ${
                            selected ? 'bg-[var(--color-accent-light)]' : ''
                          }`}
                          style={{ borderColor: 'var(--neutral-divider-02)' }}
                          onClick={() => openArticleDetail(row.batch, row.item)}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={checkedIds.has(row.item.id)}
                              onChange={(e) => toggleChecked(row.item.id, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-2 py-2.5 min-w-0">
                            <p className="font-medium truncate text-[var(--neutral-text-01)]">{row.item.title}</p>
                          </td>
                          <td className="px-2 py-2.5">
                            <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700">
                              {row.item.platform}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${articleStatusClass(status)}`}>
                              {articleStatusDisplay(status)}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-[var(--neutral-text-03)] tabular-nums whitespace-nowrap">
                            {new Date(row.item.createdAt).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </td>
                          <td className="px-2 py-2.5">
                            <button
                              type="button"
                              className={detailViaNavigation ? 'geo-link text-[11px]' : 'p-1 rounded hover:bg-black/5'}
                              title="查看"
                              onClick={(e) => {
                                e.stopPropagation();
                                openArticleDetail(row.batch, row.item);
                              }}
                            >
                              {detailViaNavigation ? (
                                '查看'
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-[var(--neutral-text-03)]" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {visibleArticleRows.length > 0 && (
              <div
                className="shrink-0 px-4 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--neutral-text-03)]"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <span>共 {visibleArticleRows.length} 条</span>
                <div className="flex items-center gap-2">
                  <span>{PAGE_SIZE} 条/页</span>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </main>

          {!detailViaNavigation && (
          <RightPreviewPanel
            open={inspectorOpen && Boolean(selectedItem)}
            onClose={closeArticleInspector}
            title="文章操作"
            panelWidth={360}
            footer={
              selectedItem ? (
                <div className="space-y-2">
                  {publishAccounts.length > 0 && (
                    <select
                      className="geo-input w-full text-xs mb-1"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                      {publishAccounts.map((account) => (
                        <option key={account.id} value={account.id} disabled={!isPublishReady(account.status)}>
                          {account.accountName} · {account.status}
                        </option>
                      ))}
                    </select>
                  )}
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button type="button" className="geo-btn-primary geo-btn-sm flex-1" onClick={() => void saveItem()}>
                        保存
                      </button>
                      <button
                        type="button"
                        className="geo-btn-secondary geo-btn-sm flex-1"
                        onClick={() => {
                          setEditContent(selectedItem.fullContent);
                          setIsEditing(false);
                        }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="geo-btn-secondary geo-btn-sm w-full"
                        onClick={() => {
                          setShowFullContent(true);
                          setIsEditing(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 inline mr-1" />
                        编辑
                      </button>
                      <button
                        type="button"
                        className="geo-btn-primary geo-btn-sm w-full"
                        disabled={publishing}
                        onClick={() => requestPublish(selectedItem.id)}
                      >
                        立即发布
                      </button>
                      {onNavigate && (
                        <button
                          type="button"
                          className="geo-btn-secondary geo-btn-sm w-full"
                          onClick={() => onNavigate('self_account_publish', 'schedule')}
                        >
                          加入排程
                        </button>
                      )}
                      <button
                        type="button"
                        className="geo-btn-secondary geo-btn-sm w-full text-red-600 border-red-200 hover:bg-red-50"
                        disabled={bulkWorking}
                        onClick={() => void deleteCurrentArticle()}
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                        删除文章
                      </button>
                    </>
                  )}
                </div>
              ) : undefined
            }
          >
            {!selectedItem || !selectedStatus ? (
              <div className="text-center text-sm text-[var(--neutral-text-03)] py-8">
                选择一篇文章后，可预览、编辑和发布
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${articleStatusClass(selectedStatus)}`}>
                    {articleStatusDisplay(selectedStatus)}
                  </span>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1 shrink-0"
                    onClick={() => setShowFullContent(true)}
                  >
                    预览
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-sm font-bold leading-relaxed text-[var(--color-title)]">{selectedItem.title}</p>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                  <div>
                    <dt className="text-[var(--neutral-text-03)]">平台</dt>
                    <dd className="mt-0.5 font-medium">{selectedItem.platform}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--neutral-text-03)]">生成时间</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {new Date(selectedItem.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--neutral-text-03)]">字数</dt>
                    <dd className="mt-0.5 font-medium">{wordCount} 字</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--neutral-text-03)]">所属项目</dt>
                    <dd className="mt-0.5 font-medium line-clamp-2">{projectTitle ?? '—'}</dd>
                  </div>
                </dl>

                <section>
                  <p className="text-[11px] font-semibold text-[var(--neutral-text-02)] mb-2">内容预览（摘要）</p>
                  {isEditing || showFullContent ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      readOnly={!isEditing}
                      className="w-full min-h-[200px] p-3 text-sm resize-y outline-none rounded-lg border leading-relaxed"
                      style={{
                        borderColor: 'var(--neutral-divider-02)',
                        color: 'var(--neutral-text-01)',
                        background: 'var(--color-bg-card)',
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--neutral-text-02)] line-clamp-6 whitespace-pre-wrap">
                      {selectedItem.previewText || editContent.slice(0, 280) || '（暂无摘要）'}
                    </p>
                  )}
                  {!isEditing && !showFullContent && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
                      onClick={() => setShowFullContent(true)}
                    >
                      查看全文
                    </button>
                  )}
                </section>
              </div>
            )}
          </RightPreviewPanel>
          )}
        </div>
      </>
    );
  }

  return (
    <>
    <HermesWorkingOverlay
      open={hermesWork.open}
      progress={hermesWork.progress}
      message={hermesWork.message}
      detail={hermesWork.detail}
    />
    <HermesPublishConfirmDialog
      open={publishConfirm.open}
      payload={publishConfirm.payload}
      loading={publishing}
      onCancel={() => setPublishConfirm({ open: false, payload: null })}
      onConfirm={() => {
        const onlyItemId = publishConfirm.onlyItemId;
        setPublishConfirm({ open: false, payload: null });
        void publishChecked(onlyItemId);
      }}
    />
    <PublishPlatformUnavailableDialog
      open={Boolean(publishUnavailableDialog?.unsupported.length)}
      state={publishUnavailableDialog}
      brandName={brandName}
      onClose={() => setPublishUnavailableDialog(null)}
    />
    <div className="flex items-start min-w-0">
      {/* 文章结果：生成批次 + 单篇文章 */}
      <aside
        className="shrink-0 sticky top-0 self-start flex flex-col border-r geo-scroll-hide max-h-[calc(100vh-var(--layout-header-height))]"
        style={{
          width: EXPLORER_WIDTH,
          borderColor: 'var(--neutral-divider-02)',
          background: 'var(--color-bg-card)',
        }}
      >
        <div className="p-3 border-b shrink-0 space-y-2" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--neutral-text-01)' }}>
              {embedded ? (projectTitle ?? '文章结果') : '文章结果'}
            </h2>
            {!embedded && (
              <BrandSwitcher
                variant="scope"
                brandName={brandName}
                onBrandChange={onBrandChange}
                allowAll
              />
            )}
          </div>
          {!embedded && onNavigate && brandName !== '__all__' && (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-xs w-full flex items-center justify-center gap-1"
              onClick={() => onNavigate('self_account_publish', 'schedule')}
            >
              <Send className="w-3.5 h-3.5" />
              发布所选文章
            </button>
          )}
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <Search className="w-3.5 h-3.5 shrink-0 opacity-50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索生成批次或文章标题…"
              className="flex-1 min-w-0 outline-none bg-transparent text-xs"
              style={{ color: 'var(--neutral-text-01)' }}
            />
          </div>
          <div className="mt-2">
            <label className="geo-label text-[10px]">平台筛选</label>
            <select
              className="geo-input w-full mt-1 text-xs"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              title={
                filterPlatform
                  ? accounts.some((a) => platformMatches(filterPlatform, a.platform))
                    ? '已确认本机登录'
                    : '暂无对应发布账号'
                  : '显示全部平台的内容批次'
              }
            >
              {platformFilterOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div
            className="mt-2 p-2 rounded-lg border space-y-1.5"
            style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: 'var(--neutral-text-02)' }}>
                已选 <strong>{checkedCount}</strong> 篇
              </span>
              <button type="button" className="hover:underline" style={{ color: 'var(--color-primary)' }} onClick={clearChecked}>
                清空
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                className="text-[10px] leading-none px-1.5 py-1 rounded border geo-nav-item"
                onClick={selectAllExpanded}
              >
                全选已展开
              </button>
              <button
                type="button"
                className="text-[10px] leading-none px-1.5 py-1 rounded border inline-flex items-center gap-0.5 disabled:opacity-40"
                style={{
                  borderColor: 'var(--neutral-divider-02)',
                  color: checkedCount === 0 ? 'var(--neutral-text-03)' : '#dc2626',
                }}
                disabled={bulkWorking || checkedCount === 0}
                onClick={() => void deleteChecked()}
              >
                <Trash2 className="w-2.5 h-2.5 shrink-0" />
                删除
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 text-xs">
          {loading ? (
            <p className="p-4" style={{ color: 'var(--neutral-text-03)' }}>
              加载中…
            </p>
          ) : filteredBatches.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="w-7 h-7 mx-auto mb-2 opacity-40" />
              <p style={{ color: 'var(--neutral-text-02)' }}>
                {embedded ? '本项目暂无文章结果，生成后会按批次展示' : '暂无文章结果'}
              </p>
            </div>
          ) : (
            filteredBatches.map((batch) => {
              const isExpanded = expandedBatchIds.has(batch.id);
              const isActive = selectedBatch?.id === batch.id;
              const detail = loadedBatches[batch.id];
              const items = detail?.items ?? [];
              const isLoadingFolder = loadingBatchIds.has(batch.id);
              const folderChecked = batchCheckedCount(batch.id);
              const folderTotal = items.length;
              const folderAllChecked = folderTotal > 0 && folderChecked === folderTotal;
              const folderIndeterminate = folderChecked > 0 && folderChecked < folderTotal;
              return (
                <div key={batch.id}>
                  <div
                    className={`w-full flex items-center gap-1 px-2 py-2 border-b ${
                      isActive ? 'geo-nav-active' : 'geo-nav-item'
                    }`}
                    style={{ borderColor: 'var(--neutral-divider-02)' }}
                  >
                    <button
                      type="button"
                      className="p-0.5 rounded shrink-0 hover:bg-black/5"
                      aria-label={isExpanded ? '收起' : '展开'}
                      onClick={(e) => toggleFolderExpand(batch, e)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </button>
                    {isExpanded && folderTotal > 0 && (
                      <input
                        type="checkbox"
                        className="shrink-0"
                        checked={folderAllChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = folderIndeterminate;
                        }}
                        onChange={(e) => toggleBatchAll(batch.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        title="全选本批次"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => void activateBatch(batch)}
                      className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
                    >
                      <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                      <span className="truncate font-medium" title={batch.createdAt}>
                        {new Date(batch.createdAt).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {batch.platform} · {itemCount(detail ?? batch)} 篇
                      </span>
                    </button>
                    {isExpanded && folderChecked > 0 && (
                      <span className="text-[10px] tabular-nums shrink-0 pr-1" style={{ color: 'var(--neutral-text-03)' }}>
                        {folderChecked}/{folderTotal}
                      </span>
                    )}
                    <TaskStatusPill
                      status={resolveBatchPillDisplay(batch).status}
                      size="sm"
                      showDot={false}
                    />
                  </div>
                  {isExpanded && (
                    <div className="border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                      {isLoadingFolder && items.length === 0 ? (
                        <p className="pl-9 py-2 text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
                          加载中…
                        </p>
                      ) : items.length === 0 ? (
                        <p className="pl-9 py-2 text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
                          暂无文章
                        </p>
                      ) : (
                        <>
                          {items.map((item, index) => {
                            const isChecked = checkedIds.has(item.id);
                            const isPreviewing = selectedItem?.id === item.id;
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-1 pl-7 pr-2 py-1.5 border-t ${
                                  isPreviewing ? 'geo-nav-active' : isChecked ? 'bg-[var(--color-primary-light)]/40' : ''
                                }`}
                                style={{ borderColor: 'var(--neutral-divider-02)' }}
                              >
                                <input
                                  type="checkbox"
                                  className="shrink-0"
                                  checked={isChecked}
                                  onChange={(e) => toggleChecked(item.id, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  type="button"
                                  onClick={() => void selectItemInBatch(batch, item)}
                                  className="flex-1 min-w-0 flex items-center gap-1.5 text-left py-0.5"
                                  title={item.title}
                                >
                                  <FileText className="w-3 h-3 shrink-0 opacity-50" />
                                  <span className="truncate">
                                    <span className="opacity-50 mr-1">{index + 1}.</span>
                                    {item.title}
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 预览 / 编辑主区域 */}
      <main
        className="flex-1 min-w-0 flex flex-col border-r min-h-0"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg)' }}
      >
        {!selectedBatch || !selectedItem ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-center" style={{ color: 'var(--neutral-text-03)' }}>
              选择左侧生成批次中的一篇文章，进行预览、编辑或发布
            </p>
          </div>
        ) : (
          <>
            <div
              className="shrink-0 px-5 py-3 border-b flex flex-wrap items-center gap-2"
              style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
            >
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs"
                  disabled={selectedIndex <= 0}
                  onClick={() => goToItem(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] tabular-nums px-1" style={{ color: 'var(--neutral-text-03)' }}>
                  {selectedIndex + 1}/{batchItems.length}
                </span>
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs"
                  disabled={selectedIndex >= batchItems.length - 1}
                  onClick={() => goToItem(1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h3
                className="flex-1 min-w-[120px] text-sm font-semibold truncate"
                style={{ color: 'var(--neutral-text-01)' }}
                title={selectedItem.title}
              >
                {selectedItem.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedBatch && !inspectorOpen && (
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs"
                    onClick={() => setInspectorOpen(true)}
                  >
                    文章操作
                  </button>
                )}
                {!isEditing ? (
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-xs flex items-center gap-1"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    编辑
                  </button>
                ) : (
                  <>
                    <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => void saveItem()}>
                      保存
                    </button>
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-xs"
                      onClick={() => {
                        setEditContent(selectedItem.fullContent);
                        setIsEditing(false);
                      }}
                    >
                      取消
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs"
                  onClick={() => navigator.clipboard.writeText(editContent)}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={downloadItem}>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p
              className="shrink-0 px-5 py-1 text-[10px] border-b truncate"
              style={{ borderColor: 'var(--neutral-divider-02)', color: 'var(--neutral-text-03)' }}
            >
              {selectedItem.platform} · v{selectedItem.version} · {selectedItem.structure}
            </p>
            <div className="flex-1 min-h-0 overflow-auto p-5">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[320px] p-4 text-sm resize-none outline-none rounded-lg border font-mono leading-relaxed"
                  style={{
                    borderColor: 'var(--neutral-divider-02)',
                    color: 'var(--neutral-text-01)',
                    background: 'var(--color-bg-card)',
                  }}
                />
              ) : (
                <article
                  className="text-sm leading-relaxed whitespace-pre-wrap break-words max-w-3xl"
                  style={{ color: 'var(--neutral-text-01)' }}
                >
                  {editContent || '（暂无正文）'}
                </article>
              )}
            </div>
          </>
        )}
      </main>

      {/* 检查器：元信息 + 发布（蒙层抽屉） */}
      <RightPreviewPanel
        open={inspectorOpen && Boolean(selectedBatch)}
        onClose={closeArticleInspector}
        title="文章操作"
        panelWidth={INSPECTOR_WIDTH}
        footer={publishFooter}
      >
        {selectedBatch ? (
          <div className="space-y-4 text-xs">
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--neutral-text-03)' }}>
                批次
              </h4>
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--neutral-text-03)' }}>品牌</dt>
                  <dd className="text-right truncate">{selectedBatch.brandName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--neutral-text-03)' }}>平台</dt>
                  <dd>{selectedBatch.platform}</dd>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <dt style={{ color: 'var(--neutral-text-03)' }}>状态</dt>
                  <dd>
                    <TaskStatusPill
                      status={resolveBatchPillDisplay(selectedBatch).status}
                      size="sm"
                      title={resolveBatchPillDisplay(selectedBatch).title}
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--neutral-text-03)' }}>创建时间</dt>
                  <dd className="text-right">
                    {new Date(selectedBatch.createdAt).toLocaleString('zh-CN')}
                  </dd>
                </div>
              </dl>
            </section>
            {selectedItem && (() => {
              const meta = parseGenerationMeta(selectedItem.generationMetaJson);
              const qc = parseQualityChecks(selectedItem.qualityChecksJson);
              const baseline = parseEffectBaseline(selectedItem.effectBaselineJson);
              const verification = parseEffectVerification(selectedItem.effectVerificationJson);
              return (
                <section className="space-y-3">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--neutral-text-03)' }}>
                    当前文章
                  </h4>
                  <p className="font-medium leading-snug" style={{ color: 'var(--neutral-text-01)' }}>
                    {selectedItem.title}
                  </p>
                  <p className="leading-relaxed" style={{ color: 'var(--neutral-text-02)' }}>
                    {selectedItem.previewText}
                  </p>
                  <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: 'var(--neutral-bg-03)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--neutral-text-03)' }}>
                      来源与质检
                    </p>
                    {meta?.sourceReportTitle ? (
                      <p>
                        来源报告：
                        <span className="line-clamp-2">{meta.sourceReportTitle}</span>
                      </p>
                    ) : (
                      <p>
                        来源：
                        {meta?.sourceType === 'geo_report'
                          ? 'GEO 报告'
                          : meta?.sourceType === 'indexing_result'
                            ? '排名缺口'
                            : '品牌资料 / 手动'}
                      </p>
                    )}
                    {meta?.usedKnowledge?.length ? (
                      <p>知识库：{meta.usedKnowledge.map((k) => k.categoryLabel).join('、')}</p>
                    ) : null}
                    {meta?.keywords?.length ? (
                      <p>关键词：{meta.keywords.slice(0, 5).join('、')}</p>
                    ) : null}
                    {qc && (
                      <>
                        <p className={qc.forbiddenWords?.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                          禁用词：{qc.forbiddenWords?.passed ? '通过' : `未通过（${qc.forbiddenWords?.hits?.join('、')}）`}
                        </p>
                        <p>GEO 可引用性：{qc.geoCitability?.score ?? '—'}</p>
                      </>
                    )}
                    {onNavigate && meta?.sourceReportId && (
                      <button
                        type="button"
                        className="geo-btn-secondary geo-btn-xs w-full mt-1"
                        onClick={() => onNavigate('generate_article')}
                      >
                        根据报告再生成
                      </button>
                    )}
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-xs w-full mt-1"
                      disabled={geoContentLoading}
                      onClick={async () => {
                        if (!selectedItem || !selectedBatch) return;
                        setGeoContentLoading(true);
                        try {
                          const profileRes = await fetch(
                            `/api/brand-profile?brandName=${encodeURIComponent(brandName)}`
                          );
                          const profile = profileRes.ok ? await profileRes.json() : {};
                          const questions = parseGenerationMeta(selectedItem.generationMetaJson)?.keywords ?? [];
                          const { task, error } = await submitGeoAgentTask({
                            type: 'geo_content',
                            title: `${brandName} · 内容 E-E-A-T · ${selectedItem.title.slice(0, 24)}`,
                            brandName,
                            payload: {
                              brandUrl: profile?.website,
                              brandName,
                              contentItemId: selectedItem.id,
                              contentItems: [
                                {
                                  id: selectedItem.id,
                                  title: selectedItem.title,
                                  body: selectedItem.fullContent,
                                },
                              ],
                              targetQuestions: questions.slice(0, 5),
                              userConfirmedExecution: true,
                              outputContract: { format: 'json', version: 'geoWebOutput.v1' },
                            },
                          });
                          if (error || !task) throw new Error(error ?? '提交失败');
                          toast('GEO 内容分析已提交，完成后请确认 brief 入库', 'success');
                          if (onNavigate) navigateToAgentTaskResult(onNavigate, task.id);
                        } catch (e) {
                          toast(e instanceof Error ? e.message : '提交失败', 'error');
                        } finally {
                          setGeoContentLoading(false);
                        }
                      }}
                    >
                      {geoContentLoading ? '提交中…' : 'GEO 内容 E-E-A-T 分析'}
                    </button>
                    {meta?.geoContentBrief && (
                      <p className="text-[10px] text-green-800">
                        已确认 brief ·{' '}
                        {typeof meta.geoContentBrief === 'object' &&
                        meta.geoContentBrief &&
                        'rewriteBrief' in (meta.geoContentBrief as object)
                          ? String((meta.geoContentBrief as { rewriteBrief?: string }).rewriteBrief).slice(0, 80)
                          : '见 generationMeta'}
                      </p>
                    )}
                  </div>
                  <ArticleEffectVerificationPanel baseline={baseline} verification={verification} />
                </section>
              );
            })()}
            <section className="rounded-lg p-3" style={{ background: 'var(--neutral-bg-03)' }}>
              <p style={{ color: 'var(--neutral-text-03)' }}>
                在已展开的文件夹中勾选文章，可跨批次批量发布或删除；点击标题预览，点「编辑」修改正文。
              </p>
            </section>
          </div>
        ) : (
          <p style={{ color: 'var(--neutral-text-03)' }}>选择批次后显示属性</p>
        )}
      </RightPreviewPanel>

    </div>
    </>
  );
}
