import { useEffect, useState } from 'react';
import { ArrowRight, LayoutDashboard, Clock, CheckCircle } from 'lucide-react';
import type { ProviderPageId } from '../types';
import { ORDER_STATUS_LABEL, PLATFORM_SHORT, matchesSearch, platformPlaceholder, formatMarketplaceSlots, formatTaskPublishedAt } from '../lib/provider-ui';
import { MOCK_PROVIDER_WALLET, hasRealEarningsData } from '../lib/provider-mock-earnings';

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
  const [dashboard, setDashboard] = useState<{
    summary: {
      openTasks: number;
      myOrders: number;
      pendingDelivery: number;
      pendingReview: number;
    };
    todos: Array<{ type: string; label: string }>;
    recentOrders: Array<{ id: string; title: string; status: string; platform: string; budget: number; brandName?: string }>;
  } | null>(null);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; brandName: string; platform: string; budget: number; matchScore?: number; industry?: string; claimedCount?: number; availableSlots?: number; slotTotal?: number; createdAt?: string }>>([]);
  const [wallet, setWallet] = useState({ extractable: 0, accumulatedIncome: 0 });
  const [platformCount, setPlatformCount] = useState(0);

  useEffect(() => {
    fetch(`/api/provider/dashboard?providerId=${providerId}`)
      .then((r) => r.json())
      .then(setDashboard);
    fetch(`/api/provider/task-marketplace?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setTasks((d.tasks ?? []).slice(0, 3)));
    fetch(`/api/provider/earnings?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (hasRealEarningsData(d.wallet, d.transactions)) {
          setWallet(d.wallet);
        } else {
          setWallet({
            extractable: MOCK_PROVIDER_WALLET.extractable,
            accumulatedIncome: MOCK_PROVIDER_WALLET.accumulatedIncome,
          });
        }
      })
      .catch(() => {
        setWallet({
          extractable: MOCK_PROVIDER_WALLET.extractable,
          accumulatedIncome: MOCK_PROVIDER_WALLET.accumulatedIncome,
        });
      });
    fetch(`/api/provider/profile?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        try {
          const plats = JSON.parse(d.provider?.platforms ?? '[]');
          setPlatformCount(Array.isArray(plats) ? plats.length : 0);
        } catch {
          setPlatformCount(0);
        }
      });
  }, [providerId]);

  if (!dashboard) {
    return <p className="text-sm text-provider-muted py-8">加载中…</p>;
  }

  const activeOrders = dashboard.recentOrders.filter(
    (o) => o.status === 'in_progress' || o.status === 'pending_review' || o.status === 'revision'
  );
  const recommendedTasks = tasks.filter(
    (t) =>
      matchesSearch(`${t.title} ${t.brandName}`, searchQuery)
  );

  return (
    <div className="space-y-6">
      <section className="provider-card rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-provider-title mb-1">欢迎回来，{providerName}</h1>
          <p className="text-xs text-provider-secondary leading-relaxed">
            今天又有 <span className="text-brand font-bold">{dashboard.summary.openTasks}</span> 个可接任务，快去任务大厅瞧一瞧。
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="provider-btn-primary flex items-center gap-1 shadow-md"
        >
          探索任务大厅 <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => onNavigate('earnings')}
          className="bg-brand-50 border border-brand-light rounded-2xl p-5 text-left h-[120px] hover:shadow-md transition-all group"
        >
          <span className="text-xs text-provider-secondary block mb-1 font-medium">可提现金额</span>
          <span className="text-2xl font-bold text-provider-title font-mono">
            ¥ {wallet.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex justify-between text-[11px] text-provider-muted mt-2">
            <span>累计收益: ¥ {wallet.accumulatedIncome.toLocaleString()}</span>
            <span className="text-brand font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              收益中心 <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="provider-card rounded-2xl p-5 shadow-sm text-left h-[120px] hover:shadow-md transition-all group"
        >
          <span className="text-xs text-provider-secondary block mb-1 font-medium">进行中的合作</span>
          <span className="text-2xl font-bold text-provider-title font-mono">
            {activeOrders.length} <span className="text-xs font-normal text-provider-muted">个订单</span>
          </span>
          <div className="flex justify-between text-[11px] text-provider-muted mt-2">
            <span>待交付: {dashboard.summary.pendingDelivery} · 待验收: {dashboard.summary.pendingReview}</span>
            <span className="text-brand font-semibold flex items-center gap-0.5">
              我的订单 <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="provider-card rounded-2xl p-5 shadow-sm text-left h-[120px] hover:shadow-md transition-all group"
        >
          <span className="text-xs text-provider-secondary block mb-1 font-medium">个人中心</span>
          <span className="text-2xl font-bold text-provider-title font-mono">
            {platformCount} <span className="text-xs font-normal text-provider-muted">个平台偏好</span>
          </span>
          <div className="flex justify-between text-[11px] text-provider-muted mt-2">
            <span>维护提现账户与接单偏好</span>
            <span className="text-brand font-semibold flex items-center gap-0.5">
              去设置 <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-provider-title flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4 text-brand" /> 推荐高匹配任务
            </h2>
            <button type="button" onClick={() => onNavigate('tasks')} className="text-xs text-provider-muted hover:text-brand flex items-center gap-0.5">
              全部任务 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3.5">
            {recommendedTasks.length === 0 ? (
              <p className="text-xs text-provider-muted py-4">暂无推荐任务</p>
            ) : (
              recommendedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className="w-full provider-card p-4 rounded-xl flex items-center gap-4 hover:border-brand/40 hover:shadow-sm transition-all text-left group"
                >
                  <div
                    className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: platformPlaceholder(task.platform) }}
                  >
                    {PLATFORM_SHORT[task.platform] ?? task.platform}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-provider-title truncate group-hover:text-brand">{task.title}</h3>
                    <p className="text-[11px] text-provider-muted mt-1">品牌：{task.brandName}</p>
                    <p className="text-[10px] text-provider-muted">{formatTaskPublishedAt(task.createdAt)}</p>
                    {task.industry && (
                      <span className="inline-block mt-2 bg-provider-hover text-provider-secondary px-2 py-0.5 rounded text-[9px]">{task.industry}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-brand">¥{task.budget.toLocaleString()}</span>
                    {task.matchScore != null && (
                      <p className="text-[10px] text-provider-muted mt-1">匹配 {task.matchScore}%</p>
                    )}
                    <p className="text-[10px] text-provider-muted mt-0.5">
                      {formatMarketplaceSlots(task).claimedText} · {formatMarketplaceSlots(task).availableText}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="provider-card rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-provider-title flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand" /> 今日待办
            </h2>
            <button type="button" onClick={() => onNavigate('orders')} className="text-xs text-provider-muted hover:text-brand">
              查看全部
            </button>
          </div>
          {dashboard.todos.length === 0 && activeOrders.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-provider-muted">太棒了！今日没有需要赶工的订单。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.todos.map((t) => (
                <div key={t.type} className="text-xs p-2 rounded-lg bg-brand-light/30 text-provider-body">
                  {t.label}
                </div>
              ))}
              {activeOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onSelectOrder(order.id)}
                  className="w-full flex gap-3 hover:bg-provider-hover/50 p-2 rounded-xl text-left transition-all"
                >
                  <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {PLATFORM_SHORT[order.platform] ?? order.platform?.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-provider-title truncate">{order.title}</div>
                    <div className="text-[10px] text-provider-muted mt-1">
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
