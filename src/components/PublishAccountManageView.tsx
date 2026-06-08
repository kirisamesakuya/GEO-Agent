import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Plus, RefreshCw, Settings2, Unlock, X } from 'lucide-react';
import { usePlatformAccountAuth } from '../hooks/usePlatformAccountAuth';
import { useToast } from '../context/ToastContext';
import {
  CUSTOM_PLATFORM_HINT_MAX,
  CUSTOM_PLATFORM_NAME_MAX,
  CUSTOM_PLATFORM_URL_MAX,
  DEFAULT_CUSTOM_PLATFORM_GRADIENT,
  defaultCustomPlatformAbbr,
  validateCustomPlatformInput,
} from '../../lib/custom-publish-platform';
import type { MediaPlatformCatalogEntry } from '../lib/media-platform-catalog';
import PlatformLogoUpload from './common/PlatformLogoUpload';
import { fetchPlatformAuthConfig, getBundledPlatformAuthConfig } from '../lib/platform-auth-client';
import {
  PUBLISH_ACCOUNT_SECTION_TITLE,
  bindingToLoginStatus,
  isPublishReady,
  providerLabel,
  publishAccountActionLabels,
} from '../lib/publish-account-login-status';
import type { AccountBinding, PlatformAuthConfig, ViewType } from '../types';
import BrandSwitcher from './common/BrandSwitcher';
import HermesStatusStrip from './hermes/HermesStatusStrip';
import PlatformBadge from './common/PlatformBadge';

interface AssignmentRow {
  id: string;
  accountId: string;
  targetName?: string;
  isDefault: boolean;
  enabled: boolean;
}

interface DrawerMeta {
  adAccountId?: string;
  ownerType?: string;
  ownerName?: string;
  platform: string;
  accountName: string;
  binding: AccountBinding;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function PublishAccountManageView({ brandName, onBrandChange, onNavigate }: Props) {
  const { toast } = useToast();
  const scopeBrand = brandName && brandName !== '__all__' ? brandName : '';
  const [platformConfig, setPlatformConfig] = useState<PlatformAuthConfig[]>([]);
  const [drawer, setDrawer] = useState<DrawerMeta | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [bindingMeta, setBindingMeta] = useState<
    Record<string, { adAccountId?: string; ownerType?: string; ownerName?: string }>
  >({});
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformLogoUrl, setNewPlatformLogoUrl] = useState('');
  const [newPlatformUrl, setNewPlatformUrl] = useState('');
  const [newPlatformHint, setNewPlatformHint] = useState('');
  const [addPlatformError, setAddPlatformError] = useState('');
  const [addingPlatform, setAddingPlatform] = useState(false);

  const reloadPlatformConfig = useCallback(() => {
    void fetchPlatformAuthConfig(scopeBrand || undefined).then(setPlatformConfig);
  }, [scopeBrand]);

