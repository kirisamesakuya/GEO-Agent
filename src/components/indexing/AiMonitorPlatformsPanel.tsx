import { useCallback, useEffect, useState } from 'react';
import { Check, Cpu, ExternalLink, RefreshCw, X } from 'lucide-react';
import type { ViewType } from '../../types';
import { formatPlanDateTime } from '../../lib/datetime-local';
import { fetchHermesHealth } from '../../lib/hermes-client';
import { hermesReady } from '../../lib/hermes-status-utils';
import { useToast } from '../../context/ToastContext';
import { useHermesSubmitGuard } from '../hermes/HermesSubmitGuard';
import {
  AI_MONITOR_STATUS_LABEL,
  buildDefaultAiMonitorSessions,
  fetchAiMonitorSessions,
  mergeAiMonitorSessions,
  summarizeAiMonitorSessions,
  verifyAiMonitorSessions,
  updateAiMonitorSessionStatus,
  type AiMonitorSession,
} from '../../lib/ai-monitor-session-client';

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onSessionsChange?: (sessions: AiMonitorSession[], notReadyCount: number) => void;
}

export default function AiMonitorPlatformsPanel({
  brandName,
  onNavigate,
  onSessionsChange,
}: Props) {
  const { toast } = useToast();
  const { ensureHermesReady } = useHermesSubmitGuard();
  const [sessions, setSessions] = useState<AiMonitorSession[]>(() => buildDefaultAiMonitorSessions());
  const [notReadyCount, setNotReadyCount] = useState(buildDefaultAiMonitorSessions().length);
  const [loading, setLoading] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [hermesOnline, setHermesOnline] = useState(false);

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

  const refreshHermes = useCallback(async () => {
    try {
      const health = await fetchHermesHealth();
      setHermesOnline(hermesReady(health));
    } catch {
      setHermesOnline(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void refreshHermes();
  }, [loadSessions, refreshHermes]);

  const hasVerifying = sessions.some((s) => s.status === 'verifying');

  useEffect(() => {
    if (!hasVerifying) return;
    const t = setInterval(() => void loadSessions(), 2500);
    return () => clearInterval(t);
  }, [hasVerifying, loadSessions]);

  const runAutoVerify = async (platforms?: string[]) => {
    const ready = await ensureHermesReady(brandName);
    if (!ready) return;
    if (platforms?.length === 1) {
      setSessions((prev) =>
        prev.map((s) =>
          s.platform === platforms[0] ? { ...s, status: 'verifying' } : s
        )
      );
    } else {
      setVerifyingAll(true);
    }
    const result = await verifyAiMonitorSessions(brandName, platforms);
    if (!result) {
      toast('自动检测发起失败', 'error');
      setVerifyingAll(false);
      await loadSessions();
      return;
    }
    applySessions(result.sessions);
    toast(platforms?.length === 1 ? '已开始自动检测' : '已开始检测全部平台', 'success');
    setVerifyingAll(false);
  };

  const markStatus = async (platform: string, status: 'ready' | 'login_required' | 'unknown') => {
    const localPatch: Partial<AiMonitorSession> = {
      status,
      lastVerifiedAt: new Date().toISOString(),
      lastError: status === 'login_required' ? '待在本机浏览器登录' : undefined,
    };
    const updated = await updateAiMonitorSessionStatus(brandName, platform, status);
    applySessions(
      mergeAiMonitorSessions(
        sessions.map((s) =>
          s.platform === platform ? { ...s, ...localPatch, ...(updated ?? {}) } : s
        )
      )
    );
    if (status === 'ready') toast(`${platform} 已标记为就绪`, 'success');
    else if (status === 'login_required') toast(`${platform} 已标记为需登录`, 'info');
    else toast(`${platform} 已重置校验状态`, 'info');
  };

  const statusClass = (status: AiMonitorSession['status']) => {
    switch (status) {
      case 'ready':
        return 'text-emerald-600';
      case 'login_required':
        return 'text-amber-600';
      case 'verifying':
        return 'text-[var(--color-primary)]';
      case 'unknown':
        return 'text-[var(--neutral-text-03)]';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs px-1" style={{ color: 'var(--neutral-text-02)' }}>
        请在本机浏览器打开下方各 AI 对话页完成登录；登录成功后点击「标记已就绪」即可用于查询采样。
        密码与 Cookie 仅保存在本机浏览器，SaaS 不存储，与「发布账号」无关。
      </p>

      <div className="geo-table-wrap">
        <table className="geo-table">
          <thead>
            <tr>
              <th>平台</th>
              <th>登录入口</th>
              <th>会话状态</th>
              <th>上次校验</th>
              <th className="geo-table__actions min-w-[400px]" aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => (
              <tr key={row.platform}>
                <td className="font-medium whitespace-nowrap">{row.platform}</td>
                <td className="max-w-[220px]">
                  {row.loginUrl ? (
                    <a
                      href={row.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="geo-link text-xs inline-flex items-center gap-1 break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      {row.loginUrl}
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>—</span>
                  )}
                  {row.loginHint && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                      {row.loginHint}
                    </p>
                  )}
                </td>
                <td>
                  <span className={`text-xs font-medium ${statusClass(row.status)}`}>
                    {AI_MONITOR_STATUS_LABEL[row.status]}
                  </span>
                  {row.lastError && row.status !== 'ready' && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--neutral-text-03)' }}>
                      {row.lastError}
                    </p>
                  )}
                </td>
                <td className="text-xs whitespace-nowrap" style={{ color: 'var(--neutral-text-02)' }}>
                  {row.lastVerifiedAt ? formatPlanDateTime(row.lastVerifiedAt) : '—'}
                </td>
                <td className="geo-table__actions min-w-[400px]">
                  <div className="flex flex-nowrap items-center justify-end gap-1.5">
                    {row.loginUrl && (
                      <a
                        href={row.loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="geo-btn-primary geo-btn-xs gap-1 shrink-0 whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        打开对话页
                      </a>
                    )}
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-xs gap-1 shrink-0 whitespace-nowrap"
                      onClick={() => void markStatus(row.platform, 'ready')}
                    >
                      <Check className="w-3 h-3 shrink-0" />
                      标记已就绪
                    </button>
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-xs gap-1 shrink-0 whitespace-nowrap"
                      onClick={() => void markStatus(row.platform, 'login_required')}
                    >
                      <X className="w-3 h-3 shrink-0" />
                      需登录
                    </button>
                    <button
                      type="button"
                      className="geo-link text-xs shrink-0 whitespace-nowrap inline-flex items-center"
                      disabled={row.status === 'verifying'}
                      onClick={() => void runAutoVerify([row.platform])}
                    >
                      自动检测
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      <div
        className="geo-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-dashed"
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--neutral-text-03)' }}>
          <Cpu className="w-4 h-4 shrink-0" aria-hidden />
          <span>可选：本机 Hermes {hermesOnline ? '已连接' : '未就绪'}，用于自动检测登录态</span>
          <button type="button" className="geo-link text-xs" onClick={() => void refreshHermes()}>
            刷新
          </button>
          {onNavigate && (
            <button type="button" className="geo-link text-xs" onClick={() => onNavigate('hermes_console')}>
              管理 Hermes
            </button>
          )}
        </div>
        <button
          type="button"
          className="geo-btn-secondary text-sm gap-1"
          disabled={verifyingAll || hasVerifying}
          onClick={() => void runAutoVerify()}
        >
          <RefreshCw className={`w-4 h-4 ${verifyingAll || hasVerifying ? 'animate-spin' : ''}`} />
          自动检测全部
        </button>
      </div>

      {notReadyCount > 0 && (
        <p className="text-xs px-1 text-amber-600">
          {notReadyCount} 个平台尚未标记就绪，执行查询计划前建议先完成登录并手动校验。
        </p>
      )}
    </div>
  );
}
