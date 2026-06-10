import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { loadUserProfile, saveUserProfile, type UserProfile } from '../lib/user-profile';
import {
  type OrganizationCert,
  type AccountType,
  ORG_CERT_STATUS_LABEL,
  ORG_CERT_STATUS_CLASS,
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_CLASS,
} from '../lib/organization-cert';

type CenterTab = 'profile' | 'organization';

export default function UserCenterView() {
  const { toast } = useToast();
  const [tab, setTab] = useState<CenterTab>('profile');
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [organization, setOrganization] = useState<OrganizationCert | null>(null);
  const [certForm, setCertForm] = useState({ legalName: '' });
  const [certSubmitting, setCertSubmitting] = useState(false);

  const loadPublisherMe = useCallback(() => {
    fetch('/api/publisher/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me) return;
        if (me.displayName || me.phone) {
          setProfile((prev) => ({
            displayName: String(me.displayName ?? prev.displayName),
            phone: String(me.phone ?? prev.phone),
          }));
        }
        if (me.accountType === 'enterprise' || me.accountType === 'personal') {
          setAccountType(me.accountType);
        }
      })
      .catch(() => {});
  }, []);

  const loadOrganization = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        if (d.accountType === 'enterprise' || d.accountType === 'personal') {
          setAccountType(d.accountType);
        }
        const org = d.organization as OrganizationCert | null | undefined;
        setOrganization(org ?? null);
        setCertForm((prev) => ({
          legalName: org?.legalName ?? org?.name ?? prev.legalName,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPublisherMe();
    loadOrganization();
  }, [loadPublisherMe, loadOrganization]);

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
    const legalName = certForm.legalName.trim();
    if (!legalName) {
      toast('请填写企业/主体名称', 'error');
      return;
    }
    setCertSubmitting(true);
    fetch('/api/organization/certification/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legalName }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast(d.error, 'error');
          return;
        }
        if (d.organization) setOrganization(d.organization);
        loadOrganization();
        toast('企业认证资料已提交，请等待平台审核', 'success');
      })
      .finally(() => setCertSubmitting(false));
  };

  const certStatus = organization?.certStatus;
  const canSubmitCert =
    !organization ||
    certStatus === 'uncertified' ||
    certStatus === 'rejected';

  return (
    <div className="geo-page-content max-w-2xl space-y-4">
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
          企业认证
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
                  当前账号身份
                </p>
                <p className="text-xl font-bold mt-1">{ACCOUNT_TYPE_LABEL[accountType]}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded border shrink-0 ${ACCOUNT_TYPE_CLASS[accountType]}`}
              >
                {ACCOUNT_TYPE_LABEL[accountType]}
              </span>
            </div>

            {organization && (
              <div
                className="flex items-center justify-between gap-3 p-3 rounded-lg border text-xs"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <div>
                  <p className="geo-label mb-1">认证主体</p>
                  <p className="font-medium">{organization.legalName ?? organization.name}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded border shrink-0 ${ORG_CERT_STATUS_CLASS[organization.certStatus]}`}
                >
                  {ORG_CERT_STATUS_LABEL[organization.certStatus]}
                </span>
              </div>
            )}

            {!organization && (
              <div className="geo-callout-info text-xs">
                您尚未提交企业认证。填写下方主体信息并提交后，平台将进行审核。
              </div>
            )}

            {certStatus === 'pending' && (
              <div className="geo-callout-warning text-xs">
                已提交认证，平台审核中。提交时间：
                {organization?.certSubmittedAt
                  ? new Date(organization.certSubmittedAt).toLocaleString('zh-CN')
                  : '—'}
              </div>
            )}

            {certStatus === 'approved' && (
              <dl className="grid grid-cols-1 gap-3 text-xs">
                <div>
                  <dt className="geo-label mb-1">主体名称</dt>
                  <dd className="font-medium">{organization?.legalName ?? organization?.name}</dd>
                </div>
              </dl>
            )}

            {certStatus === 'rejected' && (
              <div
                className="text-xs p-3 rounded-lg border"
                style={{
                  borderColor: 'var(--color-danger)',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                }}
              >
                审核未通过：{organization?.certRejectReason ?? '请修改资料后重新提交'}
              </div>
            )}

            {canSubmitCert && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                <h3 className="text-sm font-semibold">提交企业主体信息</h3>
                <div>
                  <label className="geo-label block mb-1.5">企业 / 主体名称</label>
                  <input
                    className="geo-input w-full"
                    value={certForm.legalName}
                    onChange={(e) => setCertForm({ legalName: e.target.value })}
                    placeholder="请填写企业全称"
                  />
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

          <div className="geo-callout-info text-xs">
            品牌与投放账户资料仍在侧栏「品牌与账户」中维护，与企业认证相互独立。
          </div>
        </div>
      )}
    </div>
  );
}
