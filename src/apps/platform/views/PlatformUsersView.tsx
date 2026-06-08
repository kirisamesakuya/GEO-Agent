import { useEffect, useMemo, useState } from 'react';
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
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface UserRow {
  id: string;
  userNo: number;
  phone: string | null;
  displayName: string | null;
  accountType: string;
  status: string;
  userType: string;
  platformRole: string | null;
  providerName: string | null;
  providerApplicationStatus: string | null;
  organizationName: string | null;
  certStatus: string | null;
  createdAt: string;
  lastLogin: string | null;
}

interface UserDetail {
  user: Record<string, unknown>;
  organization: Record<string, unknown> | null;
  provider: Record<string, unknown> | null;
  budgetAccount: { brandName: string; balance: number; frozen: number } | null;
  wallet: { extractable: number; frozen: number; withdrawn: number } | null;
  loginLogs: Array<{ id: string; result: string; reason: string | null; ip: string | null; createdAt: string }>;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  personal: '个人用户',
  enterprise: '企业用户',
};

const CERT_STATUS_LABELS: Record<string, string> = {
  uncertified: '未认证',
  pending: '认证审核中',
  approved: '已认证',
  rejected: '认证驳回',
};

const PROVIDER_APP_LABELS: Record<string, string> = {
  draft: '资料草稿',
  submitted: '待入驻审核',
  approved: '已入驻',
  rejected: '入驻驳回',
};

const SCOPE_META = {
  publisher: {
    title: '发布端注册用户',
    subtitle: '手机号注册的商家用户；个人用户提交企业认证后升级为企业用户。v1 不支持邀请成员。',
    userType: 'publisher' as const,
  },
  provider: {
    title: '接单端注册用户',
    subtitle: '手机号注册的接单方用户，绑定接单主体后可申请入驻与提现。',
    userType: 'provider' as const,
  },
};

function certKind(status: string | null) {
  if (status === 'approved') return 'success' as const;
  if (status === 'pending') return 'pending' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'muted' as const;
}

function appKind(status: string | null) {
  if (status === 'approved') return 'success' as const;
  if (status === 'submitted') return 'pending' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'muted' as const;
}

interface Props {
  scope: 'publisher' | 'provider';
}

