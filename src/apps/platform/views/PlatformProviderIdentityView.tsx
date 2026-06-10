import { useCallback, useEffect, useMemo, useState } from 'react';
import { platformApiFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { includesText, matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformStatusKind, PlatformView } from '../types';
import { payoutChannelLabel } from '../../../../lib/provider-payout';

interface IdentityRow {
  providerId: string;
  providerName: string;
  contactName: string | null;
  phone: string | null;
  identityVerified: boolean;
  identityRealName: string | null;
  identityIdNumberMask: string | null;
  identityVerifiedAt: string | null;
  payoutChannel: string | null;
  payoutAccountName: string | null;
  payoutAccountLabel: string | null;
  hasPayoutAccount: boolean;
  nameMatch: boolean | null;
  updatedAt: string;
}

const TABS = [
  { id: 'all', label: '全部' },
  { id: 'verified', label: '已认证' },
  { id: 'unverified', label: '未认证' },
];

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN');
}

function nameMatchKind(match: boolean | null): PlatformStatusKind {
  if (match === true) return 'success';
  if (match === false) return 'warning';
  return 'muted';
}

function nameMatchLabel(match: boolean | null) {
  if (match === true) return '一致';
  if (match === false) return '不一致';
  return '—';
}

interface Props {
  onNavigate?: (view: PlatformView) => void;
}

