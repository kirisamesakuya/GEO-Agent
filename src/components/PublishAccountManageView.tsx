import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Settings2, Unlock, X } from 'lucide-react';
import { usePlatformAccountAuth } from '../hooks/usePlatformAccountAuth';
import { fetchPlatformAuthConfig } from '../lib/platform-auth-client';
import {
  bindingToLoginStatus,
  isPublishReady,
  providerLabel,
} from '../lib/publish-account-login-status';
import type { AccountBinding, PlatformAuthConfig } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import HermesExecutorPanel from './hermes/HermesExecutorPanel';

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
}

export default function PublishAccountManageView({ brandName, onBrandChange }: Props) {
  const scopeBrand = brandName && brandName !== '__all__' ? brandName : '';
  const [platformConfig, setPlatformConfig] = useState<PlatformAuthConfig[]>([]);
  const [drawer, setDrawer] = useState<DrawerMeta | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [bindingMeta, setBindingMeta] = useState<
    Record<string, { adAccountId?: string; ownerType?: string; ownerName?: string }>
  >({});

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
    void fetchPlatformAuthConfig().then(setPlatformConfig);
  }, [loadBindingMeta]);

  const configByPlatform = useMemo(() => {
    const m: Record<string, PlatformAuthConfig> = {};
    for (const c of platformConfig) m[c.platform] = c;
    return m;
  }, [platformConfig]);

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
        <span className="text-xs text-gray-400 inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> 处理中
        </span>
      );
    }

    if (login.key === 'logged_out' || login.key === 'check_failed' || login.key === 'unknown') {
      if (!isChecking) {
        return (
          <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => auth.handleBindStart(binding)}>
            去登录
          </button>
        );
      }
    }

    if (isChecking) {
      return (
        <span className="flex flex-wrap gap-1 justify-end">
          <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => auth.handleBindConfirm(binding)}>
            我已完成登录，检测账号
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
          复检
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
    <div className="geo-page-content flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="shrink-0 px-6 py-4 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
      >
        <h2 className="text-base font-bold" style={{ color: 'var(--neutral-text-01)' }}>
          发布账号管理
        </h2>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--neutral-text-02)' }}>
          管理本机已登录的平台账号，供 Hermes 自动发布使用。请在本机浏览器完成平台登录后，再点击检测账号；系统不保存平台密码。
        </p>
        <div className="mt-3">
          <BrandScopeBar
            label="管理哪个品牌的发布账号"
            brandName={brandName}
            onBrandChange={onBrandChange}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {!scopeBrand ? (
          <p className="text-sm text-gray-500">请在上方选择具体品牌，再配置本机发布账号。</p>
        ) : (
          <>
            <HermesExecutorPanel />
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
                  <p className="text-[10px] text-gray-400">{item.label}</p>
                  <p className="text-lg font-bold mt-0.5">{item.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>

            <div className="geo-card overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-400 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                    <th className="px-4 py-3">平台</th>
                    <th className="px-4 py-3">账号名称</th>
                    <th className="px-4 py-3">登录状态</th>
                    <th className="px-4 py-3">提供方</th>
                    <th className="px-4 py-3">适用品牌</th>
                    <th className="px-4 py-3">最近检测</th>
                    <th className="px-4 py-3 text-right">操作</th>
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
                        className="border-t cursor-pointer hover:bg-gray-50/50"
                        style={{ borderColor: 'var(--neutral-divider-02)' }}
                        onClick={() => openDrawer(binding)}
                      >
                        <td className="px-4 py-3 font-medium">{binding.platform}</td>
                        <td className="px-4 py-3">{displayName}</td>
                        <td className="px-4 py-3">
                          <span className={`geo-tag text-[10px] ${login.tagClass}`}>{login.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{provider}</td>
                        <td className="px-4 py-3 text-gray-600">{scopeBrand}</td>
                        <td className="px-4 py-3 text-gray-500">{binding.lastChecked || '—'}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {renderActions(binding)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {auth.accounts.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-10">暂无发布账号，请选择品牌后刷新。</p>
              )}
            </div>

            <p className="text-[10px] text-center text-gray-400">
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
              <p className="text-xs text-gray-500 mt-0.5">{bindingToLoginStatus(drawer.binding.status).label}</p>
            </div>
            <button type="button" onClick={() => setDrawer(null)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs space-y-5">
            <section>
              <h4 className="font-semibold text-gray-800 mb-2">登录指引</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>点击「去登录」打开 {drawer.platform} 官方登录页</li>
                <li>在本机浏览器完成扫码或密码登录</li>
                <li>返回本页点击「我已完成登录，检测账号」</li>
              </ol>
              {configByPlatform[drawer.platform]?.loginHint && (
                <p className="mt-2 text-gray-500">{configByPlatform[drawer.platform].loginHint}</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-gray-800 mb-2">账号信息</h4>
              <dl className="space-y-1 text-gray-600">
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
              <h4 className="font-semibold text-gray-800 mb-2">适用品牌</h4>
              <ul className="space-y-2">
                {assignments.map((a) => (
                  <li key={a.id} className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span>{a.targetName ?? scopeBrand}</span>
                    <span className="flex items-center gap-2 text-gray-400">
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
              <p className="text-[10px] text-gray-400 mt-2">
                发布计划与文章结果仅展示已登录且适用于当前品牌的账号。
              </p>
            </section>

            <div className="pt-2 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {renderActions(drawer.binding)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
