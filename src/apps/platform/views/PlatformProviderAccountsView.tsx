import { useCallback, useEffect, useMemo, useState } from 'react';
import { platformApiFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformView } from '../types';

interface ProviderAccountRow {
  providerId: string;
  providerName: string;
  contactName: string | null;
  phone: string | null;
  payoutChannel: string | null;
  payoutAccountName: string | null;
  payoutAccountLabel: string | null;
  hasPayoutAccount: boolean;
  identityVerified: boolean;
  identityRealName: string | null;
  identityIdNumberMask: string | null;
  identityVerifiedAt: string | null;
  nameMatch: boolean | null;
  pendingWithdrawal: number;
  extractable: number;
  frozen: number;
  accumulatedIncome: number;
  settledNet: number;
  reserved: number;
  withdrawn: number;
}

const PAYOUT_CHANNEL_LABELS: Record<string, string> = {
  bank: '银行卡',
  alipay: '支付宝',
  wechat: '微信',
};

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  onNavigate?: (view: PlatformView) => void;
}

export default function PlatformProviderAccountsView({ onNavigate }: Props) {
  const [accounts, setAccounts] = useState<ProviderAccountRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    totalExtractable: 0,
    totalFrozen: 0,
    totalWithdrawn: 0,
    missingPayout: 0,
    pendingWithdrawal: 0,
  });
  const [providerName, setProviderName] = useState('');
  const [payoutBound, setPayoutBound] = useState('');
  const [selected, setSelected] = useState<ProviderAccountRow | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (providerName.trim()) params.set('providerName', providerName.trim());
    if (payoutBound === 'yes' || payoutBound === 'no') params.set('payoutBound', payoutBound);
    platformApiFetch(`/api/platform/provider-accounts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        setStats(
          d.stats ?? {
            total: 0,
            totalExtractable: 0,
            totalFrozen: 0,
            totalWithdrawn: 0,
            missingPayout: 0,
            pendingWithdrawal: 0,
          }
        );
      });
  }, [providerName, payoutBound]);

  useEffect(() => {
    load();
  }, [load]);

  const summaryItems = useMemo(
    () => [
      { label: '接单账户', value: stats.total },
      { label: '可提现总额', value: money(stats.totalExtractable) },
      { label: '待结算冻结', value: money(stats.totalFrozen) },
      { label: '累计已提现', value: money(stats.totalWithdrawn) },
      { label: '未绑提现账户', value: stats.missingPayout },
    ],
    [stats]
  );

  const columns = [
    { key: 'name', header: '接单方', render: (r: ProviderAccountRow) => <span className="font-medium">{r.providerName}</span> },
    { key: 'extractable', header: '可提现', render: (r: ProviderAccountRow) => money(r.extractable) },
    { key: 'frozen', header: '待结算', render: (r: ProviderAccountRow) => money(r.frozen) },
    { key: 'withdrawn', header: '已提现', render: (r: ProviderAccountRow) => money(r.withdrawn) },
    {
      key: 'identity',
      header: '实名',
      render: (r: ProviderAccountRow) => (
        <PlatformStatusTag
          label={r.identityVerified ? '已认证' : '未认证'}
          kind={r.identityVerified ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'payoutName',
      header: '账户实名',
      render: (r: ProviderAccountRow) =>
        r.hasPayoutAccount ? (r.payoutAccountName ?? '—') : '—',
    },
    {
      key: 'payoutAccount',
      header: '收款账号',
      render: (r: ProviderAccountRow) =>
        r.hasPayoutAccount ? (
          <span className="font-mono text-xs">{r.payoutAccountLabel ?? '—'}</span>
        ) : (
          <PlatformStatusTag label="未绑定" kind="warning" />
        ),
    },
    {
      key: 'pending',
      header: '在途提现',
      render: (r: ProviderAccountRow) => (r.pendingWithdrawal > 0 ? r.pendingWithdrawal : '—'),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-bold">接单端账户余额</h2>
          <p className="text-xs text-[var(--platform-text-tertiary)] mt-1">
            查看接单方可提现余额、待结算与已提现汇总；提现账户由接单方在个人中心维护。提现审核请至「接单端提现管理」。
          </p>
        </div>

        <PlatformStatSummary items={summaryItems} />

        <PlatformFilterBar
          onReset={() => {
            setProviderName('');
            setPayoutBound('');
          }}
        >
          <PlatformFilterField label="接单方">
            <input
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="接单方名称"
              className="platform-filter-input"
            />
          </PlatformFilterField>
          <PlatformFilterField label="提现账户">
            <select
              value={payoutBound}
              onChange={(e) => setPayoutBound(e.target.value)}
              className="platform-filter-input"
            >
              <option value="">全部</option>
              <option value="yes">已绑定</option>
              <option value="no">未绑定</option>
            </select>
          </PlatformFilterField>
        </PlatformFilterBar>

        <PlatformDataTable<ProviderAccountRow>
          rows={accounts}
          rowKey={(r) => r.providerId}
          selectedKey={selected?.providerId}
          onRowClick={setSelected}
          columns={columns}
          emptyText="暂无已入驻接单方账户"
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
            </PlatformTableActions>
          )}
        />
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={selected.providerName}
          statusLabel={selected.hasPayoutAccount ? '已绑提现账户' : '未绑提现账户'}
          statusKind={selected.hasPayoutAccount ? 'success' : 'warning'}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4 text-sm">
            <section>
              <h4 className="text-xs font-semibold mb-2">余额概览</h4>
              <p>可提现：{money(selected.extractable)}</p>
              <p>待结算冻结：{money(selected.frozen)}</p>
              <p>已结算净额：{money(selected.settledNet)}</p>
              <p>提现占用：{money(selected.reserved)}</p>
              <p>累计已提现：{money(selected.withdrawn)}</p>
              <p>累计收益（扣平台费后）：{money(selected.accumulatedIncome)}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold mb-2">身份证实名</h4>
              {selected.identityVerified ? (
                <>
                  <p>姓名：{selected.identityRealName ?? '—'}</p>
                  <p>证件号：{selected.identityIdNumberMask ?? '—'}</p>
                  <p>
                    认证时间：
                    {selected.identityVerifiedAt
                      ? new Date(selected.identityVerifiedAt).toLocaleString('zh-CN')
                      : '—'}
                  </p>
                  {selected.hasPayoutAccount && selected.nameMatch === false && (
                    <p className="mt-2 text-xs text-amber-700">提现账户姓名与身份证实名不一致</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-[var(--platform-text-tertiary)]">尚未完成身份证实名认证</p>
              )}
              {onNavigate && (
                <button type="button" className="geo-btn-secondary geo-btn-xs mt-2" onClick={() => onNavigate('provider_identity')}>
                  查看实名认证列表
                </button>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold mb-2">提现账户</h4>
              {selected.hasPayoutAccount ? (
                <>
                  <p>
                    渠道：
                    {PAYOUT_CHANNEL_LABELS[selected.payoutChannel ?? ''] ?? selected.payoutChannel ?? '—'}
                  </p>
                  <p>实名：{selected.payoutAccountName ?? '—'}</p>
                  <p>账户：{selected.payoutAccountLabel ?? '—'}</p>
                </>
              ) : (
                <p className="text-xs text-[var(--platform-text-tertiary)]">
                  接单方尚未在个人中心绑定提现账户，无法发起提现。
                </p>
              )}
            </section>

            {(selected.contactName || selected.phone) && (
              <section>
                <h4 className="text-xs font-semibold mb-2">联系人</h4>
                {selected.contactName && <p>姓名：{selected.contactName}</p>}
                {selected.phone && <p>手机：{selected.phone}</p>}
              </section>
            )}

            {selected.pendingWithdrawal > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                当前有 {selected.pendingWithdrawal} 笔提现申请待处理，请至「接单端提现管理」处理。
              </p>
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