export default function PlatformUsersView({ scope }: Props) {
  const meta = SCOPE_META[scope];
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [userNo, setUserNo] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [certStatus, setCertStatus] = useState('');
  const [appStatus, setAppStatus] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const resetFilters = () => {
    setUserNo('');
    setPhone('');
    setDisplayName('');
    setOrganizationName('');
    setAccountType('');
    setAccountStatus('');
    setCertStatus('');
    setAppStatus('');
    setDateSince('');
    setDateUntil('');
  };

  const loadList = () => {
    const params = new URLSearchParams({ userType: meta.userType });
    if (userNo.trim()) params.set('userNo', userNo.trim());
    if (phone.trim()) params.set('phone', phone.trim());
    if (displayName.trim()) params.set('displayName', displayName.trim());
    if (organizationName.trim() && scope === 'publisher') params.set('organizationName', organizationName.trim());
    if (accountType) params.set('accountType', accountType);
    if (accountStatus) params.set('status', accountStatus);
    if (certStatus && scope === 'publisher') params.set('certStatus', certStatus);
    platformApiFetch(`/api/platform/users?${params}`)
      .then((r) => r.json())
      .then((d) => {
        let rows: UserRow[] = d.users ?? [];
        if (appStatus && scope === 'provider') {
          rows = rows.filter((r) => r.providerApplicationStatus === appStatus);
        }
        if (dateSince || dateUntil) {
          rows = rows.filter((r) => matchesDateRange(r.createdAt, dateSince, dateUntil));
        }
        setUsers(rows);
      });
  };

  useEffect(() => {
    loadList();
  }, [userNo, phone, displayName, organizationName, accountType, accountStatus, certStatus, appStatus, dateSince, dateUntil, scope]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    platformApiFetch(`/api/platform/users/${selected.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { toast(d.error, 'error'); return; }
        setDetail(d);
      })
      .finally(() => setDetailLoading(false));
  }, [selected, toast]);

  const toggleStatus = async (userId: string, next: 'active' | 'frozen') => {
    const res = await platformFetch(role, `/api/platform/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: next, reason: statusReason || undefined, role }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast(next === 'frozen' ? '已冻结' : '已解冻', 'success');
    setStatusReason('');
    loadList();
    if (selected?.id === userId) {
      setSelected({ ...selected, status: next });
    }
  };

  const summaryItems = useMemo(() => {
    if (scope === 'publisher') {
      return [
        { label: '注册用户', value: users.length },
        { label: '个人用户', value: users.filter((u) => u.accountType === 'personal').length },
        { label: '企业用户', value: users.filter((u) => u.accountType === 'enterprise').length },
        { label: '认证审核中', value: users.filter((u) => u.certStatus === 'pending').length },
        { label: '已冻结', value: users.filter((u) => u.status === 'frozen').length },
      ];
    }
    return [
      { label: '注册用户', value: users.length },
      { label: '已入驻', value: users.filter((u) => u.providerApplicationStatus === 'approved').length },
      { label: '待审核', value: users.filter((u) => u.providerApplicationStatus === 'submitted').length },
      { label: '资料草稿', value: users.filter((u) => u.providerApplicationStatus === 'draft').length },
      { label: '已冻结', value: users.filter((u) => u.status === 'frozen').length },
    ];
  }, [users, scope]);

  const columns = scope === 'publisher'
    ? [
        { key: 'name', header: '姓名', render: (r: UserRow) => <span className="font-medium">{r.displayName ?? '—'}</span> },
        {
          key: 'userNo',
          header: '用户编号',
          render: (r: UserRow) => (
            <span className="font-mono text-sm font-medium tabular-nums" title={`内部ID: ${r.id}`}>
              {r.userNo}
            </span>
          ),
        },
        { key: 'phone', header: '手机号', render: (r: UserRow) => r.phone ?? '—' },
        {
          key: 'account',
          header: '用户属性',
          render: (r: UserRow) => ACCOUNT_TYPE_LABELS[r.accountType] ?? r.accountType,
        },
        {
          key: 'org',
          header: '组织/品牌',
          render: (r: UserRow) => r.organizationName ?? <span className="text-[var(--platform-text-tertiary)]">未创建</span>,
        },
        {
          key: 'cert',
          header: '企业认证',
          render: (r: UserRow) => (
            <PlatformStatusTag
              label={CERT_STATUS_LABELS[r.certStatus ?? 'uncertified'] ?? '未认证'}
              kind={certKind(r.certStatus)}
            />
          ),
        },
        {
          key: 'status',
          header: '账号',
          render: (r: UserRow) => (
            <PlatformStatusTag label={r.status === 'active' ? '正常' : '已冻结'} kind={r.status === 'active' ? 'success' : 'danger'} />
          ),
        },
        { key: 'reg', header: '注册时间', render: (r: UserRow) => new Date(r.createdAt).toLocaleDateString('zh-CN') },
      ]
    : [
        { key: 'name', header: '姓名', render: (r: UserRow) => <span className="font-medium">{r.displayName ?? '—'}</span> },
        {
          key: 'userNo',
          header: '用户编号',
          render: (r: UserRow) => (
            <span className="font-mono text-sm font-medium tabular-nums" title={`内部ID: ${r.id}`}>
              {r.userNo}
            </span>
          ),
        },
        { key: 'phone', header: '手机号', render: (r: UserRow) => r.phone ?? '—' },
        { key: 'provider', header: '接单主体', render: (r: UserRow) => r.providerName ?? '—' },
        {
          key: 'app',
          header: '入驻状态',
          render: (r: UserRow) => (
            <PlatformStatusTag
              label={PROVIDER_APP_LABELS[r.providerApplicationStatus ?? 'draft'] ?? '—'}
              kind={appKind(r.providerApplicationStatus)}
            />
          ),
        },
        {
          key: 'status',
          header: '账号',
          render: (r: UserRow) => (
            <PlatformStatusTag label={r.status === 'active' ? '正常' : '已冻结'} kind={r.status === 'active' ? 'success' : 'danger'} />
          ),
        },
        { key: 'reg', header: '注册时间', render: (r: UserRow) => new Date(r.createdAt).toLocaleDateString('zh-CN') },
        {
          key: 'login',
          header: '最近登录',
          render: (r: UserRow) => (r.lastLogin ? new Date(r.lastLogin).toLocaleDateString('zh-CN') : '—'),
        },
      ];

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-bold">{meta.title}</h2>
          <p className="text-xs text-[var(--platform-text-tertiary)] mt-1">{meta.subtitle}</p>
        </div>

        <PlatformStatSummary items={summaryItems} />

        <PlatformFilterBar onReset={resetFilters}>
          <PlatformFilterField label="用户编号">
            <input value={userNo} onChange={(e) => setUserNo(e.target.value.replace(/\D/g, ''))} placeholder="如 3" inputMode="numeric" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="手机号">
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 位手机号" inputMode="tel" maxLength={11} className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="姓名">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="昵称/姓名" className="platform-filter-input" />
          </PlatformFilterField>
          {scope === 'publisher' && (
            <PlatformFilterField label="组织">
              <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="组织名称" className="platform-filter-input" />
            </PlatformFilterField>
          )}
          {scope === 'publisher' && (
            <PlatformFilterField label="用户属性">
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="platform-filter-input">
                <option value="">全部</option>
                <option value="personal">个人用户</option>
                <option value="enterprise">企业用户</option>
              </select>
            </PlatformFilterField>
          )}
          <PlatformFilterField label="账号状态">
            <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="active">正常</option>
              <option value="frozen">已冻结</option>
            </select>
          </PlatformFilterField>
          {scope === 'publisher' && (
            <PlatformFilterField label="企业认证">
              <select value={certStatus} onChange={(e) => setCertStatus(e.target.value)} className="platform-filter-input">
                <option value="">全部</option>
                <option value="uncertified">未认证</option>
                <option value="pending">审核中</option>
                <option value="approved">已认证</option>
                <option value="rejected">已驳回</option>
              </select>
            </PlatformFilterField>
          )}
          {scope === 'provider' && (
            <PlatformFilterField label="入驻状态">
              <select value={appStatus} onChange={(e) => setAppStatus(e.target.value)} className="platform-filter-input">
                <option value="">全部</option>
                <option value="approved">已入驻</option>
                <option value="submitted">待审核</option>
                <option value="draft">资料草稿</option>
                <option value="rejected">已驳回</option>
              </select>
            </PlatformFilterField>
          )}
          <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
        </PlatformFilterBar>

        <PlatformDataTable<UserRow>
          rows={users}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          columns={columns}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              {can('users') && (
                r.status === 'active' ? (
                  <PlatformTableAction label="冻结" variant="danger" onClick={() => { setSelected(r); }} />
                ) : (
                  <PlatformTableAction label="解冻" variant="primary" onClick={() => { setSelected(r); }} />
                )
              )}
            </PlatformTableActions>
          )}
        />
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={selected.displayName ?? selected.phone ?? selected.id}
          statusLabel={selected.status === 'active' ? '正常' : '已冻结'}
          statusKind={selected.status === 'active' ? 'success' : 'danger'}
          onClose={() => { setSelected(null); setStatusReason(''); }}
          footer={can('users') && !detailLoading ? (
            <div className="space-y-2 w-full">
              <input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="操作原因（选填）"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              {selected.status === 'active' ? (
                <button type="button" className="geo-btn-secondary text-sm w-full"
                  onClick={() => void toggleStatus(selected.id, 'frozen')}>冻结账号</button>
              ) : (
                <button type="button" className="geo-btn-primary text-sm w-full"
                  onClick={() => void toggleStatus(selected.id, 'active')}>解冻账号</button>
              )}
            </div>
          ) : undefined}
        >
          {detailLoading || !detail ? (
            <p className="text-sm text-[var(--platform-text-tertiary)]">详情加载中…</p>
          ) : (
          <div className="space-y-4 text-sm">
            <section>
              <h4 className="text-xs font-semibold mb-2">注册信息</h4>
              <p>
                用户编号：
                <span className="font-mono font-medium tabular-nums ml-1">
                  {String(detail.user.userNo ?? selected.userNo)}
                </span>
              </p>
              <p>手机：{String(detail.user.phone ?? '—')}</p>
              <p className="text-xs text-[var(--platform-text-tertiary)] break-all">
                内部ID：{String(detail.user.id ?? selected.id)}
              </p>
              <p>注册时间：{new Date(String(detail.user.createdAt)).toLocaleString('zh-CN')}</p>
              {scope === 'publisher' && (
                <p>用户属性：{ACCOUNT_TYPE_LABELS[String(detail.user.accountType)] ?? String(detail.user.accountType)}</p>
              )}
            </section>

            {detail.organization && (
              <section>
                <h4 className="text-xs font-semibold mb-2">企业与组织</h4>
                <p>组织：{String(detail.organization.name)}</p>
                <p>认证：{CERT_STATUS_LABELS[String(detail.organization.certStatus)] ?? String(detail.organization.certStatus)}</p>
              </section>
            )}

            {detail.budgetAccount && (
              <section>
                <h4 className="text-xs font-semibold mb-2">投放账户</h4>
                <p>品牌：{detail.budgetAccount.brandName}</p>
                <p>可用余额：¥{detail.budgetAccount.balance.toLocaleString('zh-CN')}</p>
                <p>冻结：¥{detail.budgetAccount.frozen.toLocaleString('zh-CN')}</p>
              </section>
            )}

            {detail.provider && (
              <section>
                <h4 className="text-xs font-semibold mb-2">接单主体</h4>
                <p>名称：{String(detail.provider.name)}</p>
                <p>入驻：{PROVIDER_APP_LABELS[String(detail.provider.applicationStatus)] ?? String(detail.provider.applicationStatus)}</p>
              </section>
            )}

            {detail.wallet && (
              <section>
                <h4 className="text-xs font-semibold mb-2">可提现账户</h4>
                <p>可提现：¥{detail.wallet.extractable.toLocaleString('zh-CN')}</p>
                <p>冻结中：¥{detail.wallet.frozen.toLocaleString('zh-CN')}</p>
                <p>已提现：¥{detail.wallet.withdrawn.toLocaleString('zh-CN')}</p>
              </section>
            )}

            <section>
              <h4 className="text-xs font-semibold mb-2">登录记录</h4>
              {detail.loginLogs.length === 0 ? (
                <p className="text-[var(--platform-text-tertiary)]">无记录</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {detail.loginLogs.map((log) => (
                    <li key={log.id} className="flex justify-between gap-2">
                      <span>{log.result === 'success' ? '成功' : '失败'}{log.reason ? ` · ${log.reason}` : ''}</span>
                      <span className="text-[var(--platform-text-tertiary)]">{new Date(log.createdAt).toLocaleString('zh-CN')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          )}
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
