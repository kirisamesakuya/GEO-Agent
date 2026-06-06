/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, TransactionRecord } from '../types';
import {
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Search,
  X,
  Sparkles,
  DollarSign
} from 'lucide-react';

interface EarningViewProps {
  state: AppState;
  onWithdrawFunds: (amount: number) => void;
}

export default function EarningView({ state, onWithdrawFunds }: EarningViewProps) {
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawVal, setWithdrawVal] = useState('');
  const [bankName, setBankName] = useState('支付宝交易账户');
  const [activeDateTab, setActiveDateTab] = useState<'7d' | '30d' | 'all'>('7d');
  const [localSearch, setLocalSearch] = useState('');

  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(withdrawVal);
    if (isNaN(cash) || cash <= 0 || cash > state.wallet.extractable) return;

    onWithdrawFunds(cash);
    setShowWithdrawForm(false);
    setWithdrawVal('');
    
    // Success flash alert
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 3050);
  };

  // Filter transaction records
  const filteredTx = state.transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(localSearch.toLowerCase()) ||
      (tx.brand || '').toLowerCase().includes(localSearch.toLowerCase());
    return matchesSearch;
  });

  // Polyline coordinates based on date tabs
  const graphDataPoints =
    activeDateTab === '7d'
      ? ['40,80', '120,60', '200,90', '280,30', '360,65', '440,20', '520,10']
      : activeDateTab === '30d'
      ? ['40,90', '120,40', '200,75', '280,45', '360,35', '440,15', '520,30']
      : ['40,60', '120,70', '200,50', '280,60', '360,40', '440,30', '520,25'];

  return (
    <div className="space-y-6 relative">
      {/* Success Alert */}
      {withdrawSuccess && (
        <div className="bg-green-100 border border-green-200 text-green-800 text-xs py-3 px-4 rounded-xl flex justify-between items-center z-50 shadow-md">
          <span className="font-semibold flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> 提现申请已受理！资金融通划转将在 1 个工作日内抵达。
          </span>
          <button onClick={() => setWithdrawSuccess(false)} className="text-green-600 hover:text-green-905">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-xl font-bold text-gray-900">收益中心</h1>
          <p className="text-xs text-gray-400">管理您的数字广告及推荐契合度带动的收益</p>
        </div>
      </div>

      {/* Wallet Accounts overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-brand-50 border border-brand-light p-6 rounded-2xl shadow-sm relative overflow-hidden flex justify-between items-start">
          <div className="text-left">
            <p className="text-xs text-gray-500 mb-1 font-medium">可提现金额</p>
            <p className="text-2xl font-black text-gray-900 font-mono mb-2">
              ¥ {state.wallet.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
            <div className="text-[10px] text-gray-400 font-medium">
              冻结锁定金额: ¥ {(state.wallet.frozen || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawForm(true)}
            disabled={state.wallet.extractable <= 0}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-brand/10 cursor-pointer ${
              state.wallet.extractable <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-brand text-white hover:bg-brand-hover hover:translate-x-0.5'
            }`}
          >
            去提现
          </button>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm text-left">
          <p className="text-xs text-gray-400 mb-1 font-medium">累计结算收入</p>
          <p className="text-2xl font-black text-gray-950 font-mono mb-2">
            ¥ {state.wallet.accumulatedIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">包含 24 笔品牌合作佣金</p>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm text-left flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium">平台扣缴税额 / 费率</p>
            <p className="text-2xl font-black text-gray-950 font-mono mb-2">8.0%</p>
            <p className="text-[10px] text-gray-400 font-medium">
              包含个税依法预扣预缴及技术维护服务费
            </p>
          </div>
          <HelpCircle className="w-4.5 h-4.5 text-gray-405 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      {/* SVG Interactive Earnings Chart representation */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-sm font-bold text-gray-901">收益波动走势</h2>
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl">
            {[
              { id: '7d', label: '近 7 天' },
              { id: '30d', label: '近 30 天' },
              { id: 'all', label: '完整季度' }
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDateTab(d.id as any)}
                className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeDateTab === d.id ? 'bg-white text-brand shadow-sm font-black' : 'text-gray-400 hover:text-gray-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Line Path SVG container */}
        <div className="h-56 relative w-full pt-4">
          <svg className="w-full h-full text-brand shrink-0" viewBox="0 0 540 120" preserveAspectRatio="none">
            {/* Grid references */}
            <line x1="40" y1="10" x2="520" y2="10" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="40" y1="60" x2="520" y2="60" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="40" y1="110" x2="520" y2="110" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4,4" />

            {/* Gradient fill */}
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff2442" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ff2442" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area block under path */}
            <path
              d={`M40,110 L${graphDataPoints.join(' L')} L520,110 Z`}
              fill="url(#chart-grad)"
              className="transition-all duration-501"
            />

            {/* Glowing line path */}
            <polyline
              fill="none"
              stroke="#ff2442"
              strokeWidth="2.5"
              strokeLinecap="round"
              points={graphDataPoints.join(' ')}
              className="transition-all duration-501"
            />

            {/* Coordinate dots */}
            {graphDataPoints.map((pt, index) => {
              const [x, y] = pt.split(',');
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  className="fill-brand stroke-white stroke-2 hover:r-6 transition-all cursor-pointer"
                />
              );
            })}
          </svg>

          {/* X axis descriptions below chart */}
          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold px-10 mt-1 font-mono">
            <span>{activeDateTab === '7d' ? '周一' : '月初01'}</span>
            <span>{activeDateTab === '7d' ? '周二' : '05号'}</span>
            <span>{activeDateTab === '7d' ? '周三' : '10号'}</span>
            <span>{activeDateTab === '7d' ? '周四' : '15号'}</span>
            <span>{activeDateTab === '7d' ? '周五' : '20号'}</span>
            <span>{activeDateTab === '7d' ? '周六' : '25号'}</span>
            <span>{activeDateTab === '7d' ? '周日' : '月末30'}</span>
          </div>
        </div>
      </section>

      {/* Transactions Details list */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 gap-4">
          <h2 className="text-sm font-bold text-gray-901">收支交易明细</h2>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border-0 rounded-lg text-xs outline-none focus:bg-white focus:border focus:border-brand/30 transition-all font-medium"
              placeholder="搜索品牌或任务..."
            />
          </div>
        </div>

        <div className="space-y-3.5">
          {filteredTx.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">没有查找到符合条件的流水纪录</div>
          ) : (
            filteredTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 border border-gray-50 hover:bg-gray-50/40 rounded-xl transition-colors text-left"
              >
                <div className="flex gap-3.5 items-center">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    tx.status === 'success' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'
                  }`}>
                    {tx.type === 'withdrawal' ? '提现' : '收益'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-950 mb-1">{tx.title}</h4>
                    <p className="text-[10px] text-gray-400">品牌: {tx.brand || '平台系统'} | 订单编号: {tx.id}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-black font-mono ${tx.type === 'withdrawal' ? 'text-gray-750' : 'text-brand'}`}>
                    {tx.type === 'withdrawal' ? '-' : '+'} ¥ {tx.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 justify-end font-medium">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                      tx.status === 'success' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    {tx.status === 'success' ? '已到账' : '处理中'} | {tx.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Withdraw overlay modal wizard step */}
      {showWithdrawForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative border">
            <button
              onClick={() => setShowWithdrawForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-950 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-brand" /> 结存资金安全提现
            </h2>
            <p className="text-xs text-gray-400 mb-5">请输入划拨提现数值，审核后直接支付到绑定的账户。</p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">提现目标支付渠道</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 border border-gray-205 rounded-xl text-xs outline-none focus:border-brand bg-white"
                >
                  <option value="支付宝交易账户">支付宝 (小北 nverji***@gmail.com)</option>
                  <option value="招商银行网银账户">招商银行储蓄卡账户 (首选结汇卡)</option>
                  <option value="微信结算账户">微信收发资金通道</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">提取具体数额</label>
                  <button
                    type="button"
                    onClick={() => setWithdrawVal(state.wallet.extractable.toString())}
                    className="text-[10px] text-brand hover:underline font-bold cursor-pointer"
                  >
                    全部提取
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-900 text-sm font-mono">¥</span>
                  <input
                    type="number"
                    required
                    max={state.wallet.extractable}
                    min="1"
                    step="0.01"
                    value={withdrawVal}
                    onChange={(e) => setWithdrawVal(e.target.value)}
                    className="w-full pl-8 pr-12 py-3 border border-gray-205 rounded-xl text-sm font-black font-mono focus:border-brand outline-none text-gray-800"
                    placeholder="请输入提取金额"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                    元
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  当前可提现上限为 ¥ {state.wallet.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed border mt-1">
                * 提现说明：每日单卡无手续费提现额度为10万，转账预计 1 个工作日内即可正式落地到账。
              </div>

              <div className="pt-2.5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  放弃
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-sm hover:translate-x-0.5"
                >
                  确认划账提现
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
