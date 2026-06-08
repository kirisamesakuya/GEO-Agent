import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import type { AgentTask, AgentTaskLog } from '../../types';
import TaskStatusPill from '../../components/common/TaskStatusPill';
import { useToast } from '../../context/ToastContext';
import { usePlatformFetch } from '../../hooks/usePlatformFetch';
import { usePlatformRole, type PlatformRole } from '../../hooks/usePlatformRole';
import { platformFetch } from '../../lib/platform-api';
import HermesStatusBadge from '../../components/common/HermesStatusBadge';
import PlatformLayout from './components/PlatformLayout';
import type { PlatformView } from './types';
import './platform-theme.css';
import PlatformDashboardView from './views/PlatformDashboardView';
import PlatformContentGovernanceView from './views/PlatformContentGovernanceView';
import PlatformResourceReviewView from './views/PlatformResourceReviewView';
import PlatformRolesView from './views/PlatformRolesView';
import PlatformRankingOpsView from './views/PlatformRankingOpsView';
import PlatformFulfillmentRatingView from './views/PlatformFulfillmentRatingView';
import PlatformReportsView from './views/PlatformReportsView';
import PlatformMerchantsView from './views/PlatformMerchantsView';
import PlatformOrdersView from './views/PlatformOrdersView';
import PlatformWebsiteOpsView from './views/PlatformWebsiteOpsView';
import PlatformOrgCertsView from './views/PlatformOrgCertsView';
import PlatformConfigsView from './views/PlatformConfigsView';
import PlatformFundsView from './views/PlatformFundsView';
import PlatformPublisherAccountsView from './views/PlatformPublisherAccountsView';
import PlatformProviderAccountsView from './views/PlatformProviderAccountsView';
import PlatformUsersView from './views/PlatformUsersView';
import PlatformProvidersView from './views/PlatformProvidersView';
import PlatformMenuAdminView from './views/PlatformMenuAdminView';
import PlatformFilterBar from './components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from './components/PlatformFilterField';
import { isPlatformViewEnabled, isPlatformViewVisibleForRole } from './platform-feature-flags';

const REVIEW_CATEGORY_LABELS: Record<string, string> = {
  need_reauth: '需商家重新授权',
  need_manual_publish: '需人工发布',
  retry_ok: '可重试',
};

const ROLE_LABELS: Record<PlatformRole, string> = {
  admin: '管理员',
  ops: '运营',
  reviewer: '审核',
  support: '客服',
};

