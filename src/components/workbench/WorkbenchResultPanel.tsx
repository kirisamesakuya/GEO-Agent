import { useState, type ReactNode } from 'react';
import {
  Users,
  Monitor,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Coins,
} from 'lucide-react';
import type { ViewType } from '../../types';
import BrandIdentityRow from '../common/BrandIdentityRow';
import WorkbenchGeoMonitorSection, {
  type WorkbenchGeoMonitorData,
} from './WorkbenchGeoMonitorSection';

export interface WorkbenchBrandOverview {
  inProgress: number;
  pendingAction: number;
  completedThisWeek: number;
  creditsBalance: number;
  deliveryBalance: number;
  publishAccountCount: number;
  websiteServiceBalance?: number;
}

export interface WorkbenchKpi {
  weekPublished: number;
  monthPublished: number;
  monthIndexed: number;
  exposureEstimate: number;
  rankTop10: number;
  rankTop50: number;
  newKeywordsWeek: number;
  rankTrend: number[];
  monthSpend: number;
  roiArticlesPer10k: number;
  rankDeltaWeek: number;
}

export interface WorkbenchTaskProgress {
  done: number;
  total: number;
  phaseLabel: string;
}

export interface WorkbenchKeyOutput {
  label: string;
  value: string;
  tone?: 'success' | 'danger' | 'neutral';
}

export interface WorkbenchTaskCard {
  id: string;
  title: string;
  category: 'content' | 'website';
  categoryLabel: string;
  brandStatus: string;
  statusTone: 'warning' | 'info' | 'neutral' | 'success' | 'danger';
  stats: Array<{ label: string; value: number }>;
  progress?: WorkbenchTaskProgress;
  keyOutputs?: WorkbenchKeyOutput[];
  actionLabel: string;
  targetView: ViewType;
  targetHint?: string;
}

export interface WorkbenchTodoItem {
  id: string;
  label: string;
  priority?: string;
  type?: string;
  targetView: ViewType;
  targetHint?: string;
}

export interface WorkbenchRecentItem {
  id: string;
  title: string;
  statusLabel: string;
  categoryLabel: string;
  responsibleParty?: string;
  completedAt: string;
  targetView?: ViewType;
  targetHint?: string;
}

export interface WorkbenchStatusItem {
  id: string;
  title: string;
  categoryLabel: string;
  statusLabel: string;
  targetView: ViewType;
  targetHint?: string;
}

type BoardFilter = 'all' | 'content' | 'website';
type StatusExpandKey = 'inProgress' | 'pending' | 'completed';

interface Props {
  brandName: string;
  brandIndustry?: string;
  overview: WorkbenchBrandOverview;
  kpi?: WorkbenchKpi;
  geoMonitor?: WorkbenchGeoMonitorData;
  inProgressItems?: WorkbenchStatusItem[];
  todos: WorkbenchTodoItem[];
  taskCards: WorkbenchTaskCard[];
  recentCompleted: WorkbenchRecentItem[];
  onNavigate: (view: ViewType, hint?: string) => void;
  onBrandChange: (name: string) => void;
}