export default function PlatformProviderIdentityView({ onNavigate }: Props) {
  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState<IdentityRow[]>([]);
  const [selected, setSelected] = useState<IdentityRow | null>(null);
  const [providerName, setProviderName] = useState('');
  const [realName, setRealName] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (tab === 'verified' || tab === 'unverified') params.set('status', tab);
    if (providerName.trim()) params.set('providerName', providerName.trim());
    if (realName.trim()) params.set('realName', realName.trim());
    platformApiFetch(`/api/platform/provider-identities?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(d.identities ?? []));
  }, [tab, providerName, realName]);

  useEffect(() => {
    load();
    setSelected(null);
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!includesText(r.providerName, providerName)) return false;
        if (!includesText(r.identityRealName, realName)) return false;
        return matchesDateRange(r.identityVerifiedAt, dateSince, dateUntil);
      }),
    [rows, providerName, realName, dateSince, dateUntil]
  );

  const stats = useMemo(() => {
    const verified = filtered.filter((r) => r.identityVerified).length;
    const unverified = filtered.filter((r) => !r.identityVerified).length;
    const mismatch = filtered.filter((r) => r.nameMatch === false).length;
    return { total: filtered.length, verified, unverified, mismatch };
  }, [filtered]);

  const columns = [
    {
      key: 'name',
      header: '接单方',
      render: (r: IdentityRow) => <span className="font-medium">{r.providerName}</span>,
    },
    {
      key: 'identity',
      header: '实名状态',
      render: (r: IdentityRow) => (
        <PlatformStatusTag
          label={r.identityVerified ? '已认证' : '未认证'}
          kind={r.identityVerified ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'realName',
      header: '实名姓名',
      render: (r: IdentityRow) => r.identityRealName ?? '—',
    },
    {
      key: 'idMask',
      header: '证件号（脱敏）',
      render: (r: IdentityRow) => r.identityIdNumberMask ?? '—',
    },
    {
      key: 'verifiedAt',
      header: '认证时间',
      render: (r: IdentityRow) => (
        <span className="text-xs">{formatTime(r.identityVerifiedAt)}</span>
      ),
    },
    {
      key: 'payoutName',
      header: '账户实名',
      render: (r: IdentityRow) =>
        r.hasPayoutAccount ? (r.payoutAccountName ?? '—') : '—',
    },
    {
      key: 'payoutAccount',
      header: '收款账号',
      render: (r: IdentityRow) =>
        r.hasPayoutAccount ? (
          <span className="font-mono text-xs break-all">{r.payoutAccountLabel ?? '—'}</span>
        ) : (
          <PlatformStatusTag label="未绑定" kind="muted" />
        ),
    },
    {
      key: 'match',
      header: '姓名一致',
      render: (r: IdentityRow) =>
        r.identityVerified ? (
          <PlatformStatusTag label={nameMatchLabel(r.nameMatch)} kind={nameMatchKind(r.nameMatch)} />
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-bold">接单端实名认证</h2>
          <p className="text-xs text-[var(--platform-text-tertiary)] mt-1">
            查看已入驻接单方的身份证实名与提现账户；实名由接单方在个人中心提交，平台侧只读。当前 MVP 仅支持支付宝收款。
          </p>
        </div>

        <PlatformStatSummary
          items={[
            { label: '当前列表', value: stats.total },
            { label: '已认证', value: stats.verified },
            { label: '未认证', value: stats.unverified },
            { label: '姓名不一致', value: stats.mismatch },
          ]}
        />

        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />

        <PlatformFilterBar
          onReset={() => {
            setProviderName('');
            setRealName('');
            setDateSince('');
            setDateUntil('');
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
          <PlatformFilterField label="实名姓名">
            <input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="身份证姓名"
              className="platform-filter-input"
            />
          </PlatformFilterField>
          <PlatformFilterDateRange
            since={dateSince}
            until={dateUntil}
            onSinceChange={setDateSince}
            onUntilChange={setDateUntil}
          />
        </PlatformFilterBar>

        <PlatformDataTable<IdentityRow>
          rows={filtered}
          rowKey={(r) => r.providerId}
          selectedKey={selected?.providerId}
          onRowClick={setSelected}
          columns={columns}
          emptyText="暂无符合条件的接单方"
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
          statusLabel={selected.identityVerified ? '已实名认证' : '未实名认证'}
          statusKind={selected.identityVerified ? 'success' : 'warning'}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4 text-sm">
            <section>
              <h4 className="text-xs font-semibold mb-2">联系信息</h4>
              <p>联系人：{selected.contactName ?? '—'}</p>
              <p>手机：{selected.phone ?? '—'}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold mb-2">实名信息</h4>
              {selected.identityVerified ? (
                <>
                  <p>姓名：{selected.identityRealName ?? '—'}</p>
                  <p>证件号（脱敏）：{selected.identityIdNumberMask ?? '—'}</p>
                  <p>认证时间：{formatTime(selected.identityVerifiedAt)}</p>
                </>
              ) : (
                <p className="text-xs text-[var(--platform-text-tertiary)]">
                  接单方尚未在个人中心完成身份证实名认证。
                </p>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold mb-2">提现账户</h4>
              {selected.hasPayoutAccount ? (
                <>
                  <p>
                    渠道：
                    {payoutChannelLabel(selected.payoutChannel)}
                  </p>
                  <p>账户实名：{selected.payoutAccountName ?? '—'}</p>
                  <p>
                    收款账号：
                    <span className="font-mono break-all">{selected.payoutAccountLabel ?? '—'}</span>
                  </p>
                  {selected.identityVerified && (
                    <p className="mt-2">
                      与身份证姓名：
                      <PlatformStatusTag
                        label={nameMatchLabel(selected.nameMatch)}
                        kind={nameMatchKind(selected.nameMatch)}
                      />
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-[var(--platform-text-tertiary)]">尚未绑定提现账户。</p>
              )}
            </section>

            {selected.nameMatch === false && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                提现账户姓名与身份证实名不一致，提现审核时请重点核对。
              </p>
            )}

            {onNavigate && (
              <section className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 space-y-2">
                <h4 className="text-xs font-semibold">关联页面</h4>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('providers')}>
                    接单方主体
                  </button>
                  <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('provider_accounts')}>
                    账户余额
                  </button>
                  <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('provider_withdrawals')}>
                    提现管理
                  </button>
                </div>
              </section>
            )}

            <p className="text-[10px] text-[var(--platform-text-tertiary)]">
              最近更新：{formatTime(selected.updatedAt)}
            </p>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
