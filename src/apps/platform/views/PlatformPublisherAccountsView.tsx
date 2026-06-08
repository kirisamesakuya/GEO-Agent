import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { includesText, matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface AccountRow {
  brandName: string;
  brandId: string | null;
  brandStatus: string;
  organizationName: string | null;
  ownerUserNo: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  balance: number;
  frozen: number;
  available: number;
  anomaly: boolean;
  updatedAt: string;
}

interface AccountDetail {
  account: { brandName: string; balance: number; frozen: number; available: number };
  brand: { id: string; name: string; status: string; industry: string; city: string };
  organization: { id: string; name: string; certStatus: string } | null;
  owner: {
    id: string;
    userNo: number;
    displayName: string | null;
    phone: string | null;
    accountType: string;
  } | null;
  ledger: Array<{
    id: string;
    type: string;
    amount: number;
    balance: number;
    note: string | null;
    createdAt: string;
  }>;
  pendingDeposits: DepositRow[];
  recentDeposits: DepositRow[];
  summary: { anomaly: boolean; freezeTotal: number; releaseTotal: number };
}

interface DepositRow {
  id: string;
  brandName: string;
  amount: number;
  note: string | null;
  status: string;
  createdAt: string;
}

const BALANCE_TABS = [
  { id: 'accounts', label: '账户总览' },
  { id: 'ledger', label: '流水明细' },
];

type PublisherAccountsSection = 'balances' | 'deposits';

interface ViewProps {
  section?: PublisherAccountsSection;
}

const LEDGER_TYPE_LABELS: Record<string, string> = {
  freeze: '冻结',
  release: '释放',
  manual_deposit: '人工入账',
  platform_credit: '平台调增',
  platform_debit: '平台调减',
};

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN')}`;
}

