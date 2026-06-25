import { useState, type ReactNode } from 'react';
import {
  Wallet,
  Users,
  Monitor,
  FileText,
  CheckCircle2,
  ChevronRight,
  Settings,
  RefreshCw,
} from 'lucide-react';
import type { ViewType } from '../../types';
import BrandSwitcher from '../common/BrandSwitcher';

export interface WorkbenchBrandOverview {
  inProgress: number;
  pendingAction: number;
  completedThisWeek: number;
  creditsBalance: number;
  deliveryBalance: number;
  publishAccountCount: number;
  websiteServiceBalance?: number;
}

export interface WorkbenchTaskStat {
  label: string;
  value: number;
}

export interface WorkbenchTaskCard {
  id: string;
  title: string;
  category: 'content' | 'website';
  categoryLabel: string;
  brandStatus: string;
  statusTone: 'warning' | 'info' | 'neutral';
  stats: WorkbenchTaskStat[];
  actionLabel: string;
  targetView: ViewType;
  targetHint?: string;
}

export interface WorkbenchTodoItem {
  id: string;
  label: string;
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

type BoardFilter = 'all' | 'content' | 'website';

interface Props {
  brandName: string;
  brandIndustry?: string;
  overview: WorkbenchBrandOverview;
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

function statusTagClass(tone: WorkbenchTaskCard['statusTone']): string {
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (tone === 'info') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-[var(--neutral-bg-02)] text-[var(--neutral-text-02)] border-[var(--neutral-divider-02)]';
}

function BrandAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0) || '品';
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
      style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function OverviewStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 min-w-[140px]">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--neutral-text-03)] leading-tight">{label}</p>
        <p className="text-lg font-bold text-[var(--color-title)] mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TaskBoardCard({
  card,
  onNavigate,
}: {
  card: WorkbenchTaskCard;
  onNavigate: (view: ViewType, hint?: string) => void;
}) {
  return (
    <article
      className="rounded-xl border p-4 flex flex-col gap-3 h-full"
      style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
    >
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-[var(--color-title)] leading-snug">{card.title}</h4>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border"
            style={{
              background: 'var(--neutral-bg-02)',
              color: 'var(--neutral-text-02)',
              borderColor: 'var(--neutral-divider-02)',
            }}
          >
            {card.categoryLabel}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusTagClass(card.statusTone)}`}
          >
            {card.brandStatus}
          </span>
        </div>
      </div>

      {card.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-[var(--neutral-text-03)] flex-1">
          {card.stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1">
              <span>{s.label}</span>
              <span className="font-semibold text-[var(--color-title)] tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="w-full mt-auto py-2 rounded-lg text-xs font-medium border transition-colors hover:opacity-90"
        style={{
          borderColor: 'var(--color-accent)',
          color: 'var(--color-accent)',
          background: 'var(--color-accent-light)',
        }}
        onClick={() => onNavigate(card.targetView, card.targetHint)}
      >
        {card.actionLabel}
      </button>
    </article>
  );
}

export default function WorkbenchResultPanel({
  brandName,
  brandIndustry,
  overview,
  todos,
  taskCards,
  recentCompleted,
  onNavigate,
  onBrandChange,
}: Props) {
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all');

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

  const viewAllTodos = () => onNavigate('content_delivery');
  const viewAllRecent = () => onNavigate('content_delivery', 'tab:completed');

  const showWebsiteBalance =
    overview.websiteServiceBalance != null && overview.websiteServiceBalance > 0;

  return (
    <div className="space-y-4">
      {/* 品牌总览 */}
      <section className="geo-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--color-title)]">品牌总览</h3>
          <div className="flex items-center gap-2">
            <BrandSwitcher variant="scope" brandName={brandName} onBrandChange={onBrandChange} />
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

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <BrandAvatar name={brandName} />
            <div className="min-w-0">
              <p className="text-lg font-bold text-[var(--color-title)] truncate">{brandName}</p>
              {brandIndustry && (
                <p className="text-[11px] text-[var(--neutral-text-03)] mt-0.5">{brandIndustry}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--neutral-bg-02)] text-[var(--neutral-text-02)]">
                  进行中 <strong className="text-[var(--color-title)]">{overview.inProgress}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800">
                  待处理 <strong>{overview.pendingAction}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800">
                  本周完成 <strong>{overview.completedThisWeek}</strong>
                </span>
              </div>
            </div>
          </div>

          <div
            className={`grid gap-4 shrink-0 ${
              showWebsiteBalance ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            <OverviewStat
              icon={<Wallet className="w-4 h-4" />}
              label="投放账户余额"
              value={`¥${overview.deliveryBalance.toLocaleString()}`}
            />
            <OverviewStat
              icon={<Users className="w-4 h-4" />}
              label="可用发布账户"
              value={String(overview.publishAccountCount)}
            />
            {showWebsiteBalance && (
              <OverviewStat
                icon={<Monitor className="w-4 h-4" />}
                label="网站优化服务余额"
                value={`¥${overview.websiteServiceBalance!.toLocaleString()}`}
              />
            )}
          </div>
        </div>
      </section>

      {/* 任务看板 + 待你处理 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        <section className="geo-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--neutral-bg-02)]">
              {BOARD_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBoardFilter(f.id)}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    boardFilter === f.id
                      ? 'bg-white text-[var(--color-accent)] shadow-sm'
                      : 'text-[var(--neutral-text-03)] hover:text-[var(--neutral-text-01)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-accent)] font-medium shrink-0"
              onClick={viewAllBoard}
            >
              查看全部
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {filteredCards.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <p className="text-xs text-[var(--neutral-text-03)]">
                {boardFilter === 'all' ? '暂无进行中的优化任务' : '该分类下暂无任务'}
              </p>
              <button
                type="button"
                className="mt-3 text-xs text-[var(--color-accent)] font-medium"
                onClick={() => onNavigate('create_order', 'paid_quote')}
              >
                发起付费信源发单
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCards.map((card) => (
                <TaskBoardCard key={card.id} card={card} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>

        <section className="geo-card p-5 xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-2 mb-4">
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
              {todos.slice(0, 5).map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border"
                  style={{ borderColor: 'var(--neutral-divider-03)', background: 'var(--neutral-bg-03)' }}
                >
                  <FileText
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: 'var(--color-accent)' }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-title)] leading-relaxed">{t.label}</p>
                    <button
                      type="button"
                      className="mt-1.5 text-[11px] font-medium text-[var(--color-accent)]"
                      onClick={() => onNavigate(t.targetView, t.targetHint)}
                    >
                      去处理
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 最近完成 */}
      <section className="geo-card p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
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
          <p className="text-xs text-[var(--neutral-text-03)] py-4 text-center">暂无最近完成记录</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--neutral-divider-03)' }}>
            {recentCompleted.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
                  <span className="text-sm text-[var(--color-title)] truncate">
                    <span className="text-emerald-600 font-medium">【{r.statusLabel}】</span>{' '}
                    {r.title}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--neutral-text-03)]">
                  <span>
                    类型：<span className="text-[var(--neutral-text-02)]">{r.categoryLabel}</span>
                  </span>
                  {r.responsibleParty && (
                    <span>
                      负责方：<span className="text-[var(--neutral-text-02)]">{r.responsibleParty}</span>
                    </span>
                  )}
                  <span>
                    完成时间：<span className="text-[var(--neutral-text-02)]">{formatCompletedAt(r.completedAt)}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="text-[11px] font-medium text-[var(--color-accent)] shrink-0"
                  onClick={() =>
                    onNavigate(r.targetView ?? 'content_delivery', r.targetHint ?? `delivery:order:${r.id}`)
                  }
                >
                  查看详情
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
