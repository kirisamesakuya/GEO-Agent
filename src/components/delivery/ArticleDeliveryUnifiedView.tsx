import { useCallback, useEffect, useMemo, useState } from 'react';

import { RefreshCw, Search, Send } from 'lucide-react';

import type { ViewType, AccountBinding, ContentBatch } from '../../types';

import { useToast } from '../../context/ToastContext';

import GeoListPageShell from '../common/GeoListPageShell';

import HermesWorkingOverlay from '../common/HermesWorkingOverlay';

import HermesPublishConfirmDialog from '../agent/HermesPublishConfirmDialog';

import {

  ARTICLE_DELIVERY_ACTION_LABEL,

  ARTICLE_DELIVERY_PLATFORM_OPTIONS,

  ARTICLE_DELIVERY_SOURCE_LABEL,

  ARTICLE_DELIVERY_SOURCE_OPTIONS,

  ARTICLE_DELIVERY_QUICK_SOURCE_FILTERS,

  ARTICLE_DELIVERY_STAGE_LABEL,

  ARTICLE_DELIVERY_STATUS_TABS,

  articleDeliveryDetailHint,

  articleDeliveryRowAction,

  articleDeliverySourceClass,

  articleDeliveryStageClass,

  countArticleDeliveryByStatus,

  filterArticleDeliveryRows,

  formatArticleDeliveryTime,

  groupAiRowsForPublish,

  isAiPublishSelectable,

  mapAiContentToRows,

  mapManualOrdersToRows,

  mergeArticleDeliveryRows,

  parseArticleDeliveryStatusFromUrl,

  type ArticleDeliveryRow,

  type ArticleDeliverySourceFilter,

  type ArticleDeliveryStatusFilter,

  type AiPublishGroup,

} from '../../lib/article-delivery-unified';

import {

  buildHermesConfirmPayload,

  executeAiArticlePublish,

  groupsMissingAccounts,

} from '../../lib/ai-article-publish';

import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../../lib/publish-accounts';

import ArticleDeliveryPublishDialog from './ArticleDeliveryPublishDialog';



interface Props {

  brandName: string;

  onBrandChange: (name: string) => void;

  onNavigate?: (view: ViewType, hint?: string) => void;

}



const PAGE_SIZE = 20;



