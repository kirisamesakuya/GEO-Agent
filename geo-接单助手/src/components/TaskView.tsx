/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AppState, DeveloperTask, ConnectedAccount, CreatorOrder } from '../types';
import {
  ShieldCheck,
  Coins,
  Handshake,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  FileImage,
  Images,
  FolderArchive,
  Calendar,
  Bot,
  Star,
  Search,
  CheckCircle
} from 'lucide-react';

interface TaskViewProps {
  state: AppState;
  onApplyTask: (taskId: string, accountId: string, deliveryDate: string, notes: string) => void;
  onBackToHall: () => void;
  onSelectTask: (taskId: string) => void;
}

export default function TaskView({ state, onApplyTask, onBackToHall, onSelectTask }: TaskViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState('1');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('2024-05-20');
  const [appNotes, setAppNotes] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // Selected Active Task
  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);

  // If in main list hall
  if (!activeTask) {
    const filteredTasks = state.tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(localSearch.toLowerCase()) ||
        t.brand.toLowerCase().includes(localSearch.toLowerCase()) ||
        state.searchQuery.toLowerCase().includes(t.title.toLowerCase());
      return matchSearch;
    });

    return (
      <div className="space-y-6">
        {/* Hall Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">任务大厅</h1>
            <p className="text-xs text-gray-400">甄选超契合的高质量品牌合作邀约</p>
          </div>
          {/* Inner Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs outline-none focus:border-brand/50 transition-colors"
              placeholder="搜索本页合作任务..."
            />
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTasks.map((t) => {
            const hasApplied = state.orders.some((o) => o.taskId === t.id);
            return (
              <div
                key={t.id}
                onClick={() => onSelectTask(t.id)}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-brand/45 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group h-[220px]"
              >
                <div>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 relative">
                      <img src={t.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={t.title} />
                      <span className="absolute top-1 left-1 bg-brand text-white text-[8px] font-bold px-1 rounded-sm leading-tight">
                        {t.platform === 'xiaohongshu' ? '小红书' : t.platform === 'douyin' ? '抖音' : '知乎'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-950 truncate group-hover:text-brand transition-colors mb-0.5">
                        {t.title}
                      </h3>
                      <p className="text-xs text-gray-400">品牌: {t.brand}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {t.tags.map((tag) => (
                          <span key={tag} className="bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded text-[9px] font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50 pt-4 flex items-end justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">合作预算</span>
                    <span className="text-lg font-black text-brand">¥{t.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">截止日期</span>
                      <span className="text-xs font-semibold text-gray-800">{t.deadline}</span>
                    </div>
                    <button
                      className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                        hasApplied
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-brand text-white hover:bg-brand-hover shadow-sm hover:translate-x-0.5'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask(t.id);
                      }}
                    >
                      {hasApplied ? '已申请合作' : '立即合作'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Composed application math parameters
  const platformFeeFactor = 0.08; // 8% fee
  const estimatedEarnings = activeTask.budget * (1 - platformFeeFactor);
  const platformFee = activeTask.budget * platformFeeFactor;

  // Selected account detail
  const currentAccount = state.accounts.find((a) => a.id === selectedAccountId) || state.accounts[0];

  const handleApply = () => {
    onApplyTask(activeTask.id, selectedAccountId, deliveryDate, appNotes);
  };

  return (
    <div className="space-y-6 relative">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center text-xs text-gray-400 font-medium">
          <button onClick={onBackToHall} className="hover:text-gray-900 cursor-pointer">
            任务大厅
          </button>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-905">任务详情</span>
        </nav>
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-colors shadow-sm cursor-pointer ${
            isFavorited
              ? 'bg-amber-50 border-amber-200 text-amber-600'
              : 'bg-white border-gray-200 text-gray-650 hover:bg-gray-55'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
          <span>{isFavorited ? '已收藏' : '收藏'}</span>
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column: Task Details */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Main Task Description Card */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Cover Image */}
              <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden shrink-0 relative bg-gray-55 border border-gray-100">
                <img alt="Task Cover" className="w-full h-full object-cover" src={activeTask.coverImage} />
                <div className="absolute top-2.5 left-2.5 bg-brand text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-sm leading-tight">
                  <Star className="w-3 h-3 fill-current" /> 小红书
                </div>
              </div>

              {/* Cover Details */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">
                      {activeTask.title}
                    </h1>
                    <div className="text-right">
                      <div className="text-xl font-black text-brand">¥{activeTask.budget.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium">预算</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-xs text-gray-400">品牌：</span>
                    <span className="text-xs font-semibold text-gray-800">{activeTask.brand}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-current" />
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      实人认证品牌
                    </span>
                  </div>

                  <div className="flex gap-2 mb-6">
                    {activeTask.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end border-t border-gray-100 pt-4">
                  {/* Platform assurances */}
                  <div className="flex gap-4 text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span>平台托管</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-green-500" />
                      <span>已验资</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Handshake className="w-4 h-4 text-gray-400" />
                      <span>担保交易</span>
                    </div>
                  </div>

                  {/* Deadline & match stats */}
                  <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-850">{activeTask.deadline}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">截止时间</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 match-ring flex items-center justify-center p-[2px]">
                          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-900">{activeTask.matchRate}%</span>
                          </div>
                        </div>
                        <span className="text-[8px] text-gray-400 mt-1">匹配度</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">
                          {activeTask.applicantsCount} <span className="text-[10px] font-normal text-gray-400">人已申请</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Requirements Card */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">任务要求</h2>
            <ul className="space-y-3">
              {[
                '真实探店体验，内容需原创且首发小红书',
                '图片清晰精美，构图精良，突出网红氛围感、标志性甜品及店铺招牌',
                '文章字数不少于 300 字，配图不少于 8 张，需要有合集推荐思维',
                '避免过度夸大宣传，符合法律及小红书社区内容运营规范'
              ].map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-650 leading-relaxed">
                  <CheckCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Deliverables Card */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">交付内容</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-brand-light/30 border border-brand-light rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white text-brand rounded shadow-sm flex items-center justify-center shrink-0">
                  <FileImage className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-950">图文笔记</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">1 篇</div>
                </div>
              </div>

              <div className="bg-brand-light/30 border border-brand-light rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white text-brand rounded shadow-sm flex items-center justify-center shrink-0">
                  <Images className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-950">高清图片</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">≥ 8 张</div>
                </div>
              </div>

              <div className="bg-brand-light/30 border border-brand-light rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white text-brand rounded shadow-sm flex items-center justify-center shrink-0">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-950">原图文件</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">打包压缩包</div>
                </div>
              </div>
            </div>
          </section>

          {/* Brand Assets */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-900">品牌素材</h2>
              <span className="text-xs text-gray-450 flex items-center gap-0.5">
                查看更多素材 <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBEVanY6j2t37on_wYAisvOLqBoNYVyetzdK6uvRu_qQujWFjvcSvxWnYCePA28Gj-jtSWKlg1hyYs0TviXWxnmyhlQAhCIkXM2OrGB2Ljkg1ysOMi3w44VUdaU5heQh9UBmoZiAvvM8ygxBoiLHD7CuPJpeSXtgLxcGU4RQUamUsD_3Atg5ZBqtEvZkXPhyFI9OLFwxuKM8gAXjyqAh1zruu3MjNPEFSpAgglxzd8xy_gJX8FVFibkHco2b3s2qR882UjJ95JBb6__',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCCka86P_yXCB4HL5JD3TyeCO0rZvDRZB9rLO0kgjeAYAfuuhdCl_lHBwQlawgd4R_nlCapeO8q-WICugUNKVkaYJU40N9Jn6ePZ72maRpcstLS2GejDTqx3d4tP7OVrZJAJCkCjdNZfLphVW_nK4QfU3LpJun2O7PK1r0zwCaG6cw5JwzPaZ6PkQ8W_PjySfOF4glYG6K655894lTaDnQQ7iuKY22vykx8-lu6yrH5T9ojbG9NdNd79KHX44L-9TosyHwm8GGWpH3a',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCllLtyjaefzuGiYIHo6MXuVilqngULre62DI2BXwoEajoBQfckiwZ7zGrni-S6kyCHYVUgTzhiQgpD7G9wFwHJ0bpSsdg4qPXLA0wMPhjwLqibnhfKC0wue-6KULsYfXTaZIZ6WeCb3mmbxecfUjHlNUJ-56oH8l4HM4bsvt5GbKGX0_XAqLHD5k5Jlcz1Z6lpTXUOQQE0sjnhWtGy1cWLUfsJlH-HI83TBeeRTiucGyxPzjTRPCNQB4okxoyEZ_ro9RrKSak7jQuR'
              ].map((asset, index) => (
                <div key={index} className="aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm-light">
                  <img
                    alt={`Brand Asset ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    src={asset}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Application controls */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-6">
            <h2 className="text-base font-bold text-gray-900 mb-6">申请接单</h2>
            <div className="space-y-5">
              {/* Connected Account Dropdown selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">选择资源账号</label>
                <div className="relative">
                  <div
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center justify-between w-full p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-brand transition-colors bg-white shadow-sm-light"
                  >
                    <div className="flex items-center gap-3">
                      {currentAccount?.avatar ? (
                        <img
                          alt="Account Avatar"
                          className="w-8 h-8 rounded-full object-cover"
                          src={currentAccount.avatar}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
                          {currentAccount?.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="text-xs font-bold text-gray-900">
                          {currentAccount?.name}{' '}
                          <span className="text-[10px] text-gray-400 font-normal">
                            ({currentAccount?.platform === 'xiaohongshu' ? '小红书' : '其他平台'})
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-450 mt-0.5">
                          粉丝 {currentAccount?.followers} | 账号评分 {currentAccount?.score}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-450" />
                  </div>

                  {/* Dropdown Options */}
                  {showAccountDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-1.5 space-y-1">
                      {state.accounts.map((acc) => (
                        <div
                          key={acc.id}
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            setShowAccountDropdown(false);
                          }}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedAccountId === acc.id ? 'bg-brand-light/40 text-brand' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px] text-gray-700 overflow-hidden shrink-0">
                            {acc.avatar ? (
                              <img src={acc.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              acc.name.charAt(0)
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-gray-900">{acc.name}</p>
                            <p className="text-[9px] text-gray-400">
                              粉丝 {acc.followers} | {acc.platform === 'xiaohongshu' ? '小红书' : acc.platform === 'douyin' ? '抖音' : '知乎'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">预计交付日期</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-brand transition-colors cursor-pointer font-medium"
                  />
                </div>
              </div>

              {/* Cover text area */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  申请说明 <span className="text-gray-400 font-normal">(选填)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={appNotes}
                    onChange={(e) => setAppNotes(e.target.value.slice(0, 200))}
                    className="block w-full p-3 border border-gray-200 rounded-xl text-xs text-gray-905 outline-none focus:border-brand transition-colors resize-none h-24"
                    placeholder="详尽介绍你的拍摄创作思路，以往咖啡探店优秀文章案例、或您的账号受众优势..."
                  />
                  <div className="absolute bottom-2.5 right-3 text-[10px] text-gray-400 font-medium">
                    {appNotes.length}/200
                  </div>
                </div>
              </div>

              {/* Financial breakdowns */}
              <div className="bg-gray-50 rounded-xl p-4 mt-2">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">合作收益预估</div>
                    <div className="text-lg font-black text-gray-950 font-mono">
                      ¥ {estimatedEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 mb-1">平台技术服务费</div>
                    <div className="text-xs font-bold text-gray-700 font-mono">
                      ¥ {platformFee.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-gray-400 border-t border-gray-200/50 pt-2 mt-2 leading-relaxed">
                  * 收益计算公式：品牌总预算扣除 8% 平台结算/运维服务费。
                </div>
              </div>

              {/* Submit triggers */}
              <div>
                <button
                  onClick={handleApply}
                  type="button"
                  className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-brand/10 active:scale-98 cursor-pointer hover:translate-x-0.5"
                >
                  提交接单申请
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2.5">
                  提交后可在「我的订单」或主页实时跟进进度
                </p>
              </div>
            </div>
          </section>

          {/* AI Advisor Banner */}
          <section className="bg-brand-light/35 border border-brand-light rounded-2xl p-4 flex flex-col justify-center shadow-sm-light">
            <div className="flex items-center gap-2 mb-1.5">
              <Bot className="w-5 h-5 text-brand animate-pulse" />
              <span className="font-bold text-gray-900 text-xs">AI 接单伙伴推荐</span>
            </div>
            <p className="text-[10px] text-gray-650 leading-relaxed mb-1.5">
              您的账号「{currentAccount?.name}」与该探店需求匹配率高达 <span className="font-bold text-brand">95%</span>：本地美食探店粉丝占比近 72%，创作风格主打温馨治愈，极易契合咖啡品牌调性。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
