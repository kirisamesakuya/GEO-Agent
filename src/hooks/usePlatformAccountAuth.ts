import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AccountBinding, AgentTask, PlatformAuthConfig, PendingBindSession } from '../types';
import { useToast } from '../context/ToastContext';
import { useAgentTaskPolling } from './useAgentTaskPolling';
import { fetchPlatformAuthConfig } from '../lib/platform-auth-client';

function openPlatformLogin(url: string): boolean {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return opened != null;
}

export function platformLoginUrl(
  platform: string,
  configByPlatform: Record<string, PlatformAuthConfig>,
  session?: PendingBindSession
): string | undefined {
  return session?.loginUrl ?? configByPlatform[platform]?.loginUrl;
}

export function usePlatformAccountAuth(brandName: string, onAccountsUpdated?: () => void) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformAuthConfig[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingBind, setPendingBind] = useState<Record<string, PendingBindSession>>({});
  const [hermesOk, setHermesOk] = useState<boolean | null>(null);
  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [verifyAccountId, setVerifyAccountId] = useState<string | null>(null);

  const scopeBrand = brandName && brandName !== '__all__' ? brandName : '';

  const loadAccounts = useCallback(() => {
    if (!scopeBrand) {
      setAccounts([]);
      return;
    }
    fetch(`/api/accounts?brandName=${encodeURIComponent(scopeBrand)}`)
      .then(async (res) => {
        const ct = res.headers.get('content-type') ?? '';
        if (!res.ok || !ct.includes('application/json')) return [];
        return res.json();
      })
      .then((data) => {
        setAccounts(Array.isArray(data) ? data : []);
        onAccountsUpdated?.();
      })
      .catch(() => setAccounts([]));
  }, [scopeBrand, onAccountsUpdated]);

  useEffect(() => {
    loadAccounts();
    void fetchPlatformAuthConfig().then(setPlatformConfig);
    fetch('/api/hermes/health')
      .then((res) => res.json())
      .then((data) => setHermesOk(Boolean(data.ok)))
      .catch(() => setHermesOk(false));
  }, [scopeBrand, loadAccounts]);

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

  const handleBindStart = (acc: AccountBinding) => {
    if (!scopeBrand) {
      toast('请先在顶部选择具体品牌', 'error');
      return;
    }
    const cfg = configByPlatform[acc.platform];
    const loginUrl = cfg?.loginUrl;
    if (!loginUrl) {
      toast('平台登录地址未加载，请刷新页面后重试', 'error');
      return;
    }
    const opened = openPlatformLogin(loginUrl);
    if (!opened) toast('浏览器拦截了新标签页，请允许弹窗', 'error');
    setLoadingId(acc.id);
    fetch('/api/accounts/bind/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: acc.platform, brandName: scopeBrand }),
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
        toast(cfg?.loginHint ?? `已打开 ${acc.platform} 登录页`, 'info');
      })
      .finally(() => setLoadingId(null));
  };

  const handleBindConfirm = (acc: AccountBinding) => {
    const session = pendingBind[acc.id];
    if (!session) {
      toast('请先点击「去登录」并在本机浏览器完成平台登录', 'error');
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
        brandName: scopeBrand,
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

  const handleAgentVerify = (id: string) => {
    setLoadingId(id);
    setVerifyAccountId(id);
    fetch('/api/accounts/verify-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: id, brandName: scopeBrand }),
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
    if (!confirm(`确定清除 ${platform} 的本机登录状态标记？清除后需重新登录并检测。`)) return;
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
          toast(`${platform} 登录状态已清除`, 'success');
        }
      })
      .finally(() => setLoadingId(null));
  };

  const disableAssignment = async (adAccountId: string) => {
    const res = await fetch(`/api/ad-accounts/${adAccountId}/disable`, { method: 'POST' });
    const data = await res.json();
    if (data.error) toast(data.error, 'error');
    else {
      toast('账号已停用', 'success');
      loadAccounts();
    }
  };

  return {
    scopeBrand,
    accounts,
    configByPlatform,
    loadingId,
    pendingBind,
    hermesOk,
    verifyTaskId,
    verifyAccountId,
    loadAccounts,
    handleBindStart,
    handleBindConfirm,
    handleAgentVerify,
    handleUnbind,
    disableAssignment,
    platformLoginUrl: (platform: string, session?: PendingBindSession) =>
      platformLoginUrl(platform, configByPlatform, session),
  };
}
