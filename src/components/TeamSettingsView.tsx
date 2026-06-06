import { useEffect, useState } from 'react';

interface Member {
  id: string;
  userId: string;
  displayName: string;
  role: string;
}

interface Permission {
  id: string;
  userId: string;
  role: string;
  brand?: { name: string };
}

interface Props {
  brandName: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: '组织负责人',
  admin: '管理员',
  editor: '编辑',
  viewer: '只读',
  member: '成员',
};

export default function TeamSettingsView({ brandName }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [externalUserId, setExternalUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/organization/members')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
    fetch('/api/organization/external-account')
      .then((r) => r.json())
      .then((d) => setExternalUserId(d.link?.externalUserId ?? null));
  }, []);

  useEffect(() => {
    const q =
      brandName === '__all__'
        ? ''
        : `?brandName=${encodeURIComponent(brandName)}`;
    fetch(`/api/organization/brand-permissions${q}`)
      .then((r) => r.json())
      .then((d) => setPermissions(d.permissions ?? []));
  }, [brandName]);

  return (
    <div className="geo-page-content max-w-3xl space-y-4">
      <div className="geo-card p-4 text-xs" style={{ color: 'var(--neutral-text-02)' }}>
        演示版团队权限：组织成员与品牌授权只读展示。正式上线需对接统一账号与 Agent 云{' '}
        <code>ExternalAccountLink</code>。
      </div>

      <div className="geo-card p-4">
        <h3 className="font-semibold text-sm mb-2">Agent 云账号映射</h3>
        <p className="text-sm">
          {externalUserId ? (
            <>已关联外部用户：<span className="font-mono">{externalUserId}</span></>
          ) : (
            '尚未关联 Agent 云账号'
          )}
        </p>
      </div>

      <div className="geo-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          组织成员
        </div>
        <table className="w-full text-sm geo-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>用户 ID</th>
              <th>角色</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.displayName}</td>
                <td className="font-mono text-xs">{m.userId}</td>
                <td>{ROLE_LABEL[m.role] ?? m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="geo-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          品牌权限{brandName === '__all__' ? '（全部品牌）' : `（${brandName}）`}
        </div>
        <table className="w-full text-sm geo-table">
          <thead>
            <tr>
              {brandName === '__all__' && <th>品牌</th>}
              <th>用户 ID</th>
              <th>角色</th>
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={brandName === '__all__' ? 3 : 2} className="text-center py-4 text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                  暂无品牌授权记录
                </td>
              </tr>
            ) : (
              permissions.map((p) => (
                <tr key={p.id}>
                  {brandName === '__all__' && <td>{p.brand?.name ?? '—'}</td>}
                  <td className="font-mono text-xs">{p.userId}</td>
                  <td>{ROLE_LABEL[p.role] ?? p.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
