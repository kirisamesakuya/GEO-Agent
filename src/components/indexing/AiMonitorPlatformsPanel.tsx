import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { ViewType } from '../../types';
import { formatPlanDateTime } from '../../lib/datetime-local';
import { openPlatformLogin } from '../../lib/open-platform-login';
import { useToast } from '../../context/ToastContext';
import {
  buildDefaultAiMonitorSessions,
  ensureAiMonitorPlatformCatalog,
  fetchAiMonitorSessions,
  mergeAiMonitorSessions,
  summarizeAiMonitorSessions,
  updateAiMonitorSessionStatus,
  type AiMonitorSession,
} from '../../lib/ai-monitor-session-client';

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onSessionsChange?: (sessions: AiMonitorSession[], notReadyCount: number) => void;
}

function sessionStatusTag(status: AiMonitorSession['status']) {
  if (status === 'ready') {
    return { label: '已就绪', tagClass: 'geo-tag-success' };
  }
  return { label: '待登录', tagClass: 'geo-tag-warning' };
}

export default function AiMonitorPlatformsPanel({
  brandName,
  onSessionsChange,
}: Props) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AiMonitorSession[]>(() => buildDefaultAiMonitorSessions());
  const [notReadyCount, setNotReadyCount] = useState(buildDefaultAiMonitorSessions().length);
  const [loading, setLoading] = useState(false);

  const applySessions = useCallback(
    (list: AiMonitorSession[]) => {
      const merged = mergeAiMonitorSessions(list);
      const summary = summarizeAiMonitorSessions(merged);
      setSessions(summary.sessions);
      setNotReadyCount(summary.notReadyCount);
      onSessionsChange?.(summary.sessions, summary.notReadyCount);
    },
    [onSessionsChange]
  );

  const loadSessions = useCallback(async () => {
    await ensureAiMonitorPlatformCatalog();
    if (!brandName) {
      applySessions(buildDefaultAiMonitorSessions());
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAiMonitorSessions(brandName);
      applySessions(data.sessions);
    } finally {
      setLoading(false);
    }
  }, [brandName, applySessions]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const overview = useMemo(() => {
    const ready = sessions.filter((s) => s.status === 'ready').length;
    return {
      ready,
      pending: sessions.length - ready,
      total: sessions.length,
    };
  }, [sessions]);

  const markReady = async (platform: string) => {
    const localPatch: Partial<AiMonitorSession> = {
      status: 'ready',
      lastVerifiedAt: new Date().toISOString(),
      lastError: undefined,
    };
    const updated = await updateAiMonitorSessionStatus(brandName, platform, 'ready');
    applySessions(
      mergeAiMonitorSessions(
        sessions.map((s) =>
          s.platform === platform ? { ...s, ...localPatch, ...(updated ?? {}) } : s
        )
      )
    );
    toast(`${platform} 已标记为就绪`, 'success');
  };

  const resetStatus = async (platform: string) => {
    const localPatch: Partial<AiMonitorSession> = {
      status: 'unknown',
      lastVerifiedAt: undefined,
      lastError: undefined,
    };
    const updated = await updateAiMonitorSessionStatus(brandName, platform, 'unknown');
    applySessions(
      mergeAiMonitorSessions(
        sessions.map((s) =>
          s.platform === platform ? { ...s, ...localPatch, ...(updated ?? {}) } : s
        )
      )
    );
    toast(`${platform} 已重置`, 'info');
  };

  const openLogin = (row: AiMonitorSession) => {
    if (!row.loginUrl) {
      toast('该平台未配置登录地址', 'error');
      return;
    }
    if (!openPlatformLogin(row.loginUrl, row.platform)) {
      toast('浏览器拦截了新标签页，请允许弹窗', 'error');
    }
  };

  const renderActions = (row: AiMonitorSession) => {
    const isReady = row.status === 'ready';

    if (isReady) {
      return (
        <span className="flex flex-wrap gap-1 justify-end">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => void resetStatus(row.platform)}
          >
            <RefreshCw className="w-3 h-3" />
            重置
          </button>
        </span>
      );
    }

    return (
      <span className="flex flex-wrap gap-1 justify-end">
        {row.loginUrl && (
          <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => openLogin(row)}>
            打开平台登录页
          </button>
        )}
        <button
          type="button"
          className="geo-btn-secondary geo-btn-xs gap-1"
          onClick={() => void markReady(row.platform)}
        >
          <Check className="w-3 h-3" />
          标记已就绪
        </button>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
        在各 AI 平台完成登录后点击「标记已就绪」；未就绪即视为待登录。登录页复用同一浏览器标签，避免重复打开。
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: '已就绪', value: overview.ready, sub: `共 ${overview.total} 个平台` },
          { label: '待登录', value: overview.pending, sub: '需打开登录页并标记' },
          {
            label: '监测平台',
            value: overview.total,
            sub: overview.ready > 0 ? `${overview.ready} 个可采样` : '全部待配置',
          },
        ].map((item) => (
          <div key={item.label} className="geo-card p-3">
            <p className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
              {item.label}
            </p>
            <p className="text-lg font-bold mt-0.5">{item.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--neutral-text-03)' }}>
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="geo-table-wrap">
        <table className="geo-table geo-table--compact">
          <thead>
            <tr>
              <th>平台</th>
              <th>会话状态</th>
              <th>登录说明</th>
              <th>上次标记</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => {
              const status = sessionStatusTag(row.status);
              return (
                <tr key={row.platform}>
                  <td className="font-medium whitespace-nowrap">{row.platform}</td>
                  <td>
                    <span className={`geo-tag text-[10px] ${status.tagClass}`}>{status.label}</span>
                  </td>
                  <td className="max-w-[280px]">
                    {row.loginHint ? (
                      <p className="text-xs" style={{ color: 'var(--neutral-text-02)' }}>
                        {row.loginHint}
                      </p>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="text-xs whitespace-nowrap" style={{ color: 'var(--neutral-text-03)' }}>
                    {row.lastVerifiedAt ? formatPlanDateTime(row.lastVerifiedAt) : '—'}
                  </td>
                  <td className="text-right">{renderActions(row)}</td>
                </tr>
              );
            })}
            {loading && sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-xs py-6" style={{ color: 'var(--neutral-text-03)' }}>
                  加载中…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {notReadyCount > 0 && (
        <p className="text-xs px-1 text-amber-600">
          {notReadyCount} 个平台尚未标记就绪，执行查询计划前建议先完成登录并手动标记。
        </p>
      )}

      <p className="text-[10px] text-center" style={{ color: 'var(--neutral-text-03)' }}>
        会话状态由你手动确认；登录态保存在本机浏览器，更换电脑后需重新登录并标记。
      </p>
    </div>
  );
}