const BOARD_FILTERS: { id: BoardFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'content', label: '内容优化' },
  { id: 'website', label: '网站优化' },
];

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatExposure(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

function statusTagClass(tone: WorkbenchTaskCard['statusTone']): string {
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (tone === 'info') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (tone === 'danger') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-[var(--neutral-bg-02)] text-[var(--neutral-text-02)] border-[var(--neutral-divider-02)]';
}

function outputToneClass(tone?: WorkbenchKeyOutput['tone']): string {
  if (tone === 'success') return 'text-emerald-600';
  if (tone === 'danger') return 'text-red-600';
  return 'text-[var(--color-title)]';
}

function todoUrgencyClass(todo: WorkbenchTodoItem): string {
  if (todo.priority === 'P0' || todo.type === 'acceptance') {
    return 'border-l-[3px] border-l-red-500 bg-red-50/50';
  }
  if (todo.priority === 'P1') {
    return 'border-l-[3px] border-l-amber-400 bg-amber-50/40';
  }
  return 'border-l-[3px] border-l-transparent';
}

type StatusChipTone = 'neutral' | 'warning' | 'success';

function statusChipClass(tone: StatusChipTone, active: boolean): string {
  const base =
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer select-none';
  if (tone === 'warning') {
    return `${base} ${active ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'}`;
  }
  if (tone === 'success') {
    return `${base} ${active ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'}`;
  }
  return `${base} ${active ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]' : 'bg-[var(--neutral-bg-02)] border-[var(--neutral-divider-02)] text-[var(--neutral-text-02)] hover:border-[var(--neutral-divider-01)]'}`;
}

function BrandStatusExpandPanel({
  kind,
  inProgressItems,
  todos,
  recentCompleted,
  onNavigate,
}: {
  kind: StatusExpandKey;
  inProgressItems: WorkbenchStatusItem[];
  todos: WorkbenchTodoItem[];
  recentCompleted: WorkbenchRecentItem[];
  onNavigate: (view: ViewType, hint?: string) => void;
}) {
  const titles: Record<StatusExpandKey, string> = {
    inProgress: '进行中任务',
    pending: '待你处理',
    completed: '本周完成',
  };
  const hints: Record<StatusExpandKey, string> = {
    inProgress: '内容优化与网站优化中尚未完结的项目',
    pending: '需你确认报价或验收的待办事项',
    completed: '近 7 天内已完结的内容与网站任务',
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--neutral-divider-03)]">
      <div className="mb-2">
        <p className="text-xs font-semibold text-[var(--color-title)]">{titles[kind]}</p>
        <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5">{hints[kind]}</p>
      </div>

      {kind === 'inProgress' && (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {inProgressItems.length === 0 ? (
            <li className="text-xs text-[var(--neutral-text-03)] py-2">暂无进行中任务</li>
          ) : (
            inProgressItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[var(--neutral-bg-02)] transition-colors"
                  onClick={() => onNavigate(item.targetView, item.targetHint)}
                >
                  <span className="geo-workbench-tag shrink-0">{item.categoryLabel}</span>
                  <span className="text-xs text-[var(--color-title)] truncate flex-1">{item.title}</span>
                  <span className="text-[10px] text-[var(--neutral-text-03)] shrink-0">{item.statusLabel}</span>
                  <ChevronRight className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {kind === 'pending' && (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {todos.length === 0 ? (
            <li className="text-xs text-[var(--neutral-text-03)] py-2">暂无待处理事项</li>
          ) : (
            todos.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[var(--neutral-bg-02)] transition-colors ${todoUrgencyClass(t)}`}
                  onClick={() => onNavigate(t.targetView, t.targetHint)}
                >
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${t.priority === 'P0' || t.type === 'acceptance' ? 'text-red-500' : 'text-[var(--color-accent)]'}`}
                  />
                  <span className="text-xs text-[var(--color-title)] truncate flex-1">{t.label}</span>
                  <ChevronRight className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {kind === 'completed' && (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {recentCompleted.length === 0 ? (
            <li className="text-xs text-[var(--neutral-text-03)] py-2">本周暂无完成记录</li>
          ) : (
            recentCompleted.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[var(--neutral-bg-02)] transition-colors"
                  onClick={() =>
                    onNavigate(r.targetView ?? 'content_delivery', r.targetHint ?? `delivery:order:${r.id}`)
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs text-[var(--color-title)] truncate flex-1">{r.title}</span>
                  <span className="text-[10px] text-[var(--neutral-text-03)] shrink-0">{r.categoryLabel}</span>
                  <ChevronRight className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive?: boolean }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 72;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  const stroke = positive === false ? '#ef4444' : positive === true ? '#10b981' : 'var(--color-accent)';
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function TaskProgressBar({ progress }: { progress: WorkbenchTaskProgress }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const isNearDone = pct >= 80;
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-[var(--neutral-text-03)] truncate">{progress.phaseLabel}</span>
        <span className={`tabular-nums shrink-0 ${isNearDone ? 'text-emerald-600 font-medium' : 'text-[var(--neutral-text-02)]'}`}>
          {progress.done}/{progress.total} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--neutral-bg-02)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isNearDone ? 'bg-emerald-500' : 'bg-[var(--color-accent)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function KpiBlock({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="geo-workbench-kpi-block">
      <div className="flex items-center gap-2 mb-3">
        <span className="geo-workbench-kpi-icon">{icon}</span>
        <h4 className="text-xs font-bold text-[var(--color-title)]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function CompactTaskRow({
  card,
  onNavigate,
}: {
  card: WorkbenchTaskCard;
  onNavigate: (view: ViewType, hint?: string) => void;
}) {
  const progress = card.progress ?? { done: 0, total: 1, phaseLabel: card.brandStatus };
  const keyOutputs = card.keyOutputs ?? [];

  return (
    <article className="geo-workbench-task-row group">
      <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 flex-1">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm font-semibold text-[var(--color-title)] leading-snug truncate max-w-full">
              {card.title}
            </h4>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 xl:opacity-100"
              onClick={() => onNavigate(card.targetView, card.targetHint)}
            >
              {card.actionLabel}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="geo-workbench-tag">{card.categoryLabel}</span>
            <span className={`geo-workbench-tag border ${statusTagClass(card.statusTone)}`}>{card.brandStatus}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0">
          {keyOutputs.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {keyOutputs.map((o) => (
                <div key={o.label} className="text-[11px]">
                  <span className="text-[var(--neutral-text-03)]">{o.label} </span>
                  <span className={`font-semibold tabular-nums ${outputToneClass(o.tone)}`}>{o.value}</span>
                </div>
              ))}
            </div>
          )}
          {card.stats.length > 0 && keyOutputs.length === 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--neutral-text-03)]">
              {card.stats
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span key={s.label}>
                    {s.label} <strong className="text-[var(--color-title)]">{s.value}</strong>
                  </span>
                ))}
            </div>
          )}
          <TaskProgressBar progress={progress} />
        </div>
      </div>
    </article>
  );
}

export default function WorkbenchResultPanel({
  brandName,
  brandIndustry,
  overview,
  kpi,
  geoMonitor,
  inProgressItems = [],
  todos,
  taskCards,
  recentCompleted,
  onNavigate,
  onBrandChange,
}: Props) {
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all');
  const [statusExpand, setStatusExpand] = useState<StatusExpandKey | null>(null);

  const toggleStatusExpand = (key: StatusExpandKey) => {
    setStatusExpand((prev) => (prev === key ? null : key));
  };

  const filteredCards =
    boardFilter === 'all' ? taskCards : taskCards.filter((c) => c.category === boardFilter);

  const viewAllBoard = () => {
    if (boardFilter === 'website') {
      onNavigate('site_optimize');
      return;
    }
    if (boardFilter === 'content') {
      onNavigate('content_delivery', 'order_manage');
      return;
    }
    onNavigate('content_delivery');
  };

  const emptyBoardAction =
    boardFilter === 'website'
      ? { label: '发起网站优化', onClick: () => onNavigate('site_optimize') }
      : boardFilter === 'content'
        ? { label: '发起付费信源发单', onClick: () => onNavigate('create_order', 'paid_quote') }
        : { label: '发起付费信源发单', onClick: () => onNavigate('create_order', 'paid_quote') };

  const viewAllTodos = () => onNavigate('content_delivery');
  const viewAllRecent = () => onNavigate('content_delivery', 'tab:completed');

  const showWebsiteBalance =
    overview.websiteServiceBalance != null && overview.websiteServiceBalance > 0;

  const rankUp = (kpi?.rankDeltaWeek ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* 紧凑品牌条 */}
      <section className="geo-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 flex-1">
            <BrandIdentityRow brandName={brandName} onBrandChange={onBrandChange} />

            <div className="flex flex-wrap items-center gap-2">
              {brandIndustry && (
                <span className="text-[11px] px-2 py-1 rounded-md bg-[var(--neutral-bg-02)] text-[var(--neutral-text-03)] border border-[var(--neutral-divider-02)]">
                  {brandIndustry}
                </span>
              )}
              <button
                type="button"
                className={statusChipClass('neutral', statusExpand === 'inProgress')}
                onClick={() => toggleStatusExpand('inProgress')}
                aria-expanded={statusExpand === 'inProgress'}
              >
                进行中 <strong className="tabular-nums">{overview.inProgress}</strong>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${statusExpand === 'inProgress' ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                type="button"
                className={statusChipClass('warning', statusExpand === 'pending')}
                onClick={() => toggleStatusExpand('pending')}
                aria-expanded={statusExpand === 'pending'}
              >
                待处理 <strong className="tabular-nums">{overview.pendingAction}</strong>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${statusExpand === 'pending' ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                type="button"
                className={statusChipClass('success', statusExpand === 'completed')}
                onClick={() => toggleStatusExpand('completed')}
                aria-expanded={statusExpand === 'completed'}
              >
                本周完成 <strong className="tabular-nums">{overview.completedThisWeek}</strong>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${statusExpand === 'completed' ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1 text-xs"
              onClick={() => onNavigate('brand_list')}
            >
              <Settings className="w-3.5 h-3.5" />
              品牌管理
            </button>
          </div>
        </div>

        {statusExpand && (
          <BrandStatusExpandPanel
            kind={statusExpand}
            inProgressItems={inProgressItems}
            todos={todos}
            recentCompleted={recentCompleted}
            onNavigate={onNavigate}
          />
        )}
      </section>

      {/* 第一层：全局核心数据看板 */}
      {kpi && (
        <section className="geo-card p-4 md:p-5">
          <div className="geo-workbench-kpi-grid">
            <KpiBlock title="内容发布" icon={<BarChart3 className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="geo-workbench-kpi-label">本周发布</p>
                  <p className="geo-workbench-kpi-value">{kpi.weekPublished}</p>
                  <p className="geo-workbench-kpi-sub">本月 {kpi.monthPublished} 篇</p>
                </div>
                <div>
                  <p className="geo-workbench-kpi-label">本月收录</p>
                  <p className="geo-workbench-kpi-value text-emerald-600">{kpi.monthIndexed}</p>
                  <p className="geo-workbench-kpi-sub">曝光约 {formatExposure(kpi.exposureEstimate)}</p>
                </div>
              </div>
            </KpiBlock>

            <KpiBlock title="排名监控" icon={<Target className="w-3.5 h-3.5" />}>
              <div className="flex items-end justify-between gap-2">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div>
                    <p className="geo-workbench-kpi-label">Top 10 词</p>
                    <p className="geo-workbench-kpi-value">{kpi.rankTop10}</p>
                  </div>
                  <div>
                    <p className="geo-workbench-kpi-label">Top 50 词</p>
                    <p className="geo-workbench-kpi-value">{kpi.rankTop50}</p>
                  </div>
                </div>
                <Sparkline data={kpi.rankTrend} positive={rankUp} />
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                {rankUp ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={rankUp ? 'text-emerald-600' : 'text-red-600'}>
                  本周 {rankUp ? '+' : ''}
                  {kpi.rankDeltaWeek} 次命中
                </span>
                <span className="text-[var(--neutral-text-03)]">· 新增上词 {kpi.newKeywordsWeek}</span>
              </div>
            </KpiBlock>

            <KpiBlock title="资源消耗" icon={<Coins className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="geo-workbench-kpi-label">投放余额</p>
                  <p className="geo-workbench-kpi-value">¥{overview.deliveryBalance.toLocaleString()}</p>
                  <p className="geo-workbench-kpi-sub flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {overview.publishAccountCount} 个发布账户
                  </p>
                </div>
                <div>
                  <p className="geo-workbench-kpi-label">本月消耗</p>
                  <p className="geo-workbench-kpi-value">¥{kpi.monthSpend.toLocaleString()}</p>
                  <p className={`geo-workbench-kpi-sub ${kpi.roiArticlesPer10k >= 1 ? 'text-emerald-600' : ''}`}>
                    ROI {kpi.roiArticlesPer10k} 篇/万元
                  </p>
                </div>
              </div>
              {showWebsiteBalance && (
                <p className="text-[10px] text-[var(--neutral-text-03)] mt-2 flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  网站优化余额 ¥{overview.websiteServiceBalance!.toLocaleString()}
                </p>
              )}
            </KpiBlock>
          </div>
        </section>
      )}

      {geoMonitor && (
        <WorkbenchGeoMonitorSection data={geoMonitor} onNavigate={onNavigate} />
      )}

      {/* 第二层 + 第三层：任务列表 + 待办 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
        <section className="geo-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-0 border-b border-[var(--neutral-divider-02)]">
            <div className="flex gap-1 -mb-px">
              {BOARD_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBoardFilter(f.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    boardFilter === f.id
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-transparent text-[var(--neutral-text-03)] hover:text-[var(--neutral-text-01)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-accent)] font-medium shrink-0 mb-2"
              onClick={viewAllBoard}
            >
              查看全部
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4">
            {filteredCards.length === 0 ? (
              <div
                className="rounded-lg border border-dashed py-8 text-center"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <p className="text-xs text-[var(--neutral-text-03)]">
                  {boardFilter === 'all' ? '暂无进行中的优化任务' : '该分类下暂无任务'}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--color-accent)] font-medium"
                  onClick={emptyBoardAction.onClick}
                >
                  {emptyBoardAction.label}
                </button>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--neutral-divider-03)' }}>
                {filteredCards.map((card) => (
                  <CompactTaskRow key={card.id} card={card} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="geo-card p-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-[var(--color-title)]">待你处理</h3>
            {todos.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-accent)] font-medium"
                onClick={viewAllTodos}
              >
                查看全部
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {todos.length === 0 ? (
            <p className="text-xs text-[var(--neutral-text-03)] py-6 text-center">暂无待处理事项</p>
          ) : (
            <ul className="space-y-2">
              {todos.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border ${todoUrgencyClass(t)}`}
                  style={{ borderColor: 'var(--neutral-divider-03)' }}
                >
                  <FileText
                    className={`w-4 h-4 shrink-0 mt-0.5 ${t.priority === 'P0' || t.type === 'acceptance' ? 'text-red-500' : 'text-[var(--color-accent)]'}`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-title)] leading-relaxed">{t.label}</p>
                    <button
                      type="button"
                      className="mt-1 text-[11px] font-medium text-[var(--color-accent)]"
                      onClick={() => onNavigate(t.targetView, t.targetHint)}
                    >
                      去处理 →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 最近完成 · 操作日志 */}
      <section className="geo-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[var(--color-title)]">最近完成</h3>
          {recentCompleted.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-accent)] font-medium"
              onClick={viewAllRecent}
            >
              查看全部
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentCompleted.length === 0 ? (
          <p className="text-xs text-[var(--neutral-text-03)] py-3 text-center">暂无最近完成记录</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--neutral-divider-03)' }}>
            {recentCompleted.slice(0, 6).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2.5 first:pt-0 last:pb-0 text-[11px]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden />
                  <span className="text-sm text-[var(--color-title)] truncate">
                    <span className="text-emerald-600 font-medium text-[11px]">【{r.statusLabel}】</span>{' '}
                    {r.title}
                  </span>
                </div>
                <span className="text-[var(--neutral-text-03)] hidden sm:inline">{r.categoryLabel}</span>
                {r.responsibleParty && (
                  <span className="text-[var(--neutral-text-03)] hidden md:inline">{r.responsibleParty}</span>
                )}
                <span className="text-[var(--neutral-text-03)] tabular-nums">{formatCompletedAt(r.completedAt)}</span>
                <button
                  type="button"
                  className="text-[11px] font-medium text-[var(--color-accent)] shrink-0"
                  onClick={() =>
                    onNavigate(r.targetView ?? 'content_delivery', r.targetHint ?? `delivery:order:${r.id}`)
                  }
                >
                  详情
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