  const loadBindingMeta = useCallback(() => {
    if (!scopeBrand) {
      setBindingMeta({});
      return;
    }
    fetch(`/api/ad-accounts?brandName=${encodeURIComponent(scopeBrand)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ id: string; legacyBindingId?: string; ownerType: string; ownerName: string }>) => {
        const map: Record<string, { adAccountId?: string; ownerType?: string; ownerName?: string }> = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          if (row.legacyBindingId) {
            map[row.legacyBindingId] = {
              adAccountId: row.id,
              ownerType: row.ownerType,
              ownerName: row.ownerName,
            };
          }
        }
        setBindingMeta(map);
      })
      .catch(() => setBindingMeta({}));
  }, [scopeBrand]);

  const auth = usePlatformAccountAuth(brandName, loadBindingMeta);

  useEffect(() => {
    loadBindingMeta();
    reloadPlatformConfig();
  }, [loadBindingMeta, reloadPlatformConfig]);

  const configByPlatform = useMemo(() => {
    const m: Record<string, PlatformAuthConfig> = {};
    for (const c of platformConfig) m[c.platform] = c;
    return m;
  }, [platformConfig]);

  const customPlatformNames = useMemo(
    () => new Set(platformConfig.filter((c) => c.isCustom).map((c) => c.platform)),
    [platformConfig]
  );

  const customBadgeCatalog = useMemo((): MediaPlatformCatalogEntry[] => {
    return platformConfig
      .filter((c) => c.isCustom)
      .map((c) => ({
        id: c.platform,
        label: c.platform,
        category: 'content_publish' as const,
        sortOrder: 0,
        enabled: true,
        logoUrl: c.logoUrl,
        abbr: c.abbr ?? defaultCustomPlatformAbbr(c.platform),
        gradient: c.gradient ?? DEFAULT_CUSTOM_PLATFORM_GRADIENT,
      }));
  }, [platformConfig]);

  const resetAddPlatformForm = () => {
    setNewPlatformName('');
    setNewPlatformLogoUrl('');
    setNewPlatformUrl('');
    setNewPlatformHint('');
    setAddPlatformError('');
  };

  const closeAddPlatformModal = (force = false) => {
    if (!force && addingPlatform) return;
    setShowAddPlatform(false);
    resetAddPlatformForm();
  };

  const submitCustomPlatform = async () => {
    if (!scopeBrand) return;
    const builtinNames = getBundledPlatformAuthConfig().map((c) => c.platform);
    const existingCustom = platformConfig
      .filter((c) => c.isCustom)
      .map((c) => ({
        platform: c.platform,
        logoUrl: c.logoUrl,
        abbr: c.abbr,
        gradient: c.gradient,
        loginUrl: c.loginUrl || undefined,
        loginHint: c.loginHint,
        permissionsLabel: c.permissionsLabel,
        createdAt: '',
      }));
    const validation = validateCustomPlatformInput(
      {
        platform: newPlatformName,
        logoUrl: newPlatformLogoUrl,
        loginUrl: newPlatformUrl,
        loginHint: newPlatformHint,
      },
      builtinNames,
      existingCustom,
      auth.accounts.map((a) => a.platform)
    );
    if (!validation.ok) {
      setAddPlatformError(validation.error);
      return;
    }
    setAddingPlatform(true);
    setAddPlatformError('');
    try {
      const res = await fetch('/api/accounts/custom-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: validation.normalized.platform,
          logoUrl: validation.normalized.logoUrl,
          loginUrl: validation.normalized.loginUrl,
          loginHint: validation.normalized.loginHint,
          brandName: scopeBrand,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAddPlatformError(data.error ?? '添加失败');
        return;
      }
      auth.loadAccounts();
      reloadPlatformConfig();
      toast(`已添加发布平台「${validation.normalized.platform}」`, 'success');
      closeAddPlatformModal(true);
    } catch {
      setAddPlatformError('网络异常，请稍后重试');
    } finally {
      setAddingPlatform(false);
    }
  };

  const overview = useMemo(() => {
    const loggedIn = auth.accounts.filter((a) => isPublishReady(a.status)).length;
    const needRelogin = auth.accounts.filter(
      (a) => !isPublishReady(a.status) && a.status !== '授权中'
    ).length;
    const checking = auth.accounts.filter((a) => a.status === '授权中').length;
    let lastChecked = '—';
    for (const a of auth.accounts) {
      if (a.lastChecked && a.lastChecked !== '—') {
        if (lastChecked === '—' || a.lastChecked > lastChecked) lastChecked = a.lastChecked;
      }
    }
    return { loggedIn, needRelogin, checking, lastChecked, total: auth.accounts.length };
  }, [auth.accounts]);

  const openDrawer = (binding: AccountBinding) => {
    const meta = bindingMeta[binding.id];
    setDrawer({
      binding,
      platform: binding.platform,
      accountName: binding.accountName,
      adAccountId: meta?.adAccountId,
      ownerType: meta?.ownerType,
      ownerName: meta?.ownerName,
    });
    if (meta?.adAccountId) {
      fetch(`/api/ad-account-assignments?accountId=${meta.adAccountId}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setAssignments(Array.isArray(data) ? data : []))
        .catch(() => setAssignments([]));
    } else {
      setAssignments(
        scopeBrand
          ? [{ id: 'default', accountId: '', targetName: scopeBrand, isDefault: true, enabled: true }]
          : []
      );
    }
  };

