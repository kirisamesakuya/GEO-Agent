import { useCallback, useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import { payoutChannelLabel } from '../../../../lib/provider-payout';
import {
  PROVIDER_WITHDRAWAL_STATUS_LABEL,
  PROVIDER_SETTLEMENT_STATUS_LABEL,
} from '../../../../lib/provider-finance-labels';

interface WithdrawalRow {
  id: string;
  providerId: string;
  amount: number;
  channel: string;
  channelLabel: string | null;
  status: string;
  note: string | null;
  paidNote: string | null;
  paidVoucher: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  provider?: { id: string; name: string };
  walletSnapshot?: { extractable: number };
  payoutChannel?: string | null;
  payoutChannelLabel?: string | null;
  payoutAccountName?: string | null;
  payoutAccountLabel?: string | null;
  payoutBrief?: string;
  identityRealName?: string | null;
  identityIdNumberMask?: string | null;
  identityVerified?: boolean;
  payoutNameMatch?: boolean | null;
}

const WITHDRAWAL_STATUS: Record<string, { label: string; kind: 'pending' | 'warning' | 'success' | 'danger' }> = {
  pending: { label: PROVIDER_WITHDRAWAL_STATUS_LABEL.pending, kind: 'pending' },
  approved: { label: PROVIDER_WITHDRAWAL_STATUS_LABEL.approved, kind: 'warning' },
  paid: { label: PROVIDER_WITHDRAWAL_STATUS_LABEL.paid, kind: 'success' },
  rejected: { label: PROVIDER_WITHDRAWAL_STATUS_LABEL.rejected, kind: 'danger' },
};

const SETTLEMENT_TAB = [{ id: 'settlement_review', label: '订单结算' }];

const WITHDRAWAL_TABS = [
  { id: 'withdraw_review', label: '提现审核' },
  { id: 'withdraw_history', label: '提现记录' },
];

type ProviderFundsSection = 'settlement' | 'withdrawals';

interface ViewProps {
  section?: ProviderFundsSection;
}

interface SettlementBatchRow {
  providerId: string;
  providerName: string;
  period: string;
  totalAmount: number;
  status: string;
  anomalyCount: number;
  orders: Array<{
    id: string;
    title: string;
    brandName: string;
    amount: number;
    status: string;
    anomaly: boolean;
  }>;
}

const SETTLEMENT_STATUS: Record<string, { label: string; kind: 'pending' | 'warning' | 'success' }> = {
  pending_platform: { label: PROVIDER_SETTLEMENT_STATUS_LABEL.pending_platform, kind: 'pending' },
  pending_offline: { label: PROVIDER_SETTLEMENT_STATUS_LABEL.pending_offline, kind: 'warning' },
  settled: { label: PROVIDER_SETTLEMENT_STATUS_LABEL.settled, kind: 'success' },
};

export default function PlatformFundsView({ section = 'settlement' }: ViewProps) {
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const isWithdrawalsOnly = section === 'withdrawals';
  const [tab, setTab] = useState(isWithdrawalsOnly ? 'withdraw_review' : 'settlement_review');
  const [stats, setStats] = useState({ pending: 0, approved: 0, paid: 0, rejected: 0, pendingAmount: 0 });
  const [settlementStats, setSettlementStats] = useState({ pending: 0, offline: 0, settled: 0, anomaly: 0 });
  const [settlementBatches, setSettlementBatches] = useState<SettlementBatchRow[]>([]);
  const [settlementProviderName, setSettlementProviderName] = useState('');
  const [settlementStatus, setSettlementStatus] = useState('');
  const [settlementPeriod, setSettlementPeriod] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementBatchRow | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [withdrawStatus, setWithdrawStatus] = useState('');
  const [providerName, setProviderName] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [paidNote, setPaidNote] = useState('');
  const [paidVoucher, setPaidVoucher] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(() => {
    platformApiFetch('/api/platform/withdrawal-requests/stats')
      .then((r) => r.json())
      .then((d) => setStats(d.stats ?? { pending: 0, approved: 0, paid: 0, rejected: 0, pendingAmount: 0 }));

    const wq = new URLSearchParams();
    if (withdrawStatus) wq.set('status', withdrawStatus);
    if (providerName) wq.set('providerName', providerName);
    platformApiFetch(`/api/platform/withdrawal-requests?${wq}`)
      .then((r) => r.json())
      .then((d) => setWithdrawals(d.requests ?? []));

    const sq = new URLSearchParams();
    if (settlementProviderName) sq.set('providerName', settlementProviderName);
    if (settlementStatus) sq.set('status', settlementStatus);
    platformApiFetch(`/api/platform/settlement-batches?${sq}`)
      .then((r) => r.json())
      .then((d) => {
        setSettlementStats(d.stats ?? { pending: 0, offline: 0, settled: 0, anomaly: 0 });
        setSettlementBatches(d.batches ?? []);
      });
  }, [withdrawStatus, providerName, settlementProviderName, settlementStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const approveWithdrawal = async (id: string) => {
    const res = await platformFetch(role, `/api/platform/withdrawal-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast('审核通过，请财务线下打款后手动确认', 'success');
    setSelectedWithdrawal(null);
    load();
  };

  const rejectWithdrawal = async (id: string, reason: string) => {
    if (!reason.trim()) {
      toast('驳回请填写原因', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/withdrawal-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ role, reason: reason.trim() }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast('已驳回', 'success');
    setSelectedWithdrawal(null);
    setRejectNote('');
    load();
  };

  const markPaid = async (id: string) => {
    if (!paidNote.trim()) {
      toast('请填写线下打款流水号或备注', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/withdrawal-requests/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ role, paidNote, paidVoucher }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast('已确认线下打款', 'success');
    setSelectedWithdrawal(null);
    setPaidNote('');
    setPaidVoucher('');
    load();
  };

  const withdrawalColumns = [
    { key: 'provider', header: '接单方', render: (r: WithdrawalRow) => r.provider?.name ?? r.providerId },
    { key: 'amount', header: '金额', render: (r: WithdrawalRow) => `¥${r.amount.toLocaleString('zh-CN')}` },
    {
      key: 'payoutName',
      header: '账户实名',
      render: (r: WithdrawalRow) => r.payoutAccountName ?? r.identityRealName ?? '—',
    },
    {
      key: 'payoutAccount',
      header: '收款账号',
      render: (r: WithdrawalRow) => {
        const account = r.payoutAccountLabel ?? r.channelLabel ?? '—';
        if (account === '—') return account;
        return <span className="font-mono text-xs">{account}</span>;
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (r: WithdrawalRow) => {
        const st = WITHDRAWAL_STATUS[r.status] ?? { label: r.status, kind: 'muted' as const };
        return <PlatformStatusTag label={st.label} kind={st.kind} />;
      },
    },
    { key: 'time', header: '申请时间', render: (r: WithdrawalRow) => new Date(r.createdAt).toLocaleString('zh-CN') },
  ];

  const filteredWithdrawals = withdrawals.filter((w) => matchesDateRange(w.createdAt, dateSince, dateUntil));
  const pendingWithdrawals = filteredWithdrawals.filter((w) => w.status === 'pending' || w.status === 'approved');

  const visibleSettlementBatches = settlementBatches.filter(
    (b) => !settlementPeriod.trim() || b.period.includes(settlementPeriod.trim())
  );
  const settlementTableRows = visibleSettlementBatches.map((b) => ({
    id: `${b.providerId}-${b.status}`,
    providerName: b.providerName,
    period: b.period,
    totalAmount: b.totalAmount,
    status: b.status,
    anomalyCount: b.anomalyCount,
    orderCount: b.orders.length,
    _batch: b,
  }));

  const openWithdrawal = (w: WithdrawalRow) => {
    setSelectedWithdrawal(w);
    setRejectNote('');
    setPaidNote('');
    setPaidVoucher('');
  };

  const copyPayoutAccount = async (account: string) => {
    try {
      await navigator.clipboard.writeText(account);
      toast('收款账号已复制', 'success');
    } catch {
      toast('复制失败，请手动选择复制', 'error');
    }
  };

  const renderWithdrawalActions = (w: WithdrawalRow) => (
    <PlatformTableActions>
      <PlatformTableAction label="详情" variant="primary" onClick={() => openWithdrawal(w)} />
      {w.status === 'pending' && can('funds.deposit') && (
        <>
          <PlatformTableAction label="通过" variant="primary" onClick={() => void approveWithdrawal(w.id)} />
          <PlatformTableAction label="驳回" variant="danger" onClick={() => openWithdrawal(w)} />
        </>
      )}
      {w.status === 'approved' && can('funds.deposit') && (
        <PlatformTableAction label="确认打款" variant="primary" onClick={() => openWithdrawal(w)} />
      )}
    </PlatformTableActions>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-bold">
            {isWithdrawalsOnly ? '接单端提现管理' : '接单端订单结算'}
          </h2>
          <p className="text-xs text-[var(--platform-text-tertiary)] mt-1">
            {isWithdrawalsOnly
              ? '审核接单方提现申请、确认线下打款并查询历史记录。列表展示完整收款账号，详情可复制打款信息。当前 MVP 仅支持支付宝收款。'
              : '按批次确认订单结算并入账至接单方可提现余额。提现审核请至「接单端提现管理」。'}
          </p>
        </div>

        <PlatformStatSummary
          items={
            !isWithdrawalsOnly
              ? [
                  { label: '待平台确认', value: settlementStats.pending },
                  { label: '待线下结算', value: settlementStats.offline },
                  { label: '已结算', value: settlementStats.settled },
                  { label: '异常批次', value: settlementStats.anomaly },
                ]
              : [
                  { label: '待审核提现', value: stats.pending },
                  { label: '待线下打款', value: stats.approved },
                  { label: '待处理金额', value: `¥${stats.pendingAmount.toLocaleString('zh-CN')}` },
                  { label: '已打款', value: stats.paid },
                ]
          }
        />

        {isWithdrawalsOnly ? (
          <PlatformTabBar
            tabs={WITHDRAWAL_TABS}
            active={tab}
            onChange={(id) => {
              setTab(id);
              setSelectedWithdrawal(null);
            }}
          />
        ) : (
          <PlatformTabBar
            tabs={SETTLEMENT_TAB}
            active={tab}
            onChange={(id) => {
              setTab(id);
              setSelectedSettlement(null);
            }}
          />
        )}

        {!isWithdrawalsOnly && tab === 'settlement_review' && (
          <>
            <PlatformFilterBar
              onReset={() => {
                setSettlementProviderName('');
                setSettlementStatus('');
                setSettlementPeriod('');
              }}
            >
              <PlatformFilterField label="接单方">
                <input
                  value={settlementProviderName}
                  onChange={(e) => setSettlementProviderName(e.target.value)}
                  placeholder="接单方名称"
                  className="platform-filter-input"
                />
              </PlatformFilterField>
              <PlatformFilterField label="结算状态">
                <select
                  value={settlementStatus}
                  onChange={(e) => setSettlementStatus(e.target.value)}
                  className="platform-filter-input"
                >
                  <option value="">全部</option>
                  <option value="pending_platform">待平台确认</option>
                  <option value="pending_offline">待线下结算</option>
                  <option value="settled">已结算</option>
                </select>
              </PlatformFilterField>
              <PlatformFilterField label="结算周期">
                <input
                  value={settlementPeriod}
                  onChange={(e) => setSettlementPeriod(e.target.value)}
                  placeholder="如 2026-06"
                  className="platform-filter-input"
                />
              </PlatformFilterField>
            </PlatformFilterBar>
            <PlatformDataTable<(typeof settlementTableRows)[number]>
              rows={settlementTableRows}
              rowKey={(r) => r.id}
              selectedKey={selectedSettlement ? `${selectedSettlement.providerId}-${selectedSettlement.status}` : undefined}
              onRowClick={(r) => setSelectedSettlement(r._batch)}
              emptyText="暂无待处理结算批次"
              columns={[
                { key: 'provider', header: '接单方', render: (r) => r.providerName },
                { key: 'period', header: '周期', render: (r) => r.period },
                { key: 'amount', header: '金额', render: (r) => `¥${r.totalAmount.toLocaleString('zh-CN')}` },
                {
                  key: 'status',
                  header: '状态',
                  render: (r) => {
                    const st = SETTLEMENT_STATUS[r.status] ?? { label: r.status, kind: 'pending' as const };
                    return <PlatformStatusTag label={st.label} kind={st.kind} />;
                  },
                },
                { key: 'anomaly', header: '异常', render: (r) => (r.anomalyCount > 0 ? r.anomalyCount : '—') },
              ]}
              renderActions={(r) => (
                <PlatformTableActions>
                  <PlatformTableAction label="详情" variant="primary" onClick={() => setSelectedSettlement(r._batch)} />
                </PlatformTableActions>
              )}
            />
          </>
        )}

        {isWithdrawalsOnly && tab === 'withdraw_review' && (
          <PlatformDataTable<WithdrawalRow>
            rows={pendingWithdrawals}
            rowKey={(r) => r.id}
            selectedKey={selectedWithdrawal?.id}
            onRowClick={openWithdrawal}
            emptyText="暂无待处理提现"
            columns={withdrawalColumns}
            renderActions={renderWithdrawalActions}
          />
        )}

        {isWithdrawalsOnly && tab === 'withdraw_history' && (
          <>
            <PlatformFilterBar onReset={() => { setWithdrawStatus(''); setProviderName(''); setDateSince(''); setDateUntil(''); }}>
              <PlatformFilterField label="提现状态">
                <select value={withdrawStatus} onChange={(e) => setWithdrawStatus(e.target.value)} className="platform-filter-input">
                  <option value="">全部</option>
                  <option value="pending">待审核</option>
                  <option value="approved">待打款</option>
                  <option value="paid">已打款</option>
                  <option value="rejected">已驳回</option>
                </select>
              </PlatformFilterField>
              <PlatformFilterField label="接单方">
                <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="接单方名称" className="platform-filter-input" />
              </PlatformFilterField>
              <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
            </PlatformFilterBar>
            <PlatformDataTable<WithdrawalRow>
              rows={filteredWithdrawals}
              rowKey={(r) => r.id}
              selectedKey={selectedWithdrawal?.id}
              onRowClick={openWithdrawal}
              columns={withdrawalColumns}
              renderActions={renderWithdrawalActions}
            />
          </>
        )}

      </div>

      {selectedSettlement && (
        <PlatformDetailDrawer
          title={`${selectedSettlement.providerName} · ${selectedSettlement.period}`}
          statusLabel={SETTLEMENT_STATUS[selectedSettlement.status]?.label ?? selectedSettlement.status}
          statusKind={SETTLEMENT_STATUS[selectedSettlement.status]?.kind ?? 'pending'}
          onClose={() => setSelectedSettlement(null)}
          footer={
            selectedSettlement.status !== 'settled' && can('settlement.write') ? (
              <div className="flex gap-2 w-full">
                <button type="button" className="geo-btn-secondary text-sm flex-1">退回核对</button>
                <button type="button" className="geo-btn-primary text-sm flex-1">通过结算</button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-lg font-bold">¥{selectedSettlement.totalAmount.toLocaleString('zh-CN')}</p>
            <div>
              <h4 className="mb-2 text-xs font-semibold">订单明细</h4>
              {selectedSettlement.orders.map((o) => (
                <div key={o.id} className="border-b border-[var(--platform-border-subtle)] py-2 text-xs">
                  <p className="font-medium">{o.title}</p>
                  <p className="text-[var(--platform-text-tertiary)]">
                    {o.brandName} · ¥{o.amount}
                    {o.anomaly ? ' · 异常' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PlatformDetailDrawer>
      )}

      {selectedWithdrawal && (
        <PlatformDetailDrawer
          title={selectedWithdrawal.provider?.name ?? '提现详情'}
          statusLabel={WITHDRAWAL_STATUS[selectedWithdrawal.status]?.label ?? selectedWithdrawal.status}
          statusKind={WITHDRAWAL_STATUS[selectedWithdrawal.status]?.kind ?? 'muted'}
          onClose={() => { setSelectedWithdrawal(null); setRejectNote(''); setPaidNote(''); setPaidVoucher(''); }}
          footer={
            selectedWithdrawal.status === 'pending' && can('funds.deposit') ? (
              <div className="space-y-2 w-full">
                <input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="驳回原因（驳回时必填）"
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
                <div className="flex gap-2">
                  <button type="button" className="geo-btn-primary geo-btn-xs flex-1"
                    onClick={() => void approveWithdrawal(selectedWithdrawal.id)}>通过审核</button>
                  <button type="button" className="geo-btn-secondary geo-btn-xs flex-1"
                    onClick={() => void rejectWithdrawal(selectedWithdrawal.id, rejectNote)}>驳回</button>
                </div>
              </div>
            ) : selectedWithdrawal.status === 'approved' && can('funds.deposit') ? (
              <div className="space-y-2 w-full">
                <input value={paidNote} onChange={(e) => setPaidNote(e.target.value)} placeholder="线下打款流水号/备注（必填）"
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input value={paidVoucher} onChange={(e) => setPaidVoucher(e.target.value)} placeholder="凭证号（选填）"
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
                <button type="button" className="geo-btn-primary text-sm w-full"
                  onClick={() => void markPaid(selectedWithdrawal.id)}>
                  确认已线下打款
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-4 text-sm">
            <section className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 space-y-2">
              <h4 className="text-xs font-semibold text-[var(--platform-text-title)]">线下打款信息</h4>
              <p>
                <span className="text-[var(--platform-text-tertiary)]">渠道：</span>
                {selectedWithdrawal.payoutChannelLabel ??
                  payoutChannelLabel(selectedWithdrawal.payoutChannel ?? selectedWithdrawal.channel)}
              </p>
              <p>
                <span className="text-[var(--platform-text-tertiary)]">账户实名：</span>
                {selectedWithdrawal.payoutAccountName ?? selectedWithdrawal.identityRealName ?? '—'}
              </p>
              <p>
                <span className="text-[var(--platform-text-tertiary)]">收款账号：</span>
                <span className="font-mono text-[var(--platform-text-title)] break-all">
                  {selectedWithdrawal.payoutAccountLabel ?? selectedWithdrawal.channelLabel ?? '—'}
                </span>
                {(selectedWithdrawal.payoutAccountLabel ?? selectedWithdrawal.channelLabel) && (
                  <button
                    type="button"
                    className="ml-2 inline-flex items-center gap-1 text-xs text-[var(--platform-primary)] hover:underline"
                    onClick={() =>
                      void copyPayoutAccount(
                        selectedWithdrawal.payoutAccountLabel ?? selectedWithdrawal.channelLabel ?? ''
                      )
                    }
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </button>
                )}
              </p>
              {selectedWithdrawal.identityVerified && (
                <>
                  <p>
                    <span className="text-[var(--platform-text-tertiary)]">身份证实名：</span>
                    {selectedWithdrawal.identityRealName ?? '—'}
                    {selectedWithdrawal.identityIdNumberMask
                      ? ` · ${selectedWithdrawal.identityIdNumberMask}`
                      : ''}
                  </p>
                  <p>
                    <span className="text-[var(--platform-text-tertiary)]">姓名一致：</span>
                    {selectedWithdrawal.payoutNameMatch === true ? (
                      <PlatformStatusTag label="一致" kind="success" />
                    ) : selectedWithdrawal.payoutNameMatch === false ? (
                      <PlatformStatusTag label="不一致，请核对" kind="warning" />
                    ) : (
                      '—'
                    )}
                  </p>
                </>
              )}
              {selectedWithdrawal.payoutNameMatch === false && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  提现账户实名与身份证不一致，打款前请与接单方确认。
                </p>
              )}
            </section>

            <section className="space-y-1">
              <h4 className="text-xs font-semibold text-[var(--platform-text-title)] mb-1">申请信息</h4>
            <p><span className="text-[var(--platform-text-tertiary)]">金额：</span>¥{selectedWithdrawal.amount.toLocaleString('zh-CN')}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">可提现余额：</span>¥{(selectedWithdrawal.walletSnapshot?.extractable ?? 0).toLocaleString('zh-CN')}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">申请时间：</span>{new Date(selectedWithdrawal.createdAt).toLocaleString('zh-CN')}</p>
            {selectedWithdrawal.reviewedAt && <p><span className="text-[var(--platform-text-tertiary)]">审核时间：</span>{new Date(selectedWithdrawal.reviewedAt).toLocaleString('zh-CN')}</p>}
            {selectedWithdrawal.paidAt && <p><span className="text-[var(--platform-text-tertiary)]">打款确认：</span>{new Date(selectedWithdrawal.paidAt).toLocaleString('zh-CN')}</p>}
            {selectedWithdrawal.paidNote && <p><span className="text-[var(--platform-text-tertiary)]">打款备注：</span>{selectedWithdrawal.paidNote}</p>}
            {selectedWithdrawal.note && <p><span className="text-[var(--platform-text-tertiary)]">驳回原因：</span>{selectedWithdrawal.note}</p>}
            </section>
          </div>
        </PlatformDetailDrawer>
      )}

    </div>
  );
}
