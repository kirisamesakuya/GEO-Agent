import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { loadUserProfile, saveUserProfile, type UserProfile } from '../lib/user-profile';
import {
  type OrganizationCert,
  ORG_CERT_STATUS_LABEL,
  ORG_CERT_STATUS_CLASS,
} from '../lib/organization-cert';

type CenterTab = 'profile' | 'organization';

export default function UserCenterView() {
  const { toast } = useToast();
  const [tab, setTab] = useState<CenterTab>('profile');
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [organization, setOrganization] = useState<OrganizationCert | null>(null);
  const [members, setMembers] = useState<Array<{ displayName: string; role: string; userId: string }>>([]);
  const [certForm, setCertForm] = useState({
    legalName: '',
    uscc: '',
    contactName: '',
    contactPhone: '',
  });
  const [certSubmitting, setCertSubmitting] = useState(false);

  const loadOrganization = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((d) => {
        const org = d.organization as OrganizationCert | undefined;
        if (!org) return;
        setOrganization(org);
        setCertForm({
          legalName: org.legalName ?? org.name ?? '',
          uscc: org.uscc ?? '',
          contactName: org.contactName ?? '',
          contactPhone: org.contactPhone ?? profile.phone,
        });
      })
      .catch(() => {});
  }, [profile.phone]);

  useEffect(() => {
    loadOrganization();
    fetch('/api/organization/members')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .catch(() => {});
  }, [loadOrganization]);

  const handleSave = () => {
    const displayName = profile.displayName.trim();
    const phone = profile.phone.trim();
    if (!displayName) {
      toast('请填写昵称', 'error');
      return;
    }
    if (!phone) {
      toast('请填写手机号', 'error');
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      toast('请输入有效的 11 位手机号', 'error');
      return;
    }
    saveUserProfile({ displayName, phone });
    setProfile({ displayName, phone });
    toast('个人信息已保存', 'success');
  };

  const handleCertSubmit = () => {
    setCertSubmitting(true);
    fetch('/api/organization/certification/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(certForm),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast(d.error, 'error');
          return;
        }
        if (d.organization) setOrganization(d.organization);
        toast('认证资料已提交，请等待平台审核', 'success');
      })
      .finally(() => setCertSubmitting(false));
  };

  const canSubmitCert =
    organization &&
    (organization.certStatus === 'uncertified' || organization.certStatus === 'rejected');

  const ROLE_LABEL: Record<string, string> = {
    owner: '组织负责人',
    admin: '管理员',
    editor: '编辑',
    viewer: '只读',
    member: '成员',
  };

  return (
    <div className="geo-page-content max-w-2xl space-y-4 overflow-y-auto h-full">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`text-sm px-4 py-2 rounded-lg border ${tab === 'profile' ? 'geo-nav-active' : 'geo-nav-item'}`}
          style={{ borderColor: tab === 'profile' ? undefined : 'var(--neutral-divider-02)' }}
        >
          个人信息
        </button>
        <button
          type="button"
          onClick={() => setTab('organization')}
          className={`text-sm px-4 py-2 rounded-lg border ${tab === 'organization' ? 'geo-nav-active' : 'geo-nav-item'}`}
          style={{ borderColor: tab === 'organization' ? undefined : 'var(--neutral-divider-02)' }}
        >
          组织信息
        </button>
      </div>

      {tab === 'profile' && (
        <div className="geo-card p-6 space-y-4">
          <h2 className="text-sm font-semibold">个人基础信息</h2>
          <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
            产品使用手机号注册，仅保存昵称与手机号。
          </p>
          <div>
            <label className="geo-label block mb-1.5" htmlFor="profile-name">
              昵称
            </label>
            <input
              id="profile-name"
              className="geo-input w-full"
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              placeholder="在团队内显示的称呼"
            />
          </div>
          <div>
            <label className="geo-label block mb-1.5" htmlFor="profile-phone">
              手机号
            </label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={11}
              className="geo-input w-full"
              value={profile.phone}
              onChange={(e) =>
                setProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))
              }
              placeholder="11 位中国大陆手机号"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button type="button" className="geo-btn-primary text-sm" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      )}

      {tab === 'organization' && (
        <div className="space-y-4">
          <div className="geo-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                  组织认证
                </p>
                <p className="text-xl font-bold mt-1">{organization?.name ?? '—'}</p>
              </div>
              {organization && (
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded border shrink-0 ${ORG_CERT_STATUS_CLASS[organization.certStatus]}`}
                >
                  {ORG_CERT_STATUS_LABEL[organization.certStatus]}
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--neutral-text-03)' }}>
              完成组织认证后，平台将审核主体资质。认证通过后可正式使用组织级能力；品牌资料仍在侧栏「品牌与账户」中维护。
            </p>

            {organization?.certStatus === 'pending' && (
              <div className="geo-callout-warning text-xs">
                已提交认证，平台审核中。提交时间：
                {organization.certSubmittedAt
                  ? new Date(organization.certSubmittedAt).toLocaleString('zh-CN')
                  : '—'}
              </div>
            )}

            {organization?.certStatus === 'approved' && (
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="geo-label mb-1">主体名称</dt>
                  <dd className="font-medium">{organization.legalName ?? organization.name}</dd>
                </div>
                <div>
                  <dt className="geo-label mb-1">统一社会信用代码</dt>
                  <dd className="font-mono">{organization.uscc ?? '—'}</dd>
                </div>
                <div>
                  <dt className="geo-label mb-1">联系人</dt>
                  <dd>{organization.contactName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="geo-label mb-1">联系电话</dt>
                  <dd>{organization.contactPhone ?? '—'}</dd>
                </div>
              </dl>
            )}

            {organization?.certStatus === 'rejected' && (
              <div
                className="text-xs p-3 rounded-lg border"
                style={{
                  borderColor: 'var(--color-danger)',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                }}
              >
                审核未通过：{organization.certRejectReason ?? '请修改资料后重新提交'}
              </div>
            )}

            {canSubmitCert && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                <h3 className="text-sm font-semibold">提交认证资料</h3>
                <div>
                  <label className="geo-label block mb-1.5">企业 / 主体名称</label>
                  <input
                    className="geo-input w-full"
                    value={certForm.legalName}
                    onChange={(e) => setCertForm((f) => ({ ...f, legalName: e.target.value }))}
                    placeholder="与营业执照一致"
                  />
                </div>
                <div>
                  <label className="geo-label block mb-1.5">统一社会信用代码</label>
                  <input
                    className="geo-input w-full font-mono uppercase"
                    value={certForm.uscc}
                    maxLength={18}
                    onChange={(e) =>
                      setCertForm((f) => ({
                        ...f,
                        uscc: e.target.value.replace(/\s/g, '').toUpperCase().slice(0, 18),
                      }))
                    }
                    placeholder="18 位"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="geo-label block mb-1.5">联系人</label>
                    <input
                      className="geo-input w-full"
                      value={certForm.contactName}
                      onChange={(e) => setCertForm((f) => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="geo-label block mb-1.5">联系人手机</label>
                    <input
                      className="geo-input w-full"
                      type="tel"
                      maxLength={11}
                      value={certForm.contactPhone}
                      onChange={(e) =>
                        setCertForm((f) => ({
                          ...f,
                          contactPhone: e.target.value.replace(/\D/g, '').slice(0, 11),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="geo-btn-primary text-sm"
                    disabled={certSubmitting}
                    onClick={handleCertSubmit}
                  >
                    {certSubmitting ? '提交中…' : '提交认证'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {members.length > 0 && (
            <div className="geo-card overflow-hidden">
              <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                组织成员（只读）
              </div>
              <table className="w-full text-sm geo-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>角色</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.userId}>
                      <td>{m.displayName}</td>
                      <td>{ROLE_LABEL[m.role] ?? m.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
