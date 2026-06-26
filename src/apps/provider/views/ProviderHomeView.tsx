import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  ClipboardList,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { ProviderPageId } from '../types';
import {
  ORDER_STATUS_LABEL,
  PLATFORM_SHORT,
  matchesSearch,
  platformPlaceholder,
  formatMarketplaceSlots,
  formatTaskPublishedAt,
} from '../lib/provider-ui';
import { MOCK_PROVIDER_WALLET, resolveProviderWallet } from '../lib/provider-mock-earnings';
import { buildHomeWorkbenchVm } from '../lib/provider-view-models';
import ProviderPageHeader from '../components/workspace/ProviderPageHeader';
import ProviderWorkbenchState from '../components/workspace/ProviderWorkbenchState';

interface Props {
  providerId: string;
  providerName: string;
  searchQuery: string;
  onNavigate: (tab: ProviderPageId) => void;
  onSelectTask: (taskId: string) => void;
  onSelectOrder: (orderId: string) => void;
}

export default function ProviderHomeView({
  providerId,
  providerName,
  searchQuery,
  onNavigate,
  onSelectTask,
  onSelectOrder,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dashboard, setDashboard] = useState<{
    summary: {
      openTasks: number;
      myOrders: number;
      pendingDelivery: number;
      pendingReview: number;
    };
    todos: Array<{ type: string; label: string }>;
    recentOrders: Array<{
      id: string;
      title: string;
      status: string;
      platform: string;
      budget: number;
      brandName?: string;
    }>;
  } | null>(null);
  const [tasks, setTasks] = useState<
    Array<{
      id: string;
      title: string;
      brandName: string;
      platform: string;
      budget?: number;
      isQuoteTask?: boolean;
      pricingMode?: string;
      matchScore?: number;
      industry?: string;
      matchLabel?: string;
      suggestedMinCents?: number;
      suggestedMaxCents?: number;
      claimedCount?: number;
      availableSlots?: number;
      slotTotal?: number;
      createdAt?: string;
    }>
  >([]);
  const [wallet, setWallet] = useState({ extractable: 0, accumulatedIncome: 0 });
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [recentQuotes, setRecentQuotes] = useState<
    Array<{
      id: string;
      status: string;
      createdAt?: string;
      quoteExpiresAt?: string | null;
      order?: { title?: string; brandName?: string };
    }>
  >([]);
  const [quoteStats, setQuoteStats] = useState({ expired: 0, revision: 0 });

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`/api/provider/dashboard?providerId=${providerId}`).then((r) => r.json()),
      fetch(`/api/provider/task-marketplace?providerId=${providerId}`).then((r) => r.json()),
      fetch(`/api/provider/earnings?providerId=${providerId}`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`/api/provider/quotes?providerId=${providerId}`)
        .then((r) => r.json())
        .catch(() => ({ quotes: [] })),
    ])
      .then(([dash, taskRes, earnRes, quoteRes]) => {
        setDashboard(dash);
        setTasks((taskRes.tasks ?? []).slice(0, 5));
        setWallet(
          resolveProviderWallet(earnRes.wallet, earnRes.transactions) ?? {
            extractable: MOCK_PROVIDER_WALLET.extractable,
            accumulatedIncome: MOCK_PROVIDER_WALLET.accumulatedIncome,
          }
        );
        const quotes = (quoteRes.quotes ?? []) as Array<{
          id: string;
          status: string;
          createdAt?: string;
          quoteExpiresAt?: string | null;
          order?: { title?: string; brandName?: string; status?: string };
        }>;
        setPendingQuotes(quotes.filter((q) => q.status === 'pending').length);
        setRecentQuotes(quotes.slice(0, 5));
        const now = Date.now();
        setQuoteStats({
          expired: quotes.filter(
            (q) =>
              q.status === 'pending' &&
              q.quoteExpiresAt &&
              new Date(q.quoteExpiresAt).getTime() < now
          ).length,
          revision: (dash.recentOrders ?? []).filter((o: { status: string }) =>
            ['revision', 'draft_revision'].includes(o.status)
          ).length,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) {
    return <ProviderWorkbenchState mode="loading" />;
  }
  if (error || !dashboard) {
    return (
      <ProviderWorkbenchState
        mode="error"
        action={
          <button type="button" className="provider-btn-workbench text-sm" onClick={() => window.location.reload()}>
            重新加载
          </button>
        }
      />
    );
  }

  const vm = buildHomeWorkbenchVm({
    summary: dashboard.summary,
    todos: dashboard.todos,
    wallet,
    pendingQuotes,
  });

  const activeOrders = dashboard.recentOrders.filter((o) =>
    ['in_progress', 'pending_review', 'revision', 'draft_review', 'draft_revision'].includes(o.status)
  );

  const recommendedTasks = tasks.filter((t) =>
    matchesSearch(`${t.title} ${t.brandName}`, searchQuery)
  );

  const actionCards = [
    {
      key: 'quotes',
      title: '待确认报价',
      value: vm.pendingQuotes,
      hint: '品牌方确认后将进入履约',
      icon: FileText,
      tab: 'quotes' as ProviderPageId,
    },
    {
      key: 'delivery',
      title: '待交付订单',
      value: vm.pendingDelivery,
      hint: '请按时提交交付物',
      icon: ClipboardList,
      tab: 'orders' as ProviderPageId,
    },
    {
      key: 'review',
      title: '待验收订单',
      value: vm.pendingReview,
      hint: '等待品牌方验收确认',
      icon: CheckCircle2,
      tab: 'orders' as ProviderPageId,
    },
    {
      key: 'revision',
      title: '返修待处理',
      value: quoteStats.revision,
      hint: '请尽快按反馈修改交付物',
      icon: RefreshCw,
      tab: 'orders' as ProviderPageId,
    },
    {
      key: 'expired',
      title: '报价已过期',
      value: quoteStats.expired,
      hint: '可重新浏览任务大厅提交新报价',
      icon: Clock,
      tab: 'quotes' as ProviderPageId,
    },
  ];

  return (
    <div className="space-y-6">
      <ProviderPageHeader
        title={`工作台 · ${providerName}`}
        subtitle="发现任务、提交报价、跟进履约与结算。高频操作区采用专业工作台布局，便于快速决策。"
        actions={
          <button type="button" className="provider-btn-workbench flex items-center gap-1" onClick={() => onNavigate('tasks')}>
            进入任务大厅 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {actionCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onNavigate(card.tab)}
              className="provider-section-card text-left hover:border-workbench/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-provider-secondary font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-provider-title font-mono mt-1">{card.value}</p>
                  <p className="text-[11px] text-provider-muted mt-2">{card.hint}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-workbench-light flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-workbench" />
                </div>
              </div>
              <p className="text-xs text-workbench font-medium mt-3 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                去处理 <ArrowRight className="w-3 h-3" />
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('earnings')}
          className="provider-section-card text-left hover:border-workbench/30 transition-colors lg:col-span-2"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-provider-secondary flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> 收益摘要
              </p>
              <p className="text-xs text-provider-muted mt-1">可提现金额</p>
              <p className="text-3xl font-bold text-provider-title font-mono mt-1">
                ¥ {vm.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-provider-muted mt-2">
                累计收益 ¥{vm.accumulatedIncome.toLocaleString()} · 履约中 {vm.activeOrders} 单 · 待验收{' '}
                {vm.pendingReview} 单
              </p>
            </div>
            <span className="text-xs text-workbench font-semibold">收益中心 →</span>
          </div>
        </button>

        <div className="provider-section-card">
          <p className="text-xs font-semibold text-provider-title flex items-center gap-1.5 mb-3">
            <Bell className="w-3.5 h-3.5 text-workbench" /> 规则与公告
          </p>
          <ul className="space-y-2">
            {vm.announcements.map((line) => (
              <li key={line} className="text-[11px] text-provider-secondary leading-relaxed pl-2 border-l-2 border-workbench-light">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-provider-title flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4 text-workbench" /> 推荐任务
            </h2>
            <button type="button" onClick={() => onNavigate('tasks')} className="text-xs text-workbench hover:underline">
              全部任务
            </button>
          </div>
          {recommendedTasks.length === 0 ? (
            <ProviderWorkbenchState
              mode="empty"
              title="暂无推荐任务"
              description="任务大厅会持续更新，建议完善接单偏好以提升匹配度"
              action={
                <button type="button" className="provider-btn-workbench text-sm" onClick={() => onNavigate('tasks')}>
                  浏览任务大厅
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {recommendedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className="w-full provider-section-card flex items-center gap-4 hover:border-workbench/30 transition-all text-left group py-4"
                >
                  <div
                    className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: platformPlaceholder(task.platform) }}
                  >
                    {PLATFORM_SHORT[task.platform] ?? task.platform}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-provider-title truncate group-hover:text-workbench">
                      {task.title}
                    </h3>
                    <p className="text-[11px] text-provider-muted mt-1">
                      {task.brandName}
                      {task.industry ? ` · ${task.industry}` : ''}
                    </p>
                    {task.suggestedMinCents != null && task.suggestedMaxCents != null && (
                      <p className="text-[10px] text-workbench mt-1">
                        建议区间 ¥{(task.suggestedMinCents / 100).toLocaleString()} – ¥
                        {(task.suggestedMaxCents / 100).toLocaleString()}
                      </p>
                    )}
                    {task.matchLabel && (
                      <p className="text-[10px] text-provider-muted mt-1">
                        {task.matchLabel}
                        {task.matchScore != null ? ` · 匹配 ${task.matchScore}%` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-workbench">提交报价</span>
                    <p className="text-[10px] text-provider-muted mt-1">{formatTaskPublishedAt(task.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="provider-section-card space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-provider-title">今日待办</h2>
            <button type="button" onClick={() => onNavigate('orders')} className="text-xs text-workbench">
              全部订单
            </button>
          </div>
          {dashboard.todos.length === 0 && activeOrders.length === 0 ? (
            <p className="text-xs text-provider-muted py-6 text-center">暂无待办，可去任务大厅发现新机会</p>
          ) : (
            <div className="space-y-2">
              {dashboard.todos.map((t) => (
                <div key={t.type} className="text-xs p-2.5 rounded-lg bg-workbench-light/60 text-provider-body border border-workbench-light">
                  {t.label}
                </div>
              ))}
              {activeOrders.slice(0, 4).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onSelectOrder(order.id)}
                  className="w-full flex gap-3 hover:bg-provider-hover/50 p-2 rounded-lg text-left transition-all border border-transparent hover:border-provider-subtle"
                >
                  <div className="w-8 h-8 rounded bg-workbench flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {PLATFORM_SHORT[order.platform] ?? order.platform?.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-provider-title truncate">{order.title}</div>
                    <div className="text-[10px] text-provider-muted mt-0.5">
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="provider-section-card space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-provider-title flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-workbench" /> 最新报价动态
          </h2>
          <button type="button" onClick={() => onNavigate('quotes')} className="text-xs text-workbench">
            全部报价
          </button>
        </div>
        {recentQuotes.length === 0 ? (
          <p className="text-xs text-provider-muted py-4 text-center">暂无报价记录，去任务大厅提交首单报价</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentQuotes.map((q) => {
              const expired =
                q.status === 'pending' &&
                q.quoteExpiresAt &&
                new Date(q.quoteExpiresAt).getTime() < Date.now();
              const statusLabel =
                q.status === 'accepted'
                  ? '已中标'
                  : q.status === 'rejected'
                    ? '未中标'
                    : expired
                      ? '已过期'
                      : '待确认';
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onNavigate('quotes')}
                  className="text-left p-2.5 rounded-lg border border-provider-subtle hover:border-workbench/30 transition-colors"
                >
                  <p className="text-xs font-semibold text-provider-title truncate">{q.order?.title ?? '报价任务'}</p>
                  <p className="text-[10px] text-provider-muted mt-0.5">
                    {q.order?.brandName ?? '—'} · {statusLabel}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