export default function PlatformApp() {
  const { toast } = useToast();
  const { role, setRole, can } = usePlatformRole();
  const pf = usePlatformFetch();
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [view, setView] = useState<PlatformView>('dashboard');
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<AgentTaskLog[]>([]);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [skillRuns, setSkillRuns] = useState<Array<Record<string, unknown>>>([]);
  const [automationRuns, setAutomationRuns] = useState<Array<Record<string, unknown>>>([]);
  const [manualFlagReason, setManualFlagReason] = useState('');
  const [manualReviewCategory, setManualReviewCategory] = useState('');
  const [agentFilterNeedsReview, setAgentFilterNeedsReview] = useState(false);
  const [agentFilterCategory, setAgentFilterCategory] = useState('');
  const [taskSkillRuns, setTaskSkillRuns] = useState<Array<Record<string, unknown>>>([]);
  const [taskAutomationRuns, setTaskAutomationRuns] = useState<Array<Record<string, unknown>>>([]);
  const [auditAction, setAuditAction] = useState('');
  const [auditEntity, setAuditEntity] = useState('');
  const [auditSince, setAuditSince] = useState('');
  const [auditUntil, setAuditUntil] = useState('');
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [agentPage, setAgentPage] = useState(1);
  const [agentHasMore, setAgentHasMore] = useState(false);
  const navigate = (next: PlatformView) => {
    if (!isPlatformViewVisibleForRole(next, role)) return;
    setView(next);
    setSelectedTask(null);
  };

  const loadAgents = (page: number, append: boolean) => {
    const q = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (agentFilterNeedsReview) q.set('needsReview', 'true');
    if (agentFilterCategory) q.set('reviewCategory', agentFilterCategory);
    pf(`/api/platform/agent-tasks?${q}`).then((r) => r.json()).then((d) => {
      setTasks(append ? (prev) => [...prev, ...(d.tasks ?? [])] : (d.tasks ?? []));
      setAgentHasMore(Boolean(d.hasMore));
    });
  };

  const load = () => {
    if (view === 'dashboard') {
      pf('/api/platform/dashboard').then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.error) {
          setDashboard({ error: typeof d.error === 'string' ? d.error : `请求失败 (${r.status})` });
          return;
        }
        setDashboard(d);
      });
    } else if (view === 'agents') {
      loadAgents(agentPage, agentPage > 1);
    } else if (view === 'hermes') {
      pf('/api/platform/agent-skill-runs').then((r) => r.json()).then((d) => setSkillRuns(d.runs ?? []));
      pf('/api/platform/local-automation-runs').then((r) => r.json()).then((d) => setAutomationRuns(d.runs ?? []));
    } else if (view === 'audit') {
      const q = new URLSearchParams({ page: '1', pageSize: '50' });
      if (auditAction.trim()) q.set('action', auditAction.trim());
      if (auditEntity.trim()) q.set('entity', auditEntity.trim());
      if (auditSince) q.set('since', auditSince);
      if (auditUntil) q.set('until', auditUntil);
      pf(`/api/platform/audit-logs?${q}`).then((r) => r.json()).then((d) => {
        setLogs(d.logs ?? []);
        setAuditHasMore(Boolean(d.hasMore));
      });
    }
  };

  const loadMoreAudit = () => {
    const q = new URLSearchParams({ page: String(Math.floor(logs.length / 50) + 1), pageSize: '50' });
    if (auditAction.trim()) q.set('action', auditAction.trim());
    if (auditEntity.trim()) q.set('entity', auditEntity.trim());
    if (auditSince) q.set('since', auditSince);
    if (auditUntil) q.set('until', auditUntil);
    pf(`/api/platform/audit-logs?${q}`).then((r) => r.json()).then((d) => {
      setLogs((prev) => [...prev, ...(d.logs ?? [])]);
      setAuditHasMore(Boolean(d.hasMore));
    });
  };

  useEffect(() => {
    if (view === 'agents') {
      setAgentPage(1);
      setTasks([]);
      loadAgents(1, false);
      return;
    }
    load();
  }, [view, auditAction, auditEntity, auditSince, auditUntil, agentFilterNeedsReview, agentFilterCategory, pf]);

  useEffect(() => {
    if (view === 'agents' && agentPage > 1) loadAgents(agentPage, true);
  }, [agentPage]);

  const requestSensitiveConfirm = (label: string, action: () => void) => {
    setConfirmText(label);
    setPendingAction(() => action);
  };

  const runPendingAction = () => {
    pendingAction?.();
    setPendingAction(null);
    setConfirmText('');
  };

  const selectTask = async (id: string) => {
    const res = await pf(`/api/platform/agent-tasks/${id}`);
    const data = await res.json();
    setSelectedTask(data.task);
    setTaskLogs(data.logs ?? []);
    setTaskSkillRuns(data.skillRuns ?? []);
    setTaskAutomationRuns(data.automationRuns ?? []);
  };

  const flagManual = async () => {
    if (!selectedTask || !manualFlagReason.trim()) return;
    const res = await platformFetch(role, `/api/platform/agent-tasks/${selectedTask.id}/manual-flag`, {
      method: 'POST',
      body: JSON.stringify({
        reason: manualFlagReason,
        category: manualReviewCategory || null,
        role,
      }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast('已标记待人工处理', 'info');
    setManualFlagReason('');
    void selectTask(selectedTask.id);
    load();
  };

  const legacyDrawerOpen = Boolean(selectedTask);

  return (
    <>
    <PlatformLayout
      view={view}
      onNavigate={navigate}
      drawerOpen={legacyDrawerOpen}
      drawer={(
        <>
        {selectedTask && view === 'agents' && (
          <aside className="w-full lg:w-[440px] border-t lg:border-t-0 border-l overflow-y-auto p-4 space-y-4 shrink-0 max-h-[50vh] lg:max-h-none" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <h3 className="font-semibold text-sm">{selectedTask.title}</h3>
            <div className="flex gap-2 flex-wrap items-center">
              <TaskStatusPill status={selectedTask.status} userErrorMessage={selectedTask.userErrorMessage} output={selectedTask.output} />
              <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>{selectedTask.type} · {selectedTask.executor}</span>
            </div>
            {(selectedTask as AgentTask & { needsReview?: boolean; reviewCategory?: string }).needsReview && (
              <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                待人工：{REVIEW_CATEGORY_LABELS[(selectedTask as AgentTask & { reviewCategory?: string }).reviewCategory ?? ''] ?? '未分类'}
              </p>
            )}
            {selectedTask.businessRef && (
              <p className="text-xs">业务对象：<code className="bg-[var(--color-bg)] px-1 rounded">{selectedTask.businessRef}</code></p>
            )}
            <div>
              <h4 className="text-xs font-semibold mb-1">输入摘要</h4>
              <pre className="text-xs bg-[var(--color-bg)] p-3 rounded overflow-auto max-h-32">{JSON.stringify(selectedTask.input, null, 2)}</pre>
            </div>
            {selectedTask.output && (
              <div>
                <h4 className="text-xs font-semibold mb-1">输出摘要</h4>
                <pre className="text-xs bg-[var(--color-bg)] p-3 rounded overflow-auto max-h-32">{JSON.stringify(selectedTask.output, null, 2)}</pre>
              </div>
            )}
            {(selectedTask.errorMessage || selectedTask.userErrorMessage) && (
              <div className="platform-card p-3 text-xs border-l-4 border-red-400">
                <p className="font-medium text-red-700">错误</p>
                <p>{selectedTask.userErrorMessage ?? selectedTask.errorMessage}</p>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold mb-2">执行轨迹</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {taskLogs.map((log) => (
                  <div key={log.id} className="text-xs border-l-2 pl-2" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                    <span className="opacity-60">{new Date(log.createdAt).toLocaleTimeString('zh-CN')}</span> {log.message}
                  </div>
                ))}
              </div>
            </div>
            {taskSkillRuns.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1">Skill 调用</h4>
                {taskSkillRuns.map((r) => (
                  <p key={String(r.id)} className="text-xs py-1">{String(r.skillName)} · {String(r.status)}</p>
                ))}
              </div>
            )}
            {taskAutomationRuns.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1">本地自动化</h4>
                {taskAutomationRuns.map((r) => (
                  <p key={String(r.id)} className="text-xs py-1">{String(r.automationType)} · {String(r.status)}</p>
                ))}
              </div>
            )}
            <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <select value={manualReviewCategory} onChange={(e) => setManualReviewCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                <option value="">运营分类（可选）</option>
                <option value="need_reauth">需商家重新授权</option>
                <option value="need_manual_publish">需人工发布</option>
                <option value="retry_ok">可重试</option>
              </select>
              <input value={manualFlagReason} onChange={(e) => setManualFlagReason(e.target.value)} placeholder="人工处理原因"
                className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }} />
              <div className="flex gap-2 flex-wrap">
                <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void flagManual()} disabled={!can('agent.review')}>标记人工处理</button>
                <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={async () => {
                  const res = await platformFetch(role, `/api/platform/agent-tasks/${selectedTask.id}/retry`, { method: 'POST', body: JSON.stringify({ role }) });
                  if ((await res.json()).error) { toast('重试失败', 'error'); return; }
                  toast('已重试', 'info'); load(); void selectTask(selectedTask.id);
                }}>重试</button>
                <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={async () => {
                  const res = await platformFetch(role, `/api/platform/agent-tasks/${selectedTask.id}/cancel`, { method: 'POST', body: JSON.stringify({ role }) });
                  if ((await res.json()).error) { toast('取消失败', 'error'); return; }
                  toast('已取消', 'info'); load();
                }}>取消</button>
              </div>
            </div>
          </aside>
        )}
        </>
      )}
    >
          {view === 'dashboard' && (
            <PlatformDashboardView dashboard={dashboard} onNavigate={navigate} />
          )}

          {view === 'content_governance' && <PlatformContentGovernanceView />}
          {/* 本期隐藏：resource_review / fulfillment_rating，见 platform-feature-flags.ts */}
          {view === 'resource_review' && isPlatformViewEnabled('resource_review') && (
            <PlatformResourceReviewView />
          )}
          {view === 'publisher_users' && <PlatformUsersView scope="publisher" />}
          {view === 'provider_users' && <PlatformUsersView scope="provider" />}
          {(view === 'roles' || view === 'platform_members') && <PlatformRolesView section="members" />}
          {view === 'role_permissions' && <PlatformRolesView section="permissions" />}
          {view === 'menu_admin' && <PlatformMenuAdminView />}
          {view === 'publisher_accounts' && <PlatformPublisherAccountsView section="balances" />}
          {view === 'publisher_deposits' && <PlatformPublisherAccountsView section="deposits" />}
          {view === 'provider_accounts' && <PlatformProviderAccountsView />}
          {view === 'provider_settlement' && <PlatformFundsView section="settlement" />}
          {view === 'provider_withdrawals' && <PlatformFundsView section="withdrawals" />}
          {view === 'funds' && <PlatformFundsView section="settlement" />}
          {view === 'ranking_ops' && <PlatformRankingOpsView />}
          {view === 'fulfillment_rating' && isPlatformViewEnabled('fulfillment_rating') && (
            <PlatformFulfillmentRatingView />
          )}
          {view === 'reports' && isPlatformViewEnabled('reports') && <PlatformReportsView />}
          {view === 'merchants' && <PlatformMerchantsView />}
          {view === 'orders' && <PlatformOrdersView />}
          {view === 'website' && <PlatformWebsiteOpsView />}
          {view === 'org_certs' && <PlatformOrgCertsView />}
          {view === 'configs' && <PlatformConfigsView />}

          {view === 'agents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold">Agent 监控</h2>
                <HermesStatusBadge />
              </div>
              <div className="flex gap-2 flex-wrap items-center text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={agentFilterNeedsReview} onChange={(e) => setAgentFilterNeedsReview(e.target.checked)} />
                  仅待人工
                </label>
                <select value={agentFilterCategory} onChange={(e) => setAgentFilterCategory(e.target.value)}
                  className="px-2 py-1 border rounded-lg text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                  <option value="">全部分类</option>
                  <option value="need_reauth">需重新授权</option>
                  <option value="need_manual_publish">需人工发布</option>
                  <option value="retry_ok">可重试</option>
                </select>
              </div>
              <div className="platform-card overflow-hidden">
                <table className="platform-table">
                  <thead><tr><th>任务</th><th>类型</th><th>状态</th><th>人工</th><th>时间</th></tr></thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id} className="cursor-pointer" onClick={() => void selectTask(t.id)}>
                        <td className="max-w-[180px] truncate">{t.title}</td>
                        <td>{t.type}</td>
                        <td>
                          <TaskStatusPill
                            status={t.status}
                            userErrorMessage={t.userErrorMessage}
                            output={t.output}
                            size="sm"
                          />
                        </td>
                        <td className="text-xs">
                          {(t as AgentTask & { needsReview?: boolean; reviewCategory?: string }).needsReview
                            ? REVIEW_CATEGORY_LABELS[(t as AgentTask & { reviewCategory?: string }).reviewCategory ?? ''] ?? '待处理'
                            : '—'}
                        </td>
                        <td className="text-xs">{new Date(t.createdAt).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {agentHasMore && (
                <button type="button" className="geo-btn-secondary text-sm" onClick={() => setAgentPage((p) => p + 1)}>
                  加载更多 Agent 任务
                </button>
              )}
            </div>
          )}

          {view === 'hermes' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Hermes Skill 与本地自动化</h2>
              <div className="platform-card overflow-hidden">
                <div className="platform-card-header">Skill 调用</div>
                <table className="platform-table">
                  <thead><tr><th>Skill</th><th>执行器</th><th>状态</th><th>耗时</th><th>时间</th></tr></thead>
                  <tbody>
                    {skillRuns.length === 0 ? (
                      <tr><td colSpan={5} className="platform-table-empty">暂无记录，Agent 任务执行后自动写入</td></tr>
                    ) : skillRuns.map((r) => (
                      <tr key={String(r.id)}>
                        <td>{String(r.skillName)}</td>
                        <td>{String(r.executor ?? '—')}</td>
                        <td>{String(r.status)}</td>
                        <td>{r.durationMs ? `${r.durationMs}ms` : '—'}</td>
                        <td className="text-xs">{new Date(String(r.createdAt)).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="platform-card overflow-hidden">
                <div className="platform-card-header">本地自动化</div>
                <table className="platform-table">
                  <thead><tr><th>类型</th><th>环境</th><th>状态</th><th>证据</th></tr></thead>
                  <tbody>
                    {automationRuns.length === 0 ? (
                      <tr><td colSpan={4} className="platform-table-empty">自动发布任务执行后写入</td></tr>
                    ) : automationRuns.map((r) => (
                      <tr key={String(r.id)}>
                        <td>{String(r.automationType ?? '—')}</td>
                        <td>{String(r.environment)}</td>
                        <td>{String(r.status)}</td>
                        <td className="text-xs truncate max-w-[200px]">{String(r.evidenceUrl ?? r.errorMessage ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'providers' && <PlatformProvidersView />}

          {view === 'audit' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">审计日志</h2>
              <PlatformFilterBar onReset={() => { setAuditAction(''); setAuditEntity(''); setAuditSince(''); setAuditUntil(''); }}>
                <PlatformFilterField label="动作">
                  <input value={auditAction} onChange={(e) => setAuditAction(e.target.value)} placeholder="如 settlement" className="platform-filter-input" />
                </PlatformFilterField>
                <PlatformFilterField label="实体">
                  <input value={auditEntity} onChange={(e) => setAuditEntity(e.target.value)} placeholder="如 TaskOrder" className="platform-filter-input" />
                </PlatformFilterField>
                <PlatformFilterDateRange since={auditSince} until={auditUntil} onSinceChange={setAuditSince} onUntilChange={setAuditUntil} />
              </PlatformFilterBar>
              <div className="platform-card overflow-hidden">
                <table className="platform-table">
                  <thead><tr><th>动作</th><th>实体</th><th>详情</th><th>时间</th></tr></thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={String(l.id)}>
                        <td className="text-xs">{String(l.action)}</td>
                        <td>{String(l.entity)} / {String(l.entityId ?? '—')}</td>
                        <td className="text-xs max-w-[200px] truncate">{String(l.detail ?? '—')}</td>
                        <td className="text-xs">{new Date(String(l.createdAt)).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {auditHasMore && (
                <button type="button" className="geo-btn-secondary text-sm" onClick={() => void loadMoreAudit()}>
                  加载更多日志
                </button>
              )}
            </div>
          )}
    </PlatformLayout>

      {pendingAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="platform-card max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm">敏感操作确认</h3>
            <p className="text-sm" style={{ color: 'var(--neutral-text-02)' }}>{confirmText}</p>
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>当前角色：{ROLE_LABELS[role]} · 操作将写入审计日志</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="geo-btn-secondary text-sm" onClick={() => setPendingAction(null)}>取消</button>
              <button type="button" className="geo-btn-primary text-sm" onClick={() => runPendingAction()}>确认执行</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
