import { useEffect, useState } from 'react';
import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PLATFORM_NAV_GROUPS, PLATFORM_PERMISSION_LABELS } from '../nav';

interface MemberRow {
  id: string;
  name: string;
  role: string;
  status: string;
  lastLogin: string;
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

export default function PlatformRolesView() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<RoleMatrixRow[]>([]);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [tab, setTab] = useState('members');

  useEffect(() => {
    fetch('/api/platform/members')
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setRoleMatrix(d.roleMatrix ?? []);
      });
  }, []);

  const selectedRole = selected ? roleMatrix.find((r) => r.role === selected.role) : null;

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
        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'members' ? (
          <PlatformDataTable<MemberRow>
            rows={members}
            rowKey={(r) => r.id}
            onRowClick={setSelected}
            columns={[
              { key: 'name', header: '姓名', render: (r) => <span className="font-medium">{r.name}</span> },
              { key: 'role', header: '角色', render: (r) => ROLE_LABELS[r.role] ?? r.role },
              { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={r.status} kind="success" /> },
              { key: 'login', header: '最近登录', render: (r) => r.lastLogin },
            ]}
          />
        ) : (
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
        )}
      </div>

      {selected && selectedRole && tab === 'members' && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={selected.status}
          statusKind="success"
          onClose={() => setSelected(null)}
          footer={(
            <div className="flex gap-2">
              <button type="button" className="geo-btn-primary text-sm flex-1">保存权限</button>
              <button type="button" className="geo-btn-secondary text-sm flex-1">停用成员</button>
            </div>
          )}
        >
          <div className="space-y-3 text-sm">
            <p><span className="text-[var(--platform-text-tertiary)]">角色：</span>{ROLE_LABELS[selected.role] ?? selected.role}</p>
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
