import { useState, useEffect, useCallback, useMemo } from 'react';
import { AccountBinding, PlatformAuthConfig, PendingBindSession } from '../types';
import { useToast } from '../context/ToastContext';
import { useAgentTaskPolling } from '../hooks/useAgentTaskPolling';
import type { AgentTask } from '../types';
import {
  RefreshCw,
  Unlock,
  Plus,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { fetchPlatformAuthConfig } from '../lib/platform-auth-client';

interface AccountBindingViewProps {
  brandName: string;
  /** 嵌入其他页面时隐藏页头（保留组件供复用） */
  embedded?: boolean;
}

const AUTH_MODE_LABEL: Record<string, string> = {
  browser: '浏览器登录',
  oauth: 'OAuth',
  reverify: '复检',
};

const PLATFORM_RAIL: Record<string, string> = {
  小红书: 'geo-account-bind-rail--xiaohongshu',
  知乎: 'geo-account-bind-rail--zhihu',
  微信公众号: 'geo-account-bind-rail--wechat',
  大风网: 'geo-account-bind-rail--ifeng',
  一点号: 'geo-account-bind-rail--yidian',
};

function platformLoginUrl(
  platform: string,
  configByPlatform: Record<string, PlatformAuthConfig>,
  session?: PendingBindSession
): string | undefined {
  return session?.loginUrl ?? configByPlatform[platform]?.loginUrl;
}

/** 须在用户点击的同步栈内调用，避免 await 后 window.open 被拦截 */
function openPlatformLogin(url: string): boolean {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return opened != null;
}

export default function AccountBindingView({ brandName, embedded }: AccountBindingViewProps) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformAuthConfig[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingBind, setPendingBind] = useState<Record<string, PendingBindSession>>({});
  const [hermesOk, setHermesOk] = useState<boolean | null>(null);

  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [verifyAccountId, setVerifyAccountId] = useState<string | null>(null);

  const loadAccounts = useCallback(() => {
    fetch(`/api/accounts?brandName=${encodeURIComponent(brandName)}`)
      .then(async (res) => {
        const ct = res.headers.get('content-type') ?? '';
        if (!res.ok || !ct.includes('application/json')) return [];
        return res.json();
      })
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]));
  }, [brandName]);

  useEffect(() => {
    loadAccounts();
    void fetchPlatformAuthConfig().then(setPlatformConfig);
    fetch('/api/hermes/health')
      .then((res) => res.json())
      .then((data) => setHermesOk(Boolean(data.ok)))
      .catch(() => setHermesOk(false));
  }, [brandName, loadAccounts]);

  const onVerifyComplete = useCallback(
    (task: AgentTask) => {
      setLoadingId(null);
      setVerifyTaskId(null);
      setVerifyAccountId(null);
      loadAccounts();
      const out = task.output as Record<string, unknown> | undefined;
      const msg = String(out?.message ?? (task.status === 'succeeded' ? '校验通过' : '校验失败'));
      if (task.status === 'succeeded') {
        const accountId = String(task.input?.accountId ?? '');
        if (accountId) {
          setPendingBind((prev) => {
            const next = { ...prev };
            delete next[accountId];
            return next;
          });
        }
        toast(msg, 'success');
      } else {
        toast(task.userErrorMessage ?? msg, 'error');
      }
    },
    [toast, loadAccounts]
  );

  useAgentTaskPolling({
    taskId: verifyTaskId,
    onComplete: onVerifyComplete,
    onUpdate: () => {},
  });

  const configByPlatform = useMemo(() => {
    const map: Record<string, PlatformAuthConfig> = {};
    for (const c of platformConfig) map[c.platform] = c;
    return map;
  }, [platformConfig]);

  const authorizedCount = accounts.filter(
    (a) => a.status === '已授权' || a.status === '正常'
  ).length;
  const handleBindStart = (acc: AccountBinding) => {
    if (!brandName || brandName === '__all__') {
      toast('请先在顶部选择具体品牌后再授权', 'error');
      return;
    }

    const cfg = configByPlatform[acc.platform];
    const loginUrl = cfg?.loginUrl;
    if (!loginUrl) {
      toast('平台登录地址未加载，请刷新页面后重试', 'error');
      return;
    }

    const opened = openPlatformLogin(loginUrl);
    if (!opened) {
      toast('浏览器拦截了新标签页，请允许弹窗或点击下方「打开登录页」', 'error');
    }

    setLoadingId(acc.id);
    fetch('/api/accounts/bind/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: acc.platform, brandName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast(data.error, 'error');
          return;
        }
        if (data.accounts) setAccounts(data.accounts);
        const resolvedUrl = (data.loginUrl as string) || loginUrl;
        if (!opened && resolvedUrl) openPlatformLogin(resolvedUrl);
        setPendingBind((prev) => ({
          ...prev,
          [acc.id]: {
            accountId: data.accountId,
            bindSessionId: data.bindSessionId,
            loginUrl: resolvedUrl,
            platform: acc.platform,
          },
        }));
        toast(
          cfg?.loginHint ??
            (opened
              ? `已打开 ${acc.platform} 官方登录页，请在新标签页完成登录`
              : `请手动打开登录页：${resolvedUrl}`),
          'info'
        );
      })
      .finally(() => setLoadingId(null));
  };

  const handleBindConfirm = (acc: AccountBinding) => {
    const session = pendingBind[acc.id];
    if (!session) {
      toast('请先点击「去授权」并在新标签页完成登录', 'error');
      return;
    }
    setLoadingId(acc.id);
    setVerifyAccountId(acc.id);
    fetch('/api/accounts/bind/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: session.accountId,
        bindSessionId: session.bindSessionId,
        brandName,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast(data.error, 'error');
          setLoadingId(null);
          setVerifyAccountId(null);
          return;
        }
        if (data.accounts) setAccounts(data.accounts);
        if (data.task?.id) setVerifyTaskId(data.task.id);
        else {
          setLoadingId(null);
          setVerifyAccountId(null);
        }
      })
      .catch(() => {
        setLoadingId(null);
        setVerifyAccountId(null);
      });
  };

  const handleOpenPlatformLogin = (acc: AccountBinding) => {
    const url = platformLoginUrl(acc.platform, configByPlatform, pendingBind[acc.id]);
    if (!url) {
      toast('平台登录地址未加载，请刷新页面后重试', 'error');
      return;
    }
    if (!openPlatformLogin(url)) {
      toast('请允许弹窗，或复制下方链接到浏览器打开', 'error');
    }
  };

  const handleReopenLogin = (acc: AccountBinding) => {
    handleOpenPlatformLogin(acc);
  };

  const handleAgentVerify = (id: string) => {
    setLoadingId(id);
    setVerifyAccountId(id);
    fetch('/api/accounts/verify-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: id, brandName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast(data.error, 'error');
          setLoadingId(null);
          setVerifyAccountId(null);
          return;
        }
        if (data.task?.id) setVerifyTaskId(data.task.id);
      })
      .catch(() => {
        setLoadingId(null);
        setVerifyAccountId(null);
      });
  };

  const handleUnbind = (id: string, platform: string) => {
    if (!confirm(`确定要安全断开 ${platform} 的发布授权吗？解绑后将无法自动发布到该平台。`)) return;
    setLoadingId(id);
    fetch('/api/accounts/unbind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.accounts) {
          setAccounts(data.accounts);
          setPendingBind((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          toast(`${platform} 已解绑`, 'success');
        }
      })
      .finally(() => setLoadingId(null));
  };

  const statusClass = (status: string) => {
    if (status === '已授权' || status === '正常') return 'geo-tag geo-tag-success';
    if (status === '授权中') return 'geo-tag geo-tag-info';
    if (status === '校验失败') return 'geo-tag geo-tag-danger';
    return 'geo-tag geo-tag-warning';
  };

  return (
    <div className={`${embedded ? 'h-full' : 'geo-page-content'} flex h-full min-h-0 overflow-hidden text-left`}>
      <div className="geo-brand-workspace flex-1 min-h-0">
        <div
          className={`geo-brand-main ${embedded ? '' : 'geo-card'} flex flex-col overflow-hidden min-h-0`}
          style={{ maxWidth: 'none' }}
        >
          {!embedded && (
          <div
            className="p-6 shrink-0"
            style={{
              borderBottom: '1px solid var(--neutral-divider-02)',
              background: 'var(--color-bg-card)',
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2
                  className="text-base font-bold"
                  style={{ color: 'var(--neutral-text-01)' }}
                >
                  授权关系
                </h2>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: 'var(--neutral-text-02)' }}
                >
                  仅用于自动发布到官方平台与数据回传；发布任务到资源平台不需要绑定账号。
                  无官方接口的平台，请在新标签页自行登录，由 Hermes 校验登录态；本页不会要求输入密码。
                </p>
              </div>
              <span
                className={`geo-tag text-[10px] uppercase font-bold tracking-wider shrink-0 ${
                  hermesOk ? 'geo-tag-success' : 'geo-tag-warning'
                }`}
              >
                Hermes {hermesOk ? '已连接' : hermesOk === false ? '未连接' : '检测中'}
              </span>
            </div>
          </div>
          )}
          {embedded && (
            <div className="px-6 py-3 shrink-0 flex justify-between items-center border-b border-gray-100">
              <p className="text-xs text-gray-500">
                浏览器登录须由您点击触发；完成登录后点击「我已登录，开始校验」。
              </p>
              <span className={`geo-tag text-[10px] ${hermesOk ? 'geo-tag-success' : 'geo-tag-warning'}`}>
                Hermes {hermesOk ? '已连接' : hermesOk === false ? '未连接' : '…'}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="geo-label mb-0" style={{ fontSize: 'var(--font-size-body)' }}>
                平台发布账号
              </h3>
              <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                已授权 {authorizedCount}/{accounts.length}
              </span>
            </div>

            <div className="geo-account-bind-list">
              {accounts.map((acc) => {
                const cfg = configByPlatform[acc.platform];
                const isAuthorizing = acc.status === '授权中';
                const isPending = acc.status === '待授权' || acc.status === '校验失败';
                const isAuthorized = acc.status === '已授权' || acc.status === '正常';
                const session = pendingBind[acc.id];
                const railClass = PLATFORM_RAIL[acc.platform] ?? '';
                const showAuthorizing = isAuthorizing || Boolean(session);

                return (
                  <article
                    key={acc.id}
                    className={`geo-account-bind-card ${
                      showAuthorizing
                        ? 'is-authorizing'
                        : isAuthorized
                          ? 'is-active'
                          : ''
                    }`}
                  >
                    <div className={`geo-account-bind-rail ${railClass}`} aria-hidden />
                    <div className="geo-account-bind-body">
                      <div className="geo-account-bind-head">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {platformLoginUrl(acc.platform, configByPlatform, session) ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPlatformLogin(acc)}
                                className="text-sm font-bold inline-flex items-center gap-1 hover:underline"
                                style={{ color: 'var(--color-primary)' }}
                                title="在新标签页打开官方登录页"
                              >
                                {acc.platform}
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                              </button>
                            ) : (
                              <span className="text-sm font-bold" style={{ color: 'var(--neutral-text-01)' }}>
                                {acc.platform}
                              </span>
                            )}
                            <span className="geo-badge text-[10px]">
                              {AUTH_MODE_LABEL[cfg?.authMode ?? acc.authMethod ?? 'browser']}
                            </span>
                          </div>
                          {platformLoginUrl(acc.platform, configByPlatform, session) && (
                            <button
                              type="button"
                              onClick={() => handleOpenPlatformLogin(acc)}
                              className="text-[10px] mt-1 inline-block truncate max-w-full text-left hover:underline"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {platformLoginUrl(acc.platform, configByPlatform, session)}
                            </button>
                          )}
                        </div>
                        <span
                          className={`inline-flex shrink-0 text-[10px] font-bold ${statusClass(acc.status)}`}
                        >
                          {acc.status}
                        </span>
                      </div>

                      <dl className="geo-account-bind-meta">
                        <div>
                          <dt>授权主体</dt>
                          <dd>
                            {isPending && !showAuthorizing
                              ? '待发起授权'
                              : showAuthorizing
                                ? '等待浏览器登录…'
                                : acc.accountName}
                          </dd>
                        </div>
                        <div>
                          <dt>校验范围</dt>
                          <dd>{acc.permissions || cfg?.permissionsLabel || '—'}</dd>
                        </div>
                        {acc.expiresAt && (
                          <div>
                            <dt>授权到期</dt>
                            <dd
                              className={
                                new Date(acc.expiresAt) < new Date(Date.now() + 7 * 86400000)
                                  ? 'text-amber-600 font-medium'
                                  : undefined
                              }
                            >
                              {acc.expiresAt.slice(0, 10)}
                              {new Date(acc.expiresAt) < new Date() ? '（已过期）' : ''}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {cfg?.loginHint && (
                        <p className="geo-account-bind-hint">{cfg.loginHint}</p>
                      )}

                      <div className="geo-account-bind-actions">
                        {loadingId === acc.id ? (
                          <span
                            className="text-xs flex items-center gap-1 font-semibold"
                            style={{ color: 'var(--neutral-text-03)' }}
                          >
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-accent)' }} />
                            处理中…
                          </span>
                        ) : (
                          <>
                            {isPending && !showAuthorizing && (
                              <button
                                type="button"
                                onClick={() => handleBindStart(acc)}
                                className="geo-btn-primary geo-btn-xs flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                去授权
                              </button>
                            )}
                            {showAuthorizing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleReopenLogin(acc)}
                                  className="geo-btn-secondary geo-btn-xs flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  打开登录页
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBindConfirm(acc)}
                                  className="geo-btn-primary geo-btn-xs"
                                  title="Mock 模式下将直接校验通过"
                                >
                                  我已登录，开始校验
                                </button>
                              </>
                            )}
                            {!isPending && !showAuthorizing && (
                              <>
                                {platformLoginUrl(acc.platform, configByPlatform, session) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPlatformLogin(acc)}
                                    className="geo-btn-secondary geo-btn-xs flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    打开登录页
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleAgentVerify(acc.id)}
                                  disabled={verifyTaskId !== null && verifyAccountId === acc.id}
                                  className="geo-btn-secondary geo-btn-xs flex items-center gap-1"
                                >
                                  <RefreshCw
                                    className={`w-3 h-3 ${verifyTaskId && verifyAccountId === acc.id ? 'animate-spin' : ''}`}
                                  />
                                  校验登录状态
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUnbind(acc.id, acc.platform)}
                                  className="geo-btn-danger geo-btn-xs flex items-center gap-1"
                                >
                                  <Unlock className="w-3 h-3" />
                                  解绑
                                </button>
                              </>
                            )}
                            {acc.status === '校验失败' && (
                              <button
                                type="button"
                                onClick={() => handleBindStart(acc)}
                                className="geo-btn-secondary geo-btn-xs"
                              >
                                重新授权
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <p
              className="text-center text-[10px] leading-relaxed"
              style={{ color: 'var(--neutral-text-03)' }}
            >
              凭据由 Hermes 在本地校验，服务端不存储平台密码。点击「去授权」将在新标签页打开各平台官方登录页。
            </p>
          </div>

          <div
            className="p-5 border-t shrink-0"
            style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
          >
            <button
              type="button"
              onClick={() => {
                const unauthorized = accounts.filter((a) => a.status !== '已授权' && a.status !== '正常');
                if (unauthorized.length === 0) {
                  toast('所有平台均已授权', 'info');
                  return;
                }
                toast(`尚有 ${unauthorized.length} 个平台未完成授权`, 'info');
              }}
              className="geo-btn-primary geo-btn-sm w-full flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                授权进度 {authorizedCount}/{accounts.length}
                {hermesOk === false ? ' · Mock 校验可用' : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
