import { useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PLATFORM_NAV_GROUPS, PLATFORM_PERMISSION_LABELS } from '../nav';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface MemberRow {
  id: string;
  name: string;
  role: string;
  status: string;
  lastLogin: string;
  phone?: string | null;
}

interface RoleMatrixRow {
  role: string;
  label: string;
  permissions: string[];
  permissionLabels?: string[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  ops: '运营',
  reviewer: '审核',
  support: '客服',
};

const TABS = [
  { id: 'members', label: '成员列表' },
  { id: 'matrix', label: '权限矩阵' },
];

function labelPermission(key: string) {
  return PLATFORM_PERMISSION_LABELS[key] ?? key;
}

type Section = 'members' | 'permissions' | 'all';

interface Props {
  /** 独立菜单入口：成员 / 角色权限；all 保留 Tab 切换（兼容旧入口） */
  section?: Section;
}

export default function PlatformRolesView({ section = 'all' }: Props) {
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<RoleMatrixRow[]>([]);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [tab, setTab] = useState(section === 'permissions' ? 'matrix' : 'members');
  const showMembers = section === 'all' || section === 'members';
  const showPermissions = section === 'all' || section === 'permissions';

  useEffect(() => {
    platformApiFetch('/api/platform/members')
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setRoleMatrix(d.roleMatrix ?? []);
      });
  }, []);

  const selectedRole = selected ? roleMatrix.find((r) => r.role === selected.role) : null;

  const toggleMemberStatus = async (member?: MemberRow) => {
    const target = member ?? selected;
    if (!target) return;
    const next = target.status === '启用' ? 'frozen' : 'active';
    const res = await platformFetch(role, `/api/platform/users/${target.id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: next, role }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast(next === 'frozen' ? '成员已停用' : '成员已启用', 'success');
    platformApiFetch('/api/platform/members')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
    if (selected?.id === target.id) {
      setSelected({ ...target, status: next === 'frozen' ? '已停用' : '启用' });
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '成员数', value: members.length },
            { label: '角色类型', value: roleMatrix.length },
            { label: '已启用', value: members.filter((m) => m.status === '启用').length },
          ]}
        />
        {section === 'all' && <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />}

        {section === 'members' && (
          <p className="text-xs text-[var(--platform-text-tertiary)]">
            管理可登录平台后台的内部成员账号，分配角色并启用/停用。
          </p>
        )}
        {section === 'permissions' && (
          <p className="text-xs text-[var(--platform-text-tertiary)]">
            查看管理员、运营、审核、客服等角色各自可访问的模块与操作权限（演示数据来自权限矩阵）。
          </p>
        )}

        {showMembers && (section === 'members' || tab === 'members') ? (
          <PlatformDataTable<MemberRow>
            rows={members}
            rowKey={(r) => r.id}
            selectedKey={selected?.id}
            onRowClick={setSelected}
            columns={[
              { key: 'name', header: '姓名', render: (r) => <span className="font-medium">{r.name}</span> },
              { key: 'role', header: '角色', render: (r) => ROLE_LABELS[r.role] ?? r.role },
              {
                key: 'status',
                header: '状态',
                render: (r) => (
                  <PlatformStatusTag
                    label={r.status}
                    kind={r.status === '启用' ? 'success' : 'danger'}
                  />
                ),
              },
              { key: 'login', header: '最近登录', render: (r) => r.lastLogin },
            ]}
            renderActions={(r) => (
              <PlatformTableActions>
                <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
                {can('users') && (
                  <PlatformTableAction
                    label={r.status === '启用' ? '停用' : '启用'}
                    variant={r.status === '启用' ? 'danger' : 'primary'}
                    onClick={() => void toggleMemberStatus(r)}
                  />
                )}
              </PlatformTableActions>
            )}
          />
        ) : showPermissions ? (
          <div className="space-y-3">
            {roleMatrix.map((row) => (
              <div key={row.role}>
              <PlatformCard title={row.label}>
                <div className="flex flex-wrap gap-1.5">
                  {(row.permissionLabels ?? row.permissions.map(labelPermission)).map((label) => (
                    <span
                      key={label}
                      className="rounded-md border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] px-2 py-1 text-[11px] text-[var(--platform-text-secondary)]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </PlatformCard>
              </div>
            ))}
            <PlatformCard title="模块权限对照">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {PLATFORM_NAV_GROUPS.flatMap((g) => g.items).map((item) => (
                  <span key={item.id} className="rounded border border-[var(--platform-border-subtle)] px-2 py-1.5 text-xs text-[var(--platform-text-secondary)]">
                    {item.label}
                  </span>
                ))}
              </div>
            </PlatformCard>
          </div>
        ) : null}
      </div>

      {selected && selectedRole && showMembers && (section === 'members' || tab === 'members') && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={selected.status}
          statusKind="success"
          onClose={() => setSelected(null)}
          footer={can('users') ? (
            <div className="flex gap-2">
              <button type="button" className="geo-btn-secondary text-sm flex-1" onClick={() => void toggleMemberStatus()}>
                {selected.status === '启用' ? '停用成员' : '启用成员'}
              </button>
            </div>
          ) : undefined}
        >
          <div className="space-y-3 text-sm">
            <p><span className="text-[var(--platform-text-tertiary)]">角色：</span>{ROLE_LABELS[selected.role] ?? selected.role}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">手机：</span>{selected.phone ?? '—'}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">最近登录：</span>{selected.lastLogin}</p>
            <div>
              <h4 className="mb-2 text-xs font-semibold">权限列表</h4>
              <div className="flex flex-wrap gap-1.5">
                {(selectedRole.permissionLabels ?? selectedRole.permissions.map(labelPermission)).map((label) => (
                  <span key={label} className="rounded bg-[var(--platform-primary-bg)] px-2 py-0.5 text-[10px] text-[var(--platform-primary)]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