  const toggleAssignment = (row: AssignmentRow) => {
    if (row.id === 'default') return;
    fetch(`/api/ad-account-assignments/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !row.enabled }),
    }).then(() => drawer?.adAccountId && openDrawer(drawer.binding));
  };

  const renderActions = (binding: AccountBinding) => {
    const session = auth.pendingBind[binding.id];
    const login = bindingToLoginStatus(binding.status);
    const isChecking = binding.status === '授权中' || Boolean(session);
    const busy = auth.loadingId === binding.id;

    if (busy) {
      return (
        <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--neutral-text-03)' }}>
          <Loader2 className="w-3 h-3 animate-spin" /> 处理中
        </span>
      );
    }

    if (login.key === 'logged_out' || login.key === 'check_failed' || login.key === 'unknown') {
      if (!isChecking) {
        return (
          <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => auth.handleBindStart(binding)}>
            {publishAccountActionLabels(binding.status).openLogin}
          </button>
        );
      }
    }

    if (isChecking) {
      return (
        <span className="flex flex-wrap gap-1 justify-end">
          <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => auth.handleBindConfirm(binding)}>
            {publishAccountActionLabels(binding.status).confirmLogin}
          </button>
          {auth.platformLoginUrl(binding.platform, session) && (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-xs"
              onClick={() => {
                const url = auth.platformLoginUrl(binding.platform, session);
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
              }}
              title="打开平台登录页"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </span>
      );
    }

    return (
      <span className="flex flex-wrap gap-1 justify-end">
        <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => auth.handleAgentVerify(binding.id)}>
          <RefreshCw className={`w-3 h-3 ${auth.verifyAccountId === binding.id ? 'animate-spin' : ''}`} />
          {publishAccountActionLabels(binding.status).recheck}
        </button>
        <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => openDrawer(binding)}>
          <Settings2 className="w-3 h-3" />
          适用品牌
        </button>
        <button
          type="button"
          className="geo-btn-danger geo-btn-xs"
          onClick={() => auth.handleUnbind(binding.id, binding.platform)}
          title="清除本机登录状态标记"
        >
          <Unlock className="w-3 h-3" />
        </button>
      </span>
    );
  };

  return (
    <div className="geo-page-content geo-page-content--flush flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="shrink-0 geo-page-content-section py-4 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-base font-bold" style={{ color: 'var(--neutral-text-01)' }}>
            {PUBLISH_ACCOUNT_SECTION_TITLE}
          </h2>
          <BrandSwitcher variant="scope" brandName={brandName} onBrandChange={onBrandChange} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content-section py-[var(--geo-content-block)] space-y-4">
        {!scopeBrand ? (
          <p className="text-sm" style={{ color: 'var(--neutral-text-02)' }}>请在上方选择具体品牌，再配置本机发布账号。</p>
        ) : (
          <>
            <HermesStatusStrip onNavigate={onNavigate} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '可发布', value: overview.loggedIn, sub: `共 ${overview.total} 个平台` },
                { label: '需重新登录', value: overview.needRelogin, sub: '未检测或已失效' },
                { label: '检测中', value: overview.checking, sub: '等待 Hermes' },
                {
                  label: 'Hermes',
                  value: auth.hermesOk ? '在线' : auth.hermesOk === false ? '离线' : '…',
                  sub: `最近检测 ${overview.lastChecked}`,
                },
              ].map((item) => (
                <div key={item.label} className="geo-card p-3">
                  <p className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>{item.label}</p>
                  <p className="text-lg font-bold mt-0.5">{item.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--neutral-text-03)' }}>{item.sub}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                系统内置平台与品牌自定义渠道；自定义平台仅当前品牌可见。
              </p>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1"
                onClick={() => setShowAddPlatform(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                新增发布平台
              </button>
            </div>

            <div className="geo-table-wrap">
              <table className="geo-table geo-table--compact">
                <thead>
                  <tr>
                    <th>平台</th>
                    <th>账号名称</th>
                    <th>登录状态</th>
                    <th>提供方</th>
                    <th>适用品牌</th>
                    <th>最近检测</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {auth.accounts.map((binding) => {
                    const login = bindingToLoginStatus(binding.status);
                    const meta = bindingMeta[binding.id];
                    const displayName =
                      isPublishReady(binding.status) && binding.accountName !== '未绑定'
                        ? binding.accountName
                        : binding.platform;
                    const provider = meta?.ownerType
                      ? `${providerLabel(meta.ownerType)}${meta.ownerName ? ` · ${meta.ownerName}` : ''}`
                      : `品牌方 · ${scopeBrand}`;
                    return (
                      <tr
                        key={binding.id}
                        className="cursor-pointer"
                        onClick={() => openDrawer(binding)}
                      >
                        <td className="font-medium">
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <PlatformBadge label={binding.platform} catalog={customBadgeCatalog} size="sm" />
                            {customPlatformNames.has(binding.platform) && (
                              <span className="geo-tag text-[10px]">自定义</span>
                            )}
                          </span>
                        </td>
                        <td>{displayName}</td>
                        <td>
                          <span className={`geo-tag text-[10px] ${login.tagClass}`}>{login.label}</span>
                        </td>
                        <td style={{ color: 'var(--neutral-text-02)' }}>{provider}</td>
                        <td style={{ color: 'var(--neutral-text-02)' }}>{scopeBrand}</td>
                        <td style={{ color: 'var(--neutral-text-03)' }}>{binding.lastChecked || '—'}</td>
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          {renderActions(binding)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {auth.accounts.length === 0 && (
                <p className="text-center text-xs py-10" style={{ color: 'var(--neutral-text-03)' }}>暂无发布账号，请选择品牌后刷新。</p>
              )}
            </div>

            <p className="text-[10px] text-center" style={{ color: 'var(--neutral-text-03)' }}>
              登录态保存在本机浏览器环境中；更换电脑后需重新登录并检测。Hermes 仅在本机执行发布与检测。
            </p>
          </>
        )}
      </div>

      {drawer && (
        <div
          className="fixed inset-y-0 right-0 z-30 w-full max-w-md shadow-xl border-l flex flex-col"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--neutral-divider-02)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <div>
              <h3 className="text-sm font-bold">{drawer.platform}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-text-03)' }}>{bindingToLoginStatus(drawer.binding.status).label}</p>
            </div>
            <button type="button" onClick={() => setDrawer(null)} className="p-1 rounded geo-nav-item">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs space-y-5">
            <section>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--neutral-text-01)' }}>登录指引</h4>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--neutral-text-02)' }}>
                {configByPlatform[drawer.platform]?.loginUrl ? (
                  <>
                    <li>点击「去登录」打开 {drawer.platform} 官方登录页</li>
                    <li>在本机浏览器完成扫码或密码登录</li>
                  </>
                ) : (
                  <>
                    <li>在浏览器中打开 {drawer.platform} 自媒体或创作者后台</li>
                    <li>完成账号登录（自定义渠道未配置固定登录地址）</li>
                  </>
                )}
                <li>返回本页点击「我已完成登录，检测账号」</li>
              </ol>
              {configByPlatform[drawer.platform]?.loginHint && (
                <p className="mt-2" style={{ color: 'var(--neutral-text-03)' }}>{configByPlatform[drawer.platform].loginHint}</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--neutral-text-01)' }}>账号信息</h4>
              <dl className="space-y-1" style={{ color: 'var(--neutral-text-02)' }}>
                <div className="flex justify-between">
                  <dt>检测名称</dt>
                  <dd>{drawer.binding.accountName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>提供方</dt>
                  <dd>{providerLabel(drawer.ownerType)}{drawer.ownerName ? ` · ${drawer.ownerName}` : ''}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>最近检测</dt>
                  <dd>{drawer.binding.lastChecked || '—'}</dd>
                </div>
              </dl>
              {drawer.ownerType === 'service_provider' && (
                <p className="mt-2 text-amber-700 bg-amber-50 rounded p-2">
                  该账号由服务商本机环境提供发布能力，品牌方不持有平台密码。
                </p>
              )}
            </section>

            <section>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--neutral-text-01)' }}>适用品牌</h4>
              <ul className="space-y-2">
                {assignments.map((a) => (
                  <li key={a.id} className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--neutral-divider-03)' }}>
                    <span>{a.targetName ?? scopeBrand}</span>
                    <span className="flex items-center gap-2" style={{ color: 'var(--neutral-text-03)' }}>
                      {a.isDefault && <span>默认</span>}
                      {a.id !== 'default' && (
                        <button
                          type="button"
                          className="geo-btn-secondary geo-btn-xs"
                          onClick={() => toggleAssignment(a)}
                        >
                          {a.enabled ? '停用' : '启用'}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] mt-2" style={{ color: 'var(--neutral-text-03)' }}>
                发布计划与文章结果仅展示已登录且适用于当前品牌的账号。
              </p>
            </section>

            <div className="pt-2 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {renderActions(drawer.binding)}
            </div>
          </div>
        </div>
      )}

      {showAddPlatform && (
        <div className="geo-modal-backdrop" role="dialog" aria-modal="true">
          <div className="geo-modal max-w-md relative">
            <button
              type="button"
              onClick={closeAddPlatformModal}
              disabled={addingPlatform}
              className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg disabled:opacity-50"
              style={{ color: 'var(--neutral-text-03)' }}
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="geo-modal-head">
              <h3 className="font-bold text-sm" style={{ color: 'var(--neutral-text-01)' }}>
                新增发布平台
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                添加品牌独有的发布渠道，仅当前品牌可见。登录地址可选，留空时需手动打开平台后台。
              </p>
            </div>
            <div className="geo-modal-body space-y-3">
              <div>
                <label className="geo-label block mb-1.5" htmlFor="custom-platform-name">
                  平台名称 <span className="text-red-500">*</span>
                </label>
                <input
                  id="custom-platform-name"
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value.slice(0, CUSTOM_PLATFORM_NAME_MAX))}
                  placeholder="例如：百家号、搜狐号"
                  className="geo-input w-full"
                  disabled={addingPlatform}
                  autoFocus
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                  {newPlatformName.length}/{CUSTOM_PLATFORM_NAME_MAX} 字
                </p>
              </div>
              <div>
                <label className="geo-label block mb-1.5">平台 LOGO</label>
                <PlatformLogoUpload
                  label={newPlatformName.trim() || '预览'}
                  logoUrl={newPlatformLogoUrl}
                  onChange={setNewPlatformLogoUrl}
                  disabled={addingPlatform}
                  catalogEntry={{
                    id: 'preview',
                    label: newPlatformName.trim() || '预览',
                    category: 'content_publish',
                    sortOrder: 0,
                    enabled: true,
                    abbr: defaultCustomPlatformAbbr(newPlatformName),
                    gradient: DEFAULT_CUSTOM_PLATFORM_GRADIENT,
                  }}
                />
              </div>
              <div>
                <label className="geo-label block mb-1.5" htmlFor="custom-platform-url">
                  登录地址（可选）
                </label>
                <input
                  id="custom-platform-url"
                  value={newPlatformUrl}
                  onChange={(e) => setNewPlatformUrl(e.target.value.slice(0, CUSTOM_PLATFORM_URL_MAX))}
                  placeholder="https://..."
                  className="geo-input w-full"
                  disabled={addingPlatform}
                />
              </div>
              <div>
                <label className="geo-label block mb-1.5" htmlFor="custom-platform-hint">
                  登录提示（可选）
                </label>
                <textarea
                  id="custom-platform-hint"
                  value={newPlatformHint}
                  onChange={(e) => setNewPlatformHint(e.target.value.slice(0, CUSTOM_PLATFORM_HINT_MAX))}
                  placeholder="例如：使用手机号验证码登录创作者中心"
                  className="geo-input w-full min-h-[72px] resize-y"
                  disabled={addingPlatform}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                  {newPlatformHint.length}/{CUSTOM_PLATFORM_HINT_MAX} 字
                </p>
              </div>
              {addPlatformError && (
                <p className="text-xs text-red-600">{addPlatformError}</p>
              )}
            </div>
            <div className="geo-modal-foot">
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm"
                onClick={closeAddPlatformModal}
                disabled={addingPlatform}
              >
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                disabled={addingPlatform || !newPlatformName.trim()}
                onClick={() => void submitCustomPlatform()}
              >
                {addingPlatform ? '添加中…' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
