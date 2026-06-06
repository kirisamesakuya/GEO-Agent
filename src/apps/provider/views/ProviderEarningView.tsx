import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import type { EarningsTransaction, WalletSummary } from '../types';
import { PLATFORM_SHORT } from '../lib/provider-ui';
import {
  MOCK_PROVIDER_TRANSACTIONS,
  MOCK_PROVIDER_WALLET,
  hasRealEarningsData,
} from '../lib/provider-mock-earnings';

interface Props {
  providerId: string;
}

type DateTab = '7d' | '30d' | 'all';

const CHART_POINTS: Record<DateTab, string[]> = {
  '7d': ['40,80', '120,60', '200,90', '280,30', '360,65', '440,20', '520,10'],
  '30d': ['40,90', '120,40', '200,75', '280,45', '360,35', '440,15', '520,30'],
  all: ['40,60', '120,70', '200,50', '280,60', '360,40', '440,30', '520,25'],
};

function formatTxTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function txStatusLabel(tx: EarningsTransaction): string {
  if (tx.type === 'withdrawal') return tx.status === 'success' ? '已到账' : '处理中';
  return tx.status === 'settled' ? '已结算' : '待结算';
}

export default function ProviderEarningView({ providerId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary>(MOCK_PROVIDER_WALLET);
  const [transactions, setTransactions] = useState<EarningsTransaction[]>(MOCK_PROVIDER_TRANSACTIONS);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('支付宝交易账户');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<DateTab>('7d');
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/provider/earnings?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const apiWallet = d.wallet as WalletSummary | undefined;
        const apiTx = (d.transactions ?? []) as EarningsTransaction[];
        if (hasRealEarningsData(apiWallet, apiTx) && apiWallet) {
          setWallet(apiWallet);
          setTransactions(apiTx);
          setIsDemo(false);
        } else {
          setWallet(MOCK_PROVIDER_WALLET);
          setTransactions(MOCK_PROVIDER_TRANSACTIONS);
          setIsDemo(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWallet(MOCK_PROVIDER_WALLET);
          setTransactions(MOCK_PROVIDER_TRANSACTIONS);
          setIsDemo(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const filteredTx = transactions.filter((tx) => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      tx.title.toLowerCase().includes(q) ||
      (tx.brand ?? '').toLowerCase().includes(q) ||
      (tx.orderId ?? '').toLowerCase().includes(q)
    );
  });

  const graphDataPoints = CHART_POINTS[activeDateTab];
  const settledCount = transactions.filter((t) => t.type === 'income' && t.status === 'settled').length;

  const handleWithdraw = (e: FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(withdrawAmount);
    if (Number.isNaN(cash) || cash <= 0 || cash > wallet.extractable) return;
    if (isDemo) {
      toast('演示数据：提现功能即将开放，请联系平台运营', 'info');
      setShowWithdraw(false);
      return;
    }
    toast('提现申请已提交，预计 1 个工作日内到账', 'success');
    setShowWithdraw(false);
    setWithdrawAmount('');
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 3000);
  };

  if (loading) {
    return <p className="text-sm text-gray-400 py-8">加载中…</p>;
  }

  return (
    <div className="space-y-6 relative">
      {isDemo && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs py-2.5 px-4 rounded-xl">
          当前为演示数据（参考接单助手样式）。完成订单并结算后，将自动切换为真实收益。
        </div>
      )}

      {withdrawSuccess && (
        <div className="bg-green-100 border border-green-200 text-green-800 text-xs py-3 px-4 rounded-xl flex justify-between items-center shadow-md">
          <span className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            提现申请已受理，预计 1 个工作日内到账。
          </span>
          <button type="button" onClick={() => setWithdrawSuccess(false)} className="text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900">收益中心</h1>
        <p className="text-xs text-gray-400">管理合作结算收益与提现</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-brand-50 border border-brand-light p-6 rounded-2xl shadow-sm relative overflow-hidden flex justify-between items-start">
          <div className="text-left">
            <p className="text-xs text-gray-500 mb-1 font-medium">可提现金额</p>
            <p className="text-2xl font-black text-gray-900 font-mono mb-2">
              ¥ {wallet.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
            <div className="text-[10px] text-gray-400 font-medium">
              冻结锁定金额: ¥ {wallet.frozen.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWithdraw(true)}
            disabled={wallet.extractable <= 0}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shrink-0 ${
              wallet.extractable <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'provider-btn-primary shadow-md'
            }`}
          >
            去提现
          </button>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm text-left">
          <p className="text-xs text-gray-400 mb-1 font-medium">累计结算收入</p>
          <p className="text-2xl font-black text-gray-950 font-mono mb-2">
            ¥ {wallet.accumulatedIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">
            {settledCount > 0 ? `包含 ${settledCount} 笔已结算合作` : '暂无已结算订单'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm text-left flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium">平台服务费率</p>
            <p className="text-2xl font-black text-gray-950 font-mono mb-2">8.0%</p>
            <p className="text-[10px] text-gray-400 font-medium">含技术服务与结算维护费</p>
          </div>
          <HelpCircle className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900">收益波动走势</h2>
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl">
            {(
              [
                { id: '7d' as const, label: '近 7 天' },
                { id: '30d' as const, label: '近 30 天' },
                { id: 'all' as const, label: '完整季度' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDateTab(d.id)}
                className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors ${
                  activeDateTab === d.id
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-gray-400 hover:text-gray-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-56 relative w-full pt-4">
          <svg className="w-full h-full text-brand shrink-0" viewBox="0 0 540 120" preserveAspectRatio="none">
            <line x1="40" y1="10" x2="520" y2="10" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="40" y1="60" x2="520" y2="60" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="40" y1="110" x2="520" y2="110" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4,4" />
            <defs>
              <linearGradient id="provider-earnings-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff2442" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ff2442" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M40,110 L${graphDataPoints.join(' L')} L520,110 Z`}
              fill="url(#provider-earnings-chart-grad)"
            />
            <polyline
              fill="none"
              stroke="#ff2442"
              strokeWidth="2.5"
              strokeLinecap="round"
              points={graphDataPoints.join(' ')}
            />
            {graphDataPoints.map((pt, index) => {
              const [x, y] = pt.split(',');
              return (
                <circle key={index} cx={x} cy={y} r="4" className="fill-brand stroke-white stroke-2" />
              );
            })}
          </svg>
          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold px-10 mt-1 font-mono">
            <span>{activeDateTab === '7d' ? '周一' : '月初01'}</span>
            <span>{activeDateTab === '7d' ? '周三' : '10号'}</span>
            <span>{activeDateTab === '7d' ? '周五' : '20号'}</span>
            <span>{activeDateTab === '7d' ? '周日' : '月末30'}</span>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 gap-4 flex-wrap">
          <h2 className="text-sm font-bold text-gray-900">收支交易明细</h2>
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
            <div className="text-center py-6 text-xs text-gray-400">没有符合条件的流水记录</div>
          ) : (
            filteredTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 border border-gray-50 hover:bg-gray-50/40 rounded-xl transition-colors"
              >
                <div className="flex gap-3.5 items-center min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      tx.type === 'withdrawal'
                        ? 'bg-gray-100 text-gray-600'
                        : tx.status === 'settled' || tx.status === 'success'
                          ? 'bg-green-50 text-green-500'
                          : 'bg-orange-50 text-orange-500'
                    }`}
                  >
                    {tx.type === 'withdrawal' ? '提现' : '收益'}
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-bold text-gray-950 mb-1 truncate">{tx.title}</h4>
                    <p className="text-[10px] text-gray-400 truncate">
                      品牌: {tx.brand || '平台系统'}
                      {tx.orderId ? ` | 订单: ${tx.orderId}` : ''}
                      {tx.platform ? ` | ${PLATFORM_SHORT[tx.platform] ?? tx.platform}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div
                    className={`text-sm font-black font-mono ${
                      tx.type === 'withdrawal' ? 'text-gray-700' : 'text-brand'
                    }`}
                  >
                    {tx.type === 'withdrawal' ? '-' : '+'} ¥ {tx.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 justify-end font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        tx.status === 'settled' || tx.status === 'success'
                          ? 'bg-green-500'
                          : 'bg-orange-500'
                      }`}
                    />
                    {txStatusLabel(tx)} | {formatTxTime(tx.time)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative border">
            <button
              type="button"
              onClick={() => setShowWithdraw(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-950 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-brand" /> 结存资金安全提现
            </h2>
            <p className="text-xs text-gray-400 mb-5">审核通过后将支付到绑定账户。</p>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">提现渠道</label>
                <div className="relative">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:border-brand bg-white appearance-none pr-8"
                  >
                    <option value="支付宝交易账户">支付宝</option>
                    <option value="招商银行网银账户">招商银行储蓄卡</option>
                    <option value="微信结算账户">微信收款</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">提取金额</label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(wallet.extractable))}
                    className="text-[10px] text-brand hover:underline font-bold"
                  >
                    全部提取
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-900 text-sm font-mono">
                    ¥
                  </span>
                  <input
                    type="number"
                    required
                    max={wallet.extractable}
                    min="1"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-12 py-3 border border-gray-100 rounded-xl text-sm font-black font-mono focus:border-brand outline-none"
                    placeholder="请输入提取金额"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  可提现上限 ¥{' '}
                  {wallet.extractable.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed border">
                每日单卡提现额度 10 万，转账预计 1 个工作日内到账。
              </div>

              <div className="pt-2.5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdraw(false)}
                  className="provider-btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="provider-btn-primary flex-1">
                  确认提现
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