export default function ArticleDeliveryUnifiedView({

  brandName,

  onBrandChange,

  onNavigate,

}: Props) {

  const { toast } = useToast();

  const [rows, setRows] = useState<ArticleDeliveryRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');

  const [sourceFilter, setSourceFilter] = useState<ArticleDeliverySourceFilter>('all');

  const [platformFilter, setPlatformFilter] = useState('');

  const [ownerFilter, setOwnerFilter] = useState('');

  const [dateSince, setDateSince] = useState('');

  const [dateUntil, setDateUntil] = useState('');

  const [statusFilter, setStatusFilter] = useState<ArticleDeliveryStatusFilter>(

    parseArticleDeliveryStatusFromUrl()

  );

  const [page, setPage] = useState(1);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const [accounts, setAccounts] = useState<AccountBinding[]>([]);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const [publishGroups, setPublishGroups] = useState<AiPublishGroup[]>([]);

  const [accountByPlatform, setAccountByPlatform] = useState<Record<string, string>>({});

  const [hermesConfirmOpen, setHermesConfirmOpen] = useState(false);

  const [hermesPayload, setHermesPayload] = useState<ReturnType<typeof buildHermesConfirmPayload>>(null);

  const [publishing, setPublishing] = useState(false);

  const [hermesWork, setHermesWork] = useState({

    open: false,

    progress: 0,

    message: '',

    detail: '',

  });



  const effectiveBrand = brandName !== '__all__' ? brandName : '';



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const batchParams = new URLSearchParams({ limit: '200' });

      if (brandName !== '__all__') batchParams.set('brandName', brandName);



      const ordersUrl =

        brandName === '__all__' ? '/api/orders' : `/api/orders?brandName=${encodeURIComponent(brandName)}`;



      const [batchRes, ordersRes, recordsRes] = await Promise.all([

        fetch(`/api/content-batches?${batchParams}`),

        fetch(ordersUrl),

        brandName !== '__all__'

          ? fetch(`/api/publish-records?brandName=${encodeURIComponent(brandName)}`)

          : Promise.resolve(null),

      ]);



      const batchData = (await batchRes.json()) as { batches?: ContentBatch[] };

      const ordersData = (await ordersRes.json()) as { orders?: unknown[] };

      const recordsData = recordsRes

        ? ((await recordsRes.json()) as { records?: Array<Record<string, unknown>> })

        : { records: [] };



      const batches = batchData.batches ?? [];

      const publishRecords = (recordsData.records ?? []).map((r) => ({

        id: String(r.id),

        contentItemId: r.contentItemId as string | undefined,

        status: String(r.status ?? ''),

        publishedUrl: r.publishedUrl as string | undefined,

        errorCode: r.errorCode as string | undefined,

        reviewCategory: r.reviewCategory as string | undefined,

        accountName: r.accountName as string | undefined,

        executedAt: r.executedAt as string | undefined,

      }));



      const projectNames = new Map<string, string>();

      const aiRows = mapAiContentToRows(batches, publishRecords, projectNames);

      const manualRows = mapManualOrdersToRows(

        (ordersData.orders ?? []) as Parameters<typeof mapManualOrdersToRows>[0]

      );

      setRows(mergeArticleDeliveryRows(aiRows, manualRows));

    } catch {

      setRows([]);

    } finally {

      setLoading(false);

    }

  }, [brandName]);



  useEffect(() => {

    void load();

  }, [load]);



  useEffect(() => {

    if (!effectiveBrand) {

      setAccounts([]);

      return;

    }

    void fetchAvailablePublishAccounts(effectiveBrand)

      .then((list) => setAccounts(list.map(toAccountBindingShape)))

      .catch(() => setAccounts([]));

  }, [effectiveBrand]);



  useEffect(() => {

    setPage(1);

    setCheckedIds(new Set());

  }, [search, sourceFilter, platformFilter, ownerFilter, dateSince, dateUntil, statusFilter, brandName]);



  const statusCounts = useMemo(() => countArticleDeliveryByStatus(rows), [rows]);



  const ownerOptions = useMemo(() => {

    const set = new Set(rows.map((r) => r.ownerLabel).filter(Boolean));

    return ['', ...Array.from(set).sort()];

  }, [rows]);



  const filtered = useMemo(

    () =>

      filterArticleDeliveryRows(rows, {

        status: statusFilter,

        source: sourceFilter,

        platform: platformFilter,

        owner: ownerFilter,

        search,

        dateSince,

        dateUntil,

      }),

    [rows, statusFilter, sourceFilter, platformFilter, ownerFilter, search, dateSince, dateUntil]

  );



  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectableOnPage = pageRows.filter(isAiPublishSelectable);

  const checkedRows = useMemo(

    () => rows.filter((r) => checkedIds.has(r.id)),

    [rows, checkedIds]

  );

  const checkedPublishable = checkedRows.filter(isAiPublishSelectable);



  const switchStatus = (next: ArticleDeliveryStatusFilter) => {

    setStatusFilter(next);

    const url = new URL(window.location.href);

    if (next === 'all') url.searchParams.delete('articleStage');

    else url.searchParams.set('articleStage', next);

    window.history.replaceState({}, '', url);

  };



  const openRow = (row: ArticleDeliveryRow) => {

    const hint = articleDeliveryDetailHint(row.source, row.sourceId);

    onNavigate?.('content_delivery', hint);

  };



  const toggleAll = () => {

    const selectableIds = selectableOnPage.map((r) => r.id);

    if (selectableIds.length === 0) return;

    const allSelected = selectableIds.every((id) => checkedIds.has(id));

    if (allSelected) {

      setCheckedIds(new Set());

    } else {

      setCheckedIds(new Set(selectableIds));

    }

  };



  const toggleOne = (row: ArticleDeliveryRow) => {

    if (!isAiPublishSelectable(row)) return;

    setCheckedIds((prev) => {

      const next = new Set(prev);

      if (next.has(row.id)) next.delete(row.id);

      else next.add(row.id);

      return next;

    });

  };



  const closePublishFlow = () => {

    setPublishDialogOpen(false);

    setHermesConfirmOpen(false);

    setPublishGroups([]);

    setAccountByPlatform({});

    setHermesPayload(null);

  };



  const beginPublish = (targetRows: ArticleDeliveryRow[]) => {

    if (!effectiveBrand) {

      toast('批量发布请先选择具体品牌', 'error');

      return;

    }

    const groups = groupAiRowsForPublish(targetRows);

    if (groups.length === 0) {

      toast('没有可发布的 AI 文章', 'error');

      return;

    }

    setPublishGroups(groups);

    setPublishDialogOpen(true);

  };



  const onPublishDialogConfirm = (selectedAccounts: Record<string, string>) => {

    const missing = groupsMissingAccounts(publishGroups, accounts, selectedAccounts);

    if (missing.length) {

      toast(`${missing.join('、')} 无可用发布账号`, 'error');

      return;

    }

    setAccountByPlatform(selectedAccounts);

    const payload = buildHermesConfirmPayload(publishGroups, accounts, selectedAccounts);

    if (!payload) {

      toast('发布参数无效', 'error');

      return;

    }

    setHermesPayload(payload);

    setPublishDialogOpen(false);

    setHermesConfirmOpen(true);

  };



  const runPublish = async () => {

    setHermesConfirmOpen(false);

    setPublishing(true);

    try {

      const result = await executeAiArticlePublish(

        publishGroups,

        accounts,

        (p) => setHermesWork({ open: true, ...p }),

        accountByPlatform

      );

      if (result.published > 0) {

        const linkHint = result.links[0] ? ` · ${result.links[0]}` : '';

        toast(

          `Hermes 发布完成（${result.published} 篇）${linkHint}${result.errors.length ? `；${result.errors.length} 项需关注` : ''}`,

          result.errors.length ? 'info' : 'success'

        );

        setCheckedIds(new Set());

        await load();

      } else if (result.errors.length) {

        toast(result.errors[0], 'error');

      } else {

        toast('发布未成功', 'error');

      }

    } finally {

      setPublishing(false);

      setHermesWork({ open: false, progress: 0, message: '', detail: '' });

      closePublishFlow();

    }

  };



  const handleRowAction = (row: ArticleDeliveryRow, action: ReturnType<typeof articleDeliveryRowAction>) => {

    if (action === 'publish' || action === 'retry') {

      beginPublish([row]);

      return;

    }

    openRow(row);

  };



  return (

    <>

      <HermesWorkingOverlay

        open={hermesWork.open}

        progress={hermesWork.progress}

        message={hermesWork.message}

        detail={hermesWork.detail}

      />

      <ArticleDeliveryPublishDialog

        open={publishDialogOpen}

        groups={publishGroups}

        accounts={accounts}

        loading={publishing}

        onCancel={closePublishFlow}

        onConfirm={onPublishDialogConfirm}

      />

      <HermesPublishConfirmDialog

        open={hermesConfirmOpen}

        payload={hermesPayload}

        loading={publishing}

        onCancel={closePublishFlow}

        onConfirm={() => void runPublish()}

      />

      <GeoListPageShell

        brandLabel="查看哪个品牌"

        brandName={brandName}

        onBrandChange={onBrandChange}

        allowAllBrands

        hidePageHeader

        title="文章交付"

        statusTabs={ARTICLE_DELIVERY_STATUS_TABS.map((t) => ({

          id: t.id,

          label: t.label,

          count: statusCounts[t.id],

        }))}

        activeStatus={statusFilter}

        onStatusChange={(id) => switchStatus(id as ArticleDeliveryStatusFilter)}

        toolbar={

          <>

            <div className="relative w-[180px] shrink-0">

              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--neutral-text-03)]" />

              <input

                type="search"

                placeholder="搜索文章标题或关键词…"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

                className="geo-input geo-input-sm w-full pl-8"

              />

            </div>

            <select

              className="geo-input geo-input-sm geo-filter-select"

              value={sourceFilter}

              onChange={(e) => setSourceFilter(e.target.value as ArticleDeliverySourceFilter)}

              aria-label="来源"

            >

              {ARTICLE_DELIVERY_SOURCE_OPTIONS.map((o) => (

                <option key={o.id} value={o.id}>

                  {o.label}

                </option>

              ))}

            </select>

            <select

              className="geo-input geo-input-sm geo-filter-select"

              value={platformFilter}

              onChange={(e) => setPlatformFilter(e.target.value)}

              aria-label="平台"

            >

              {ARTICLE_DELIVERY_PLATFORM_OPTIONS.map((o) => (

                <option key={o.id || 'all'} value={o.id}>

                  {o.label}

                </option>

              ))}

            </select>

            <select

              className="geo-input geo-input-sm geo-filter-select geo-filter-select--wide"

              value={ownerFilter}

              onChange={(e) => setOwnerFilter(e.target.value)}

              aria-label="项目或接单方"

            >

              <option value="">全部项目/接单方</option>

              {ownerOptions.filter(Boolean).map((o) => (

                <option key={o} value={o}>

                  {o}

                </option>

              ))}

            </select>

            <input

              type="date"

              className="geo-input geo-input-sm geo-filter-date"

              value={dateSince}

              onChange={(e) => setDateSince(e.target.value)}

              aria-label="开始日期"

              title="开始日期"

            />

            <span className="shrink-0 text-xs text-[var(--neutral-text-03)]">至</span>

            <input

              type="date"

              className="geo-input geo-input-sm geo-filter-date"

              value={dateUntil}

              onChange={(e) => setDateUntil(e.target.value)}

              aria-label="结束日期"

              title="结束日期"

            />

            <button

              type="button"

              className="geo-btn-secondary geo-btn-sm shrink-0 p-2"

              onClick={() => void load()}

              title="刷新"

            >

              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

            </button>

          </>

        }

      >

        <div className="geo-list-table-panel flex flex-col min-h-0 h-full">

          <div

            className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 text-xs border-b"

            style={{ borderColor: 'var(--neutral-divider-02)', background: '#fff' }}

          >

            <span className="text-[var(--neutral-text-03)]">来源：</span>

            {ARTICLE_DELIVERY_QUICK_SOURCE_FILTERS.map((s) => (

              <button

                key={s}

                type="button"

                onClick={() => setSourceFilter(sourceFilter === s ? 'all' : s)}

                className={`rounded-md px-2 py-0.5 font-medium ${articleDeliverySourceClass(s)} ${

                  sourceFilter === s ? 'ring-1 ring-[var(--color-accent)]' : 'opacity-80'

                }`}

              >

                {ARTICLE_DELIVERY_SOURCE_LABEL[s]}

              </button>

            ))}

          </div>



          {checkedPublishable.length > 0 ? (

            <div

              className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs border-b"

              style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-accent-light)' }}

            >

              <span className="text-[var(--neutral-text-02)]">

                已选 {checkedPublishable.length} 篇（AI · 可发布）

              </span>

              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  className="geo-btn-secondary geo-btn-sm"

                  onClick={() => setCheckedIds(new Set())}

                >

                  取消选择

                </button>

                <button

                  type="button"

                  className="geo-btn-primary geo-btn-sm flex items-center gap-1.5"

                  disabled={publishing || !effectiveBrand}

                  onClick={() => beginPublish(checkedPublishable)}

                >

                  <Send className="w-3.5 h-3.5" />

                  批量发布

                </button>

              </div>

            </div>

          ) : null}



          <div className="flex-1 min-h-0 overflow-auto geo-table-wrap">

            <table className="geo-table">

              <thead>

                <tr>

                  <th className="w-10">

                    <input

                      type="checkbox"

                      checked={

                        selectableOnPage.length > 0 &&

                        selectableOnPage.every((r) => checkedIds.has(r.id))

                      }

                      disabled={selectableOnPage.length === 0}

                      onChange={toggleAll}

                      aria-label="全选可发布 AI 文章"

                    />

                  </th>

                  <th>文章标题</th>

                  <th>来源</th>

                  <th>平台</th>

                  <th>项目/接单方</th>

                  <th>状态</th>

                  <th>更新时间</th>

                  <th>发布结果</th>

                  <th className="geo-table__actions">操作</th>

                </tr>

              </thead>

              <tbody>

                {loading && pageRows.length === 0 ? (

                  <tr>

                    <td colSpan={9} className="geo-table-empty">

                      加载中…

                    </td>

                  </tr>

                ) : pageRows.length === 0 ? (

                  <tr>

                    <td colSpan={9} className="geo-table-empty">

                      暂无文章交付记录

                    </td>

                  </tr>

                ) : (

                  pageRows.map((row) => {

                    const action = articleDeliveryRowAction(row);

                    const selectable = isAiPublishSelectable(row);

                    return (

                      <tr key={row.id}>

                        <td>

                          <input

                            type="checkbox"

                            checked={checkedIds.has(row.id)}

                            disabled={!selectable}

                            title={

                              selectable

                                ? '选择用于批量发布'

                                : '仅 AI 待发布/发布失败文章可批量发布'

                            }

                            onChange={() => toggleOne(row)}

                            aria-label={`选择 ${row.title}`}

                          />

                        </td>

                        <td>

                          <button

                            type="button"

                            className="font-medium text-sm text-[var(--color-title)] max-w-[220px] truncate text-left hover:underline"

                            onClick={() => openRow(row)}

                          >

                            {row.title}

                          </button>

                          {brandName === '__all__' && row.brandName && (

                            <p className="text-[11px] text-[var(--neutral-text-03)]">{row.brandName}</p>

                          )}

                        </td>

                        <td>

                          <span

                            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${articleDeliverySourceClass(row.source)}`}

                          >

                            {ARTICLE_DELIVERY_SOURCE_LABEL[row.source]}

                          </span>

                        </td>

                        <td className="text-xs whitespace-nowrap">{row.platform}</td>

                        <td className="text-xs max-w-[140px] truncate">{row.ownerLabel}</td>

                        <td>

                          <span

                            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${articleDeliveryStageClass(row.stage)}`}

                          >

                            {ARTICLE_DELIVERY_STAGE_LABEL[row.stage]}

                          </span>

                        </td>

                        <td className="text-xs tabular-nums whitespace-nowrap text-[var(--neutral-text-03)]">

                          {formatArticleDeliveryTime(row.updatedAt)}

                        </td>

                        <td className="text-xs max-w-[120px] truncate">

                          {row.publishUrl ? (

                            <a

                              href={row.publishUrl}

                              target="_blank"

                              rel="noreferrer"

                              className="geo-link"

                              onClick={(e) => e.stopPropagation()}

                            >

                              {row.publishResultLabel ?? '链接'}

                            </a>

                          ) : (

                            row.publishResultLabel ?? '—'

                          )}

                        </td>

                        <td className="geo-table__actions">

                          <div className="inline-flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">

                            <button

                              type="button"

                              className="geo-link text-xs font-medium shrink-0"

                              onClick={() => handleRowAction(row, action)}

                            >

                              {ARTICLE_DELIVERY_ACTION_LABEL[action]}

                            </button>

                            {action !== 'view' ? (

                              <>

                                <span className="text-[var(--neutral-text-04)] shrink-0" aria-hidden>

                                  ·

                                </span>

                                <button

                                  type="button"

                                  className="text-xs text-[var(--neutral-text-03)] hover:text-[var(--neutral-text-01)] shrink-0"

                                  onClick={() => openRow(row)}

                                >

                                  详情

                                </button>

                              </>

                            ) : null}

                          </div>

                        </td>

                      </tr>

                    );

                  })

                )}

              </tbody>

            </table>

          </div>



          <div

            className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs border-t"

            style={{ borderColor: 'var(--neutral-divider-02)', background: '#fff' }}

          >

            <span className="text-[var(--neutral-text-03)]">共 {filtered.length} 条</span>

            <div className="flex items-center gap-2">

              <select

                className="geo-input geo-input-sm"

                value={PAGE_SIZE}

                disabled

                aria-label="每页条数"

              >

                <option value={20}>20 条/页</option>

              </select>

              <button

                type="button"

                className="geo-btn-secondary geo-btn-sm"

                disabled={page <= 1}

                onClick={() => setPage((p) => Math.max(1, p - 1))}

              >

                上一页

              </button>

              <span className="tabular-nums">

                {page} / {totalPages}

              </span>

              <button

                type="button"

                className="geo-btn-secondary geo-btn-sm"

                disabled={page >= totalPages}

                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}

              >

                下一页

              </button>

            </div>

          </div>

        </div>

      </GeoListPageShell>

    </>

  );

}