export default function PlatformPublisherAccountsView({ section = 'balances' }: ViewProps) {
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const isDepositsOnly = section === 'deposits';
  const [tab, setTab] = useState(isDepositsOnly ? 'deposit' : 'accounts');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [stats, setStats] = useState({ total: 0, totalBalance: 0, totalFrozen: 0, anomaly: 0 });
  const [brandName, setBrandName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [ownerUserNo, setOwnerUserNo] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [brandStatus, setBrandStatus] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [selected, setSelected] = useState<AccountRow | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [depositBrand, setDepositBrand] = useState('');
  const [depositStatus, setDepositStatus] = useState('');
  const [depositDateSince, setDepositDateSince] = useState('');
  const [depositDateUntil, setDepositDateUntil] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [budgetLedger, setBudgetLedger] = useState<Array<Record<string, unknown>>>([]);
  const [ledgerTab, setLedgerTab] = useState<'all' | 'freeze' | 'release' | 'anomaly'>('all');
  const [ledgerBrand, setLedgerBrand] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<AccountRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const resetAccountFilters = () => {
    setBrandName('');
    setOrganizationName('');
    setOwnerUserNo('');
    setOwnerPhone('');
    setOwnerName('');
    setAccountStatus('');
    setBrandStatus('');
    setDateSince('');
    setDateUntil('');
  };

  const loadAccounts = useCallback(() => {
    const params = new URLSearchParams();
    if (brandName.trim()) params.set('brandName', brandName.trim());
    if (organizationName.trim()) params.set('organizationName', organizationName.trim());
    if (ownerUserNo.trim()) params.set('ownerUserNo', ownerUserNo.trim());
    if (ownerPhone.trim()) params.set('ownerPhone', ownerPhone.trim());
    if (ownerName.trim()) params.set('ownerName', ownerName.trim());
    if (brandStatus) params.set('brandStatus', brandStatus);
    if (accountStatus === 'anomaly') params.set('anomaly', 'true');
    platformApiFetch(`/api/platform/publisher-accounts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        let rows: AccountRow[] = d.accounts ?? [];
        if (accountStatus === 'normal') rows = rows.filter((r) => !r.anomaly);
        if (dateSince || dateUntil) {
          rows = rows.filter((r) => matchesDateRange(r.updatedAt, dateSince, dateUntil));
        }
        setAccounts(rows);
        const allStats = d.stats ?? { total: 0, totalBalance: 0, totalFrozen: 0, anomaly: 0 };
        setStats({
          ...allStats,
          total: rows.length,
          totalBalance: rows.reduce((s, r) => s + r.balance, 0),
          totalFrozen: rows.reduce((s, r) => s + r.frozen, 0),
          anomaly: rows.filter((r) => r.anomaly).length,
        });
      });
  }, [brandName, organizationName, ownerUserNo, ownerPhone, ownerName, brandStatus, accountStatus, dateSince, dateUntil]);

  const loadDeposits = useCallback(() => {
    platformApiFetch('/api/platform/deposit-requests?status=all')
      .then((r) => r.json())
      .then((d) => setDeposits(d.requests ?? []));
  }, []);

  const loadLedger = useCallback(() => {
    const lq = new URLSearchParams();
    if (ledgerTab === 'freeze') lq.set('type', 'freeze');
    else if (ledgerTab === 'release') lq.set('type', 'release');
    else if (ledgerTab === 'anomaly') lq.set('anomaly', 'true');
    platformApiFetch(`/api/platform/budget-ledgers?${lq}`)
      .then((r) => r.json())
      .then((d) => setBudgetLedger(d.ledger ?? []));
  }, [ledgerTab]);

  const loadAll = useCallback(() => {
    loadAccounts();
    loadDeposits();
    loadLedger();
  }, [loadAccounts, loadDeposits, loadLedger]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    platformApiFetch(`/api/platform/publisher-accounts/${encodeURIComponent(selected.brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast(d.error, 'error');
          return;
        }
        setDetail(d as AccountDetail);
      })
      .finally(() => setDetailLoading(false));
  }, [selected, toast]);

  const filteredDeposits = useMemo(
    () =>
      deposits.filter((d) => {
        if (!includesText(d.brandName, depositBrand)) return false;
        if (depositStatus && d.status !== depositStatus) return false;
        if (!matchesDateRange(d.createdAt, depositDateSince, depositDateUntil)) return false;
        return true;
      }),
    [deposits, depositBrand, depositStatus, depositDateSince, depositDateUntil]
  );

  const pendingDeposits = useMemo(() => deposits.filter((d) => d.status === 'pending'), [deposits]);

  const filteredLedger = useMemo(
    () =>
      budgetLedger.filter((row) => includesText(String(row.brandName ?? ''), ledgerBrand)),
    [budgetLedger, ledgerBrand]
  );

  const summaryItems = useMemo(
    () =>
      isDepositsOnly
        ? [
            { label: '待审入账', value: pendingDeposits.length },
            { label: '全部申请', value: deposits.length },
            {
              label: '待审金额',
              value: money(deposits.filter((d) => d.status === 'pending').reduce((s, d) => s + d.amount, 0)),
            },
            {
              label: '已通过',
              value: deposits.filter((d) => d.status === 'approved').length,
            },
            {
              label: '已驳回',
              value: deposits.filter((d) => d.status === 'rejected').length,
            },
          ]
        : [
            { label: '投放账户', value: stats.total },
            { label: '总可用余额', value: money(stats.totalBalance - stats.totalFrozen) },
            { label: '总冻结', value: money(stats.totalFrozen) },
            { label: '异常账户', value: stats.anomaly },
          ],
    [stats, pendingDeposits.length, deposits, isDepositsOnly]
  );

  const accountColumns = [
    { key: 'brand', header: '品牌', render: (r: AccountRow) => <span className="font-medium">{r.brandName}</span> },
    {
      key: 'org',
      header: '组织',
      render: (r: AccountRow) => r.organizationName ?? <span className="text-[var(--platform-text-tertiary)]">—</span>,
    },
    {
      key: 'owner',
      header: '负责人',
      render: (r: AccountRow) => (
        <div className="text-xs">
          <div>{r.ownerName ?? '—'}</div>
          {r.ownerUserNo != null && (
            <div className="text-[var(--platform-text-tertiary)] font-mono tabular-nums">#{r.ownerUserNo}</div>
          )}
        </div>
      ),
    },
    { key: 'available', header: '可用余额', render: (r: AccountRow) => money(r.available) },
    { key: 'frozen', header: '冻结', render: (r: AccountRow) => money(r.frozen) },
    { key: 'balance', header: '账户余额', render: (r: AccountRow) => money(r.balance) },
    {
      key: 'status',
      header: '状态',
      render: (r: AccountRow) =>
        r.anomaly ? (
          <PlatformStatusTag label="冻结异常" kind="danger" />
        ) : r.brandStatus === 'disabled' ? (
          <PlatformStatusTag label="品牌停用" kind="muted" />
        ) : (
          <PlatformStatusTag label="正常" kind="success" />
        ),
    },
  ];

  const approveDeposit = async (id: string) => {
    const res = await platformFetch(role, `/api/platform/deposit-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('入账已通过', 'success');
    setSelectedDeposit(null);
    loadAll();
    if (selected) {
      platformApiFetch(`/api/platform/publisher-accounts/${encodeURIComponent(selected.brandName)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setDetail(d as AccountDetail);
        });
    }
  };

  const rejectDeposit = async (id: string, reason: string) => {
    if (!reason.trim()) {
      toast('驳回请填写原因', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/deposit-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ role, reason: reason.trim() }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已驳回入账', 'success');
    setSelectedDeposit(null);
    setRejectNote('');
    loadAll();
  };

  const refreshAccountDetail = (brandName: string) => {
    platformApiFetch(`/api/platform/publisher-accounts/${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setDetail(d as AccountDetail);
      });
  };

  const openAdjust = (r: AccountRow) => {
    setAdjustTarget(r);
    setAdjustAmount('');
    setAdjustReason('');
  };

  const closeAdjust = () => {
    setAdjustTarget(null);
    setAdjustAmount('');
    setAdjustReason('');
  };

  const adjustBudget = async () => {
    if (!adjustTarget) return;
    if (!adjustReason.trim()) {
      toast('请填写调整原因', 'error');
      return;
    }
    const amount = Number(adjustAmount);
    if (!amount || Number.isNaN(amount)) {
      toast('请填写有效调整金额', 'error');
      return;
    }
    setAdjustSubmitting(true);
    try {
      const res = await platformFetch(role, '/api/platform/budget-adjust', {
        method: 'POST',
        body: JSON.stringify({
          brandName: adjustTarget.brandName,
          amount,
          reason: adjustReason.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      toast('投放余额已调整', 'success');
      const brandName = adjustTarget.brandName;
      closeAdjust();
      loadAll();
      if (selected?.brandName === brandName) refreshAccountDetail(brandName);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const openAccount = (r: AccountRow) => {
    setSelected(r);
    setSelectedDeposit(null);
    closeAdjust();
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-bold">{isDepositsOnly ? '发布端入账审核' : '发布端账户余额'}</h2>
          <p className="text-xs text-[var(--platform-text-tertiary)] mt-1">
            {isDepositsOnly
              ? '审核商家线下对公/转账入账申请，通过后计入品牌投放余额。账户余额查询与调账请至「发布端账户余额」。'
              : '查看商家品牌投放余额、冻结与流水明细；人工调账从操作列或详情发起。入账审核请至「发布端入账审核」。'}
          </p>
        </div>

        <PlatformStatSummary items={summaryItems} />

        {!isDepositsOnly && (
          <PlatformTabBar
            tabs={BALANCE_TABS}
            active={tab}
            onChange={(id) => {
              setTab(id);
              setSelectedDeposit(null);
            }}
          />
        )}

        {tab === 'accounts' && (
          <>
            <PlatformFilterBar onReset={resetAccountFilters}>
              <PlatformFilterField label="品牌">
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
              </PlatformFilterField>
              <PlatformFilterField label="组织">
                <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="组织名称" className="platform-filter-input" />
              </PlatformFilterField>
              <PlatformFilterField label="负责人编号">
                <input value={ownerUserNo} onChange={(e) => setOwnerUserNo(e.target.value.replace(/\D/g, ''))} placeholder="用户编号" inputMode="numeric" className="platform-filter-input" />
              </PlatformFilterField>
              <PlatformFilterField label="负责人手机">
                <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 位手机号" inputMode="tel" maxLength={11} className="platform-filter-input" />
              </PlatformFilterField>
              <PlatformFilterField label="负责人姓名">
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="负责人姓名" className="platform-filter-input" />
              </PlatformFilterField>
              <PlatformFilterField label="品牌状态">
                <select value={brandStatus} onChange={(e) => setBrandStatus(e.target.value)} className="platform-filter-input">
                  <option value="">全部</option>
                  <option value="active">正常</option>
                  <option value="disabled">已停用</option>
                </select>
              </PlatformFilterField>
              <PlatformFilterField label="余额状态">
                <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="platform-filter-input">
                  <option value="">全部</option>
                  <option value="anomaly">冻结异常</option>
                  <option value="normal">正常</option>
                </select>
              </PlatformFilterField>
              <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
            </PlatformFilterBar>
            <PlatformDataTable<AccountRow>
              rows={accounts}
              rowKey={(r) => r.brandName}
              selectedKey={selected?.brandName}
              onRowClick={openAccount}
              columns={accountColumns}
              renderActions={(r) => (
                <PlatformTableActions>
                  <PlatformTableAction label="详情" variant="primary" onClick={() => openAccount(r)} />
                  {can('funds.adjust') && (
                    <PlatformTableAction label="调账" variant="primary" onClick={() => openAdjust(r)} />
                  )}
                </PlatformTableActions>
              )}
            />
          </>
        )}

        {(isDepositsOnly || tab === 'deposit') && (
          <>
          <PlatformFilterBar onReset={() => { setDepositBrand(''); setDepositStatus(''); setDepositDateSince(''); setDepositDateUntil(''); }}>
            <PlatformFilterField label="品牌">
              <input value={depositBrand} onChange={(e) => setDepositBrand(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
            </PlatformFilterField>
            <PlatformFilterField label="入账状态">
              <select value={depositStatus} onChange={(e) => setDepositStatus(e.target.value)} className="platform-filter-input">
                <option value="">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </PlatformFilterField>
            <PlatformFilterDateRange since={depositDateSince} until={depositDateUntil} onSinceChange={setDepositDateSince} onUntilChange={setDepositDateUntil} />
          </PlatformFilterBar>
          <PlatformDataTable<DepositRow>
            rows={filteredDeposits}
            rowKey={(r) => r.id}
            selectedKey={selectedDeposit?.id}
            onRowClick={setSelectedDeposit}
            emptyText="无入账记录"
            columns={[
              { key: 'brand', header: '品牌', render: (r) => r.brandName },
              { key: 'amount', header: '金额', render: (r) => money(r.amount) },
              { key: 'note', header: '备注', render: (r) => r.note ?? '—' },
              {
                key: 'status',
                header: '状态',
                render: (r) => (
                  <PlatformStatusTag
                    label={r.status === 'pending' ? '待审核' : r.status === 'approved' ? '已通过' : '已驳回'}
                    kind={r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'success' : 'danger'}
                  />
                ),
              },
              { key: 'time', header: '申请时间', render: (r) => new Date(r.createdAt).toLocaleString('zh-CN') },
            ]}
            renderActions={(d) => (
              <PlatformTableActions>
                <PlatformTableAction label="详情" variant="primary" onClick={() => setSelectedDeposit(d)} />
                {d.status === 'pending' && can('funds.deposit') && (
                  <>
                    <PlatformTableAction label="通过" variant="primary" onClick={() => void approveDeposit(d.id)} />
                    <PlatformTableAction label="驳回" variant="danger" onClick={() => setSelectedDeposit(d)} />
                  </>
                )}
              </PlatformTableActions>
            )}
          />
          </>
        )}

        {tab === 'ledger' && (
          <div className="space-y-3">
          <PlatformFilterBar onReset={() => setLedgerBrand('')}>
            <PlatformFilterField label="品牌">
              <input value={ledgerBrand} onChange={(e) => setLedgerBrand(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
            </PlatformFilterField>
          </PlatformFilterBar>
          <div className="platform-card overflow-hidden">
            <div className="platform-card-header flex flex-wrap gap-2 items-center justify-between">
              <span>投放余额流水</span>
              <div className="flex gap-1">
                {(['all', 'freeze', 'release', 'anomaly'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLedgerTab(t)}
                    className={`text-[10px] px-2 py-0.5 rounded ${ledgerTab === t ? 'geo-nav-active' : 'geo-nav-item'}`}
                  >
                    {t === 'all' ? '全部' : t === 'freeze' ? '冻结' : t === 'release' ? '释放' : '异常'}
                  </button>
                ))}
              </div>
            </div>
            <table className="platform-table platform-table--compact">
              <thead>
                <tr>
                  <th>品牌</th>
                  <th>类型</th>
                  <th>金额</th>
                  <th>余额</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="platform-table-empty">
                      无记录
                    </td>
                  </tr>
                ) : (
                  filteredLedger.slice(0, 50).map((row, i) => (
                    <tr key={i} style={row.anomaly ? { background: '#fef2f2' } : undefined}>
                      <td>{String(row.brandName)}</td>
                      <td>
                        {LEDGER_TYPE_LABELS[String(row.type)] ?? String(row.type)}
                        {row.anomaly ? ' ⚠' : ''}
                      </td>
                      <td>{money(Number(row.amount))}</td>
                      <td>{money(Number(row.balance))}</td>
                      <td className="text-xs text-[var(--platform-text-tertiary)]">
                        {row.createdAt ? new Date(String(row.createdAt)).toLocaleString('zh-CN') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

      </div>

      {adjustTarget && (
        <PlatformDetailDrawer
          title={`${adjustTarget.brandName} · 人工调账`}
          statusLabel="须填写原因并写入审计"
          statusKind="warning"
          onClose={closeAdjust}
          footer={
            <div className="flex gap-2 w-full">
              <button type="button" className="geo-btn-secondary text-sm flex-1" onClick={closeAdjust}>
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary text-sm flex-1"
                disabled={!can('funds.adjust') || adjustSubmitting}
                onClick={() => void adjustBudget()}
              >
                {adjustSubmitting ? '提交中…' : '确认调整'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-[var(--platform-border-subtle)] p-3 text-xs space-y-1">
              <p>
                当前可用：<span className="font-medium">{money(adjustTarget.available)}</span>
              </p>
              <p>
                冻结：{money(adjustTarget.frozen)} · 余额：{money(adjustTarget.balance)}
              </p>
            </div>
            <div>
              <label className="geo-label block mb-1.5">调整原因（必填）</label>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="如：线下对账补录、活动补偿"
                className="w-full px-3 py-2 border rounded-lg text-sm platform-filter-input"
              />
            </div>
            <div>
              <label className="geo-label block mb-1.5">调整金额</label>
              <input
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="正数增加、负数扣减，如 1000 或 -500"
                className="w-full px-3 py-2 border rounded-lg text-sm platform-filter-input"
              />
            </div>
          </div>
        </PlatformDetailDrawer>
      )}

      {!adjustTarget && selected && tab === 'accounts' && (
        <PlatformDetailDrawer
          title={selected.brandName}
          statusLabel={selected.anomaly ? '冻结异常' : selected.brandStatus === 'disabled' ? '品牌停用' : '正常'}
          statusKind={selected.anomaly ? 'danger' : selected.brandStatus === 'disabled' ? 'muted' : 'success'}
          onClose={() => setSelected(null)}
          footer={
            can('funds.adjust') ? (
              <button type="button" className="geo-btn-primary text-sm w-full" onClick={() => openAdjust(selected)}>
                人工调账
              </button>
            ) : undefined
          }
        >
          {detailLoading || !detail ? (
            <p className="text-sm text-[var(--platform-text-tertiary)]">详情加载中…</p>
          ) : (
            <div className="space-y-4 text-sm">
              <section>
                <h4 className="text-xs font-semibold mb-2">账户余额</h4>
                <p>可用：{money(detail.account.available)}</p>
                <p>冻结：{money(detail.account.frozen)}</p>
                <p>余额：{money(detail.account.balance)}</p>
                {detail.summary.anomaly && (
                  <p className="text-[var(--color-danger)] text-xs mt-1">⚠ 冻结金额超过账户余额</p>
                )}
              </section>

              {detail.organization && (
                <section>
                  <h4 className="text-xs font-semibold mb-2">所属组织</h4>
                  <p>{detail.organization.name}</p>
                </section>
              )}

              {detail.owner && (
                <section>
                  <h4 className="text-xs font-semibold mb-2">账户负责人</h4>
                  <p>
                    用户编号：
                    <span className="font-mono tabular-nums ml-1">{detail.owner.userNo}</span>
                  </p>
                  <p>姓名：{detail.owner.displayName ?? '—'}</p>
                  <p>手机：{detail.owner.phone ?? '—'}</p>
                </section>
              )}

              {detail.pendingDeposits.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold mb-2">待审入账</h4>
                  <ul className="space-y-1 text-xs">
                    {detail.pendingDeposits.map((d) => (
                      <li key={d.id} className="flex justify-between gap-2">
                        <span>{money(d.amount)} · {d.note ?? '入账申请'}</span>
                        <span className="text-[var(--platform-text-tertiary)]">
                          {new Date(d.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h4 className="text-xs font-semibold mb-2">近期流水</h4>
                {detail.ledger.length === 0 ? (
                  <p className="text-[var(--platform-text-tertiary)] text-xs">无记录</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {detail.ledger.slice(0, 8).map((l) => (
                      <li key={l.id} className="flex justify-between gap-2">
                        <span>
                          {LEDGER_TYPE_LABELS[l.type] ?? l.type} {money(l.amount)}
                        </span>
                        <span className="text-[var(--platform-text-tertiary)]">
                          {new Date(l.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </PlatformDetailDrawer>
      )}

      {!adjustTarget && selectedDeposit && (isDepositsOnly || tab === 'deposit') && (
        <PlatformDetailDrawer
          title={`${selectedDeposit.brandName} · 投放入账`}
          statusLabel={
            selectedDeposit.status === 'pending'
              ? '待审核'
              : selectedDeposit.status === 'approved'
                ? '已通过'
                : '已驳回'
          }
          statusKind={
            selectedDeposit.status === 'pending'
              ? 'pending'
              : selectedDeposit.status === 'approved'
                ? 'success'
                : 'danger'
          }
          onClose={() => {
            setSelectedDeposit(null);
            setRejectNote('');
          }}
          footer={
            selectedDeposit.status === 'pending' && can('funds.deposit') ? (
              <div className="space-y-2 w-full">
                <input
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="驳回原因（驳回时必填）"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-xs flex-1"
                    onClick={() => void approveDeposit(selectedDeposit.id)}
                  >
                    通过入账
                  </button>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs flex-1"
                    onClick={() => void rejectDeposit(selectedDeposit.id, rejectNote)}
                  >
                    驳回
                  </button>
                </div>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--platform-text-tertiary)]">品牌：</span>
              {selectedDeposit.brandName}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">金额：</span>
              {money(selectedDeposit.amount)}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">备注：</span>
              {selectedDeposit.note ?? '—'}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">申请时间：</span>
              {new Date(selectedDeposit.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
