/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, DeveloperTask, CreatorOrder } from '../types';
import { ArrowRight, Wallet, Users, LayoutDashboard, Clock, CheckCircle } from 'lucide-react';

interface HomeViewProps {
  state: AppState;
  onNavigateToTab: (tab: any) => void;
  onSelectTask: (taskId: string) => void;
  onSelectOrder: (orderId: string) => void;
}

export default function HomeView({ state, onNavigateToTab, onSelectTask, onSelectOrder }: HomeViewProps) {
  // Filter active/hot tasks
  const recommendedTasks = state.tasks.slice(0, 3);

  // Active items
  const activeOrders = state.orders.filter(o => o.status === 'creating' || o.status === 'checking');

  // Fast calculations
  const boundAccountsCount = state.accounts.length;
  const activeJobsCount = activeOrders.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-xl font-bold text-gray-900 mb-1">欢迎回来，媒体人 小北</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            今天又有 <span className="text-brand font-bold">5</span> 个契合你内容风格的新任务，快去任务大厅瞧一瞧。
          </p>
        </div>
        <button
          onClick={() => onNavigateToTab('tasks')}
          className="bg-brand hover:bg-brand-hover text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-md shadow-brand/10 transition-all flex items-center gap-1 cursor-pointer hover:translate-x-0.5 active:scale-98"
        >
          探索任务大厅 <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigateToTab('earnings')}
          className="bg-brand-50 border border-brand-light rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-[120px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-medium">可提现金额</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">
              ¥ {state.wallet.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
            <span>累计收益: ¥ {state.wallet.accumulatedIncome.toLocaleString()}</span>
            <span className="text-brand flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-semibold">
              管理账户 <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateToTab('orders')}
          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-medium">进行中的合作</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">
              {activeJobsCount} <span className="text-xs font-normal text-gray-400">个订单</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
            <span>待验收订单: {state.orders.filter(o => o.status === 'checking').length} 个</span>
            <span className="text-brand flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-semibold">
              我的订单 <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateToTab('accounts')}
          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-medium">绑定的资源媒体</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">
              {boundAccountsCount} <span className="text-xs font-normal text-gray-400">个平台账号</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
            <span>可接单账号: {state.accounts.filter(a => a.canAccept).length} 个</span>
            <span className="text-brand flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-semibold">
              去管理 <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recommended Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4 text-brand" /> 推荐高匹配任务
            </h2>
            <button
              onClick={() => onNavigateToTab('tasks')}
              className="text-xs text-gray-400 hover:text-brand transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              全部任务 <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5">
            {recommendedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4 hover:border-brand/40 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative bg-gray-50">
                  <img src={task.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={task.title} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-brand transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">品牌：{task.brand}</p>
                  <div className="flex gap-1.5 mt-2">
                    {task.tags.map((tag) => (
                      <span key={tag} className="bg-gray-105 text-gray-500 px-2 py-0.5 rounded text-[9px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-brand">¥{task.budget.toLocaleString()}</span>
                  <p className="text-[10px] text-gray-400 mt-1">配对率 {task.matchRate}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Today's To-dos (今日待办) widget */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand animate-pulse" /> 今日待办
            </h2>
            <button
              onClick={() => onNavigateToTab('orders')}
              className="text-xs text-gray-400 hover:text-brand transition-colors cursor-pointer"
            >
              查看全部
            </button>
          </div>

          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">太棒了！今日没有需要赶工的订单。</p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const isUrgent = order.title.includes('成都');
                return (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                    className="flex gap-3 hover:bg-gray-50/50 p-2 rounded-xl cursor-pointer group transition-all"
                  >
                    <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                      {order.platform === 'xiaohongshu' ? '小红书' : order.platform === 'douyin' ? '抖音' : '知乎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-800 truncate group-hover:text-brand transition-colors">
                        {order.title}
                      </div>
                      <div className="flex justify-between items-center mt-1 text-[10px] text-gray-450">
                        <span>提交截止 {order.deadline.includes('23:59') ? '23:59' : '18:00'}</span>
                        <span className="text-brand font-medium">
                          {isUrgent ? '剩余 8 小时' : '剩余 2 天'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
