import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import type { AgentTask, AgentTaskLog } from '../../types';
import TaskStatusPill from '../../components/common/TaskStatusPill';
import { useToast } from '../../context/ToastContext';
import { usePlatformRole, type PlatformRole } from '../../hooks/usePlatformRole';
import { platformFetch } from '../../lib/platform-api';
import HermesStatusBadge from '../../components/common/HermesStatusBadge';
import PlatformLayout from './components/PlatformLayout';
import type { PlatformView } from './types';
import './platform-theme.css';
import PlatformDashboardView from './views/PlatformDashboardView';
import PlatformContentGovernanceView from './views/PlatformContentGovernanceView';
import PlatformRiskCenterView from './views/PlatformRiskCenterView';
import PlatformResourceReviewView from './views/PlatformResourceReviewView';
import PlatformRolesView from './views/PlatformRolesView';
import PlatformRankingOpsView from './views/PlatformRankingOpsView';
import PlatformFulfillmentRatingView from './views/PlatformFulfillmentRatingView';
import PlatformNotificationsView from './views/PlatformNotificationsView';
import PlatformSettlementView from './views/PlatformSettlementView';
import PlatformReportsView from './views/PlatformReportsView';
import PlatformMerchantsView from './views/PlatformMerchantsView';
import PlatformOrdersView from './views/PlatformOrdersView';
import PlatformApplicationsView from './views/PlatformApplicationsView';
import PlatformOrgCertsView from './views/PlatformOrgCertsView';
import PlatformConfigsView from './views/PlatformConfigsView';
import { isPlatformViewEnabled } from './platform-feature-flags';

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
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [allProviders, setAllProviders] = useState<Array<Record<string, unknown>>>([]);
  const [view, setView] = useState<PlatformView>('dashboard');
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<AgentTaskLog[]>([]);
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [websiteOrders, setWebsiteOrders] = useState<Array<Record<string, unknown>>>([]);
  const [websiteRequests, setWebsiteRequests] = useState<Array<Record<string, unknown>>>([]);
  const [websiteTab, setWebsiteTab] = useState<'requests' | 'orders'>('requests');
  const [websiteReqFilter, setWebsiteReqFilter] = useState('');
  const [selectedWebsiteRequest, setSelectedWebsiteRequest] = useState<Record<string, unknown> | null>(null);
  const [selectedWebsiteOrder, setSelectedWebsiteOrder] = useState<Record<string, unknown> | null>(null);
  const [websiteAssignId, setWebsiteAssignId] = useState('');
  const [websiteAssignName, setWebsiteAssignName] = useState('');
  const [websitePreviewUrl, setWebsitePreviewUrl] = useState('');
  const [deposits, setDeposits] = useState<Array<{ id: string; brandName: string; amount: number; note: string | null; createdAt: string }>>([]);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [skillRuns, setSkillRuns] = useState<Array<Record<string, unknown>>>([]);
  const [automationRuns, setAutomationRuns] = useState<Array<Record<string, unknown>>>([]);
  const [budgetLedger, setBudgetLedger] = useState<Array<Record<string, unknown>>>([]);
  const [ledgerTab, setLedgerTab] = useState<'all' | 'freeze' | 'release' | 'anomaly'>('all');
  const [aiCredits, setAiCredits] = useState<Array<Record<string, unknown>>>([]);
  const [manualFlagReason, setManualFlagReason] = useState('');
  const [manualReviewCategory, setManualReviewCategory] = useState('');
  const [agentFilterNeedsReview, setAgentFilterNeedsReview] = useState(false);
  const [agentFilterCategory, setAgentFilterCategory] = useState('');
  const [taskSkillRuns, setTaskSkillRuns] = useState<Array<Record<string, unknown>>>([]);
  const [taskAutomationRuns, setTaskAutomationRuns] = useState<Array<Record<string, unknown>>>([]);
  const [statusReason, setStatusReason] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditEntity, setAuditEntity] = useState('');
  const [auditSince, setAuditSince] = useState('');
  const [auditUntil, setAuditUntil] = useState('');
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [agentPage, setAgentPage] = useState(1);
  const [agentHasMore, setAgentHasMore] = useState(false);
  const [adjustBrand, setAdjustBrand] = useState('云杉口腔');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const navigate = (next: PlatformView) => {
    if (!isPlatformViewEnabled(next)) return;
    setView(next);
    setSelectedTask(null);
    setSelectedWebsiteOrder(null);
    setSelectedWebsiteRequest(null);
  };

  const loadAgents = (page: number, append: boolean) => {
    const q = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (agentFilterNeedsReview) q.set('needsReview', 'true');
    if (agentFilterCategory) q.set('reviewCategory', agentFilterCategory);
    fetch(`/api/platform/agent-tasks?${q}`).then((r) => r.json()).then((d) => {
      setTasks(append ? (prev) => [...prev, ...(d.tasks ?? [])] : (d.tasks ?? []));
      setAgentHasMore(Boolean(d.hasMore));
    });
  };

  const load = () => {
    if (view === 'dashboard') {
      fetch('/api/platform/dashboard').then((r) => r.json()).then(setDashboard);
    } else if (view === 'agents') {
      loadAgents(agentPage, agentPage > 1);
    } else if (view === 'hermes') {
      fetch('/api/platform/agent-skill-runs').then((r) => r.json()).then((d) => setSkillRuns(d.runs ?? []));
      fetch('/api/platform/local-automation-runs').then((r) => r.json()).then((d) => setAutomationRuns(d.runs ?? []));
    } else if (view === 'funds') {
      fetch('/api/platform/deposit-requests').then((r) => r.json()).then((d) => setDeposits(d.requests ?? []));
      const lq = new URLSearchParams();
      if (ledgerTab === 'freeze') lq.set('type', 'freeze');
      else if (ledgerTab === 'release') lq.set('type', 'release');
      else if (ledgerTab === 'anomaly') lq.set('anomaly', 'true');
      fetch(`/api/platform/budget-ledgers?${lq}`).then((r) => r.json()).then((d) => setBudgetLedger(d.ledger ?? []));
      fetch('/api/platform/ai-credits').then((r) => r.json()).then((d) => setAiCredits(d.credits ?? []));
    } else if (view === 'providers') {
      fetch('/api/platform/provider-applications').then((r) => r.json()).then((d) => setProviders(d.providers ?? []));
      const q = providerFilter ? `?status=${encodeURIComponent(providerFilter)}` : '';
      fetch(`/api/platform/providers${q}`).then((r) => r.json()).then((d) => setAllProviders(d.providers ?? []));
    } else if (view === 'website') {
      const rq = new URLSearchParams();
      if (websiteReqFilter) rq.set('status', websiteReqFilter);
      fetch(`/api/platform/website-requests?${rq}`).then((r) => r.json()).then((d) => setWebsiteRequests(d.requests ?? []));
      fetch('/api/platform/website-orders').then((r) => r.json()).then((d) => setWebsiteOrders(d.orders ?? []));
    } else if (view === 'audit') {
      const q = new URLSearchParams({ page: '1', pageSize: '50' });
      if (auditAction.trim()) q.set('action', auditAction.trim());
      if (auditEntity.trim()) q.set('entity', auditEntity.trim());
      if (auditSince) q.set('since', auditSince);
      if (auditUntil) q.set('until', auditUntil);
      fetch(`/api/platform/audit-logs?${q}`).then((r) => r.json()).then((d) => {
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
    fetch(`/api/platform/audit-logs?${q}`).then((r) => r.json()).then((d) => {
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
  }, [view, auditAction, auditEntity, auditSince, auditUntil, providerFilter, agentFilterNeedsReview, agentFilterCategory, ledgerTab, websiteReqFilter, websiteTab]);

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
    const res = await fetch(`/api/platform/agent-tasks/${id}`);
    const data = await res.json();
    setSelectedTask(data.task);
    setTaskLogs(data.logs ?? []);
    setTaskSkillRuns(data.skillRuns ?? []);
    setTaskAutomationRuns(data.automationRuns ?? []);
  };

  const selectWebsiteOrder = async (id: string) => {
    const res = await fetch(`/api/platform/website-orders/${id}`);
    const data = await res.json();
    setSelectedWebsiteOrder(data.order ?? null);
    if (data.order) {
      setWebsiteAssignId(String(data.order.assigneeId ?? ''));
      setWebsiteAssignName(String(data.order.assigneeName ?? ''));
      setWebsitePreviewUrl(String(data.order.previewUrl ?? ''));
    }
  };

  const reviewProvider = async (id: string, action: 'approve' | 'reject') => {
    await fetch(`/api/platform/provider-applications/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: action === 'reject' ? '资料不符合要求' : '' }),
    });
    toast(action === 'approve' ? '已通过入驻' : '已驳回', 'success');
    load();
  };

  const adjustBudget = async () => {
    const res = await platformFetch(role, '/api/platform/budget-adjust', {
      method: 'POST',
      body: JSON.stringify({ brandName: adjustBrand, amount: Number(adjustAmount), reason: adjustReason, role }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast('投放余额已调整', 'success');
    setAdjustAmount('');
    setAdjustReason('');
    load();
  };

  const adjustCredits = async () => {
    const res = await platformFetch(role, '/api/platform/ai-credits/adjust', {
      method: 'POST',
      body: JSON.stringify({ brandName: adjustBrand, amount: Number(creditsAmount), reason: adjustReason, role }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    toast('AI 算力已调整', 'success');
    setCreditsAmount('');
    load();
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

  const legacyDrawerOpen = Boolean(
    selectedTask || selectedWebsiteOrder || selectedWebsiteRequest
  );

  return (
    <>
    <PlatformLayout
      view={view}
      onNavigate={navigate}
      drawerOpen={legacyDrawerOpen}
      drawer={(
        <>
        {selectedTask && view === 'agents' && (
          <aside className="w-[440px] border-l overflow-y-auto p-4 space-y-4 shrink-0" style={{ borderColor: 'var(--neutral-divider-02)' }}>
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
        {selectedWebsiteRequest && view === 'website' && websiteTab === 'requests' && (
          <aside className="w-[420px] border-l overflow-y-auto p-4 space-y-4 shrink-0" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <button type="button" className="text-xs geo-nav-item" onClick={() => setSelectedWebsiteRequest(null)}>关闭</button>
            <h3 className="font-semibold">{String(selectedWebsiteRequest.pageType)}</h3>
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>{String(selectedWebsiteRequest.brandName)} · {String(selectedWebsiteRequest.status)}</p>
            <p className="text-sm">{String(selectedWebsiteRequest.goal)}</p>
            {selectedWebsiteRequest.previewHtml && (
              <div className="border rounded-lg overflow-hidden max-h-40" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                <iframe title="预览" className="w-full h-40 bg-white" sandbox="" srcDoc={String(selectedWebsiteRequest.previewHtml)} />
              </div>
            )}
            {String(selectedWebsiteRequest.status) !== 'ordered' && (
              <button type="button" className="geo-btn-primary text-sm w-full" onClick={async () => {
                const res = await fetch(`/api/platform/website-requests/${String(selectedWebsiteRequest.id)}/create-order`, { method: 'POST' });
                const data = await res.json();
                if (data.error) { toast(data.error, 'error'); return; }
                toast('已创建网站订单', 'success');
                setWebsiteTab('orders');
                setSelectedWebsiteRequest(null);
                load();
              }}>从需求创建订单</button>
            )}
          </aside>
        )}
        {selectedWebsiteOrder && view === 'website' && websiteTab === 'orders' && (
          <aside className="w-[420px] border-l overflow-y-auto p-4 space-y-4 shrink-0" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <h3 className="font-semibold text-sm">{String((selectedWebsiteOrder.request as Record<string, unknown>)?.pageType ?? '网站订单')}</h3>
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>{String(selectedWebsiteOrder.brandName)} · {String(selectedWebsiteOrder.status)}</p>
            <input value={websiteAssignId} onChange={(e) => setWebsiteAssignId(e.target.value)} placeholder="指派 ID（接单方/设计师）"
              className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }} />
            <input value={websiteAssignName} onChange={(e) => setWebsiteAssignName(e.target.value)} placeholder="指派姓名"
              className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }} />
            <input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="操作原因"
              className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }} />
            <button type="button" className="geo-btn-primary text-sm w-full" onClick={async () => {
              if (!websiteAssignId || !websiteAssignName) { toast('请填写指派信息', 'error'); return; }
              await fetch(`/api/platform/website-orders/${String(selectedWebsiteOrder.id)}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigneeId: websiteAssignId, assigneeName: websiteAssignName, reason: statusReason }),
              });
              toast('已指派', 'success');
              load();
              void selectWebsiteOrder(String(selectedWebsiteOrder.id));
            }}>指派设计师</button>
          </aside>
        )}
        </>
      )}
    >
          {view === 'dashboard' && (
            <PlatformDashboardView dashboard={dashboard} onNavigate={navigate} />
          )}

          {view === 'content_governance' && <PlatformContentGovernanceView />}
          {view === 'risk_center' && <PlatformRiskCenterView onNavigate={navigate} />}
          {/* 本期隐藏：resource_review / fulfillment_rating，见 platform-feature-flags.ts */}
          {view === 'resource_review' && isPlatformViewEnabled('resource_review') && (
            <PlatformResourceReviewView />
          )}
          {view === 'roles' && <PlatformRolesView />}
          {view === 'ranking_ops' && <PlatformRankingOpsView />}
          {view === 'fulfillment_rating' && isPlatformViewEnabled('fulfillment_rating') && (
            <PlatformFulfillmentRatingView />
          )}
          {view === 'notifications' && <PlatformNotificationsView />}
          {view === 'settlement' && <PlatformSettlementView />}
          {view === 'reports' && <PlatformReportsView />}
          {view === 'merchants' && <PlatformMerchantsView />}
          {view === 'orders' && <PlatformOrdersView />}
          {view === 'applications' && <PlatformApplicationsView />}
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

          {view === 'funds' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">资金与算力监管</h2>
              <div className="platform-card p-4">
                <h3 className="font-semibold text-sm mb-3">待审核入账</h3>
                {deposits.length === 0 ? <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>无</p> : deposits.map((d) => (
                  <div key={d.id} className="flex justify-between items-center py-2 border-b text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                    <span>{d.brandName} · ¥{d.amount}</span>
                    <div className="flex gap-2">
                      <button type="button" className="geo-btn-primary geo-btn-xs" onClick={async () => {
                        const res = await platformFetch(role, `/api/platform/deposit-requests/${d.id}/approve`, {
                          method: 'POST',
                          body: JSON.stringify({ role }),
                        });
                        const data = await res.json();
                        if (data.error) { toast(data.error, 'error'); return; }
                        toast('已通过', 'success'); load();
                      }}>通过</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="platform-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">人工调整（须填写原因，写入审计）</h3>
                <input value={adjustBrand} onChange={(e) => setAdjustBrand(e.target.value)} placeholder="品牌名"
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="调整原因（必填）"
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                <div className="flex gap-2 flex-wrap">
                  <input value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="投放余额 ±金额"
                    className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                  <button type="button" className="geo-btn-primary text-sm" disabled={!can('funds.adjust')}
                    onClick={() => requestSensitiveConfirm('确认调整投放余额？', () => void adjustBudget())}>调整余额</button>
                  <input value={creditsAmount} onChange={(e) => setCreditsAmount(e.target.value)} placeholder="AI 算力 ±点数"
                    className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                  <button type="button" className="geo-btn-secondary text-sm" onClick={() => void adjustCredits()}>调整算力</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="platform-card overflow-hidden">
                  <div className="platform-card-header flex flex-wrap gap-2 items-center justify-between">
                    <span>投放余额流水</span>
                    <div className="flex gap-1">
                      {(['all', 'freeze', 'release', 'anomaly'] as const).map((tab) => (
                        <button key={tab} type="button" onClick={() => setLedgerTab(tab)}
                          className={`text-[10px] px-2 py-0.5 rounded ${ledgerTab === tab ? 'geo-nav-active' : 'geo-nav-item'}`}>
                          {tab === 'all' ? '全部' : tab === 'freeze' ? '冻结' : tab === 'release' ? '释放' : '异常'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <table className="platform-table platform-table--compact">
                    <thead><tr><th>品牌</th><th>类型</th><th>金额</th></tr></thead>
                    <tbody>
                      {budgetLedger.length === 0 ? (
                        <tr><td colSpan={3} className="platform-table-empty">无记录</td></tr>
                      ) : budgetLedger.slice(0, 20).map((row, i) => (
                        <tr key={i} style={row.anomaly ? { background: '#fef2f2' } : undefined}>
                          <td>{String(row.brandName)}</td>
                          <td>{String(row.type)}{row.anomaly ? ' ⚠' : ''}</td>
                          <td>¥{Number(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="platform-card overflow-hidden">
                  <div className="platform-card-header">AI 算力余额</div>
                  <table className="platform-table platform-table--compact">
                    <thead><tr><th>品牌</th><th>余额</th></tr></thead>
                    <tbody>
                      {aiCredits.map((c) => (
                        <tr key={String(c.brandName)}>
                          <td>{String(c.brandName)}</td>
                          <td>{Number(c.balance)} 点</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'providers' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">接单方管理</h2>
              <div className="platform-card overflow-hidden">
                <div className="platform-card-header flex gap-2 flex-wrap">
                  <span>全部接单方</span>
                  {['', 'submitted', 'approved', 'rejected'].map((s) => (
                    <button key={s || 'all'} type="button" className={`text-xs px-2 py-0.5 rounded ${providerFilter === s ? 'geo-nav-active' : 'geo-nav-item'}`}
                      onClick={() => setProviderFilter(s)}>
                      {s === '' ? '全部' : s === 'submitted' ? '待审核' : s === 'approved' ? '已通过' : '已驳回'}
                    </button>
                  ))}
                </div>
                <table className="platform-table platform-table--compact">
                  <thead><tr><th>名称</th><th>类型</th><th>状态</th><th>申请</th></tr></thead>
                  <tbody>
                    {allProviders.map((p) => (
                      <tr key={String(p.id)}>
                        <td>{String(p.name)}</td>
                        <td>{String(p.type)}</td>
                        <td>{String(p.applicationStatus)}</td>
                        <td>{Number((p._count as Record<string, number>)?.orderApplications ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="font-semibold text-sm">待审核入驻</h3>
              {providers.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--neutral-text-03)' }}>暂无待审核申请</p>
              ) : providers.map((p) => {
                const logs = (p.reviewLogs as Array<Record<string, unknown>>) ?? [];
                const apps = (p.applications as Array<Record<string, unknown>>) ?? [];
                return (
                  <div key={String(p.id)} className="platform-card p-4 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold">{String(p.name)}</h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                          {String(p.type)} · {String(p.contactName ?? '')} · {String(p.phone ?? '')} · {String(p.city ?? '')}
                        </p>
                        {apps[0] && (
                          <p className="text-xs mt-2" style={{ color: 'var(--neutral-text-03)' }}>
                            能力：{String(p.platforms ?? '—')} · 行业：{String(p.industryTags ?? '—')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => void reviewProvider(String(p.id), 'approve')}>通过</button>
                        <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void reviewProvider(String(p.id), 'reject')}>驳回</button>
                      </div>
                    </div>
                    {logs.length > 0 && (
                      <div className="text-xs border-t pt-2" style={{ borderColor: 'var(--neutral-divider-02)', color: 'var(--neutral-text-03)' }}>
                        审核记录：{logs.map((l) => `${String(l.action)} (${new Date(String(l.createdAt)).toLocaleDateString('zh-CN')})`).join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {view === 'website' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-lg font-bold">网站需求与订单</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setWebsiteTab('requests')}
                    className={`text-xs px-3 py-1.5 rounded-lg ${websiteTab === 'requests' ? 'geo-nav-active' : 'geo-nav-item'}`}>
                    需求列表
                  </button>
                  <button type="button" onClick={() => setWebsiteTab('orders')}
                    className={`text-xs px-3 py-1.5 rounded-lg ${websiteTab === 'orders' ? 'geo-nav-active' : 'geo-nav-item'}`}>
                    执行订单
                  </button>
                </div>
              </div>

              {websiteTab === 'requests' ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {['', 'draft', 'preview_ready', 'ordered'].map((s) => (
                      <button key={s || 'all'} type="button" onClick={() => setWebsiteReqFilter(s)}
                        className={`text-xs px-2 py-1 rounded ${websiteReqFilter === s ? 'geo-nav-active' : 'geo-nav-item'}`}>
                        {s === '' ? '全部' : s === 'preview_ready' ? '待确认' : s === 'ordered' ? '已下单' : '草稿'}
                      </button>
                    ))}
                  </div>
                  <div className="platform-card overflow-hidden">
                    <table className="platform-table">
                      <thead><tr><th>品牌</th><th>页面</th><th>状态</th><th>附件</th><th>订单</th></tr></thead>
                      <tbody>
                        {websiteRequests.length === 0 ? (
                          <tr><td colSpan={5} className="platform-table-empty">暂无网站需求</td></tr>
                        ) : websiteRequests.map((r) => {
                          const atts = (r.attachments as unknown[]) ?? [];
                          const orders = (r.orders as unknown[]) ?? [];
                          return (
                            <tr key={String(r.id)} className="cursor-pointer" onClick={() => setSelectedWebsiteRequest(r)}>
                              <td>{String(r.brandName)}</td>
                              <td>{String(r.pageType)}</td>
                              <td>{String(r.status)}</td>
                              <td>{atts.length}</td>
                              <td>{orders.length}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="platform-card overflow-hidden">
                  <table className="platform-table">
                    <thead><tr><th>品牌</th><th>页面</th><th>指派</th><th>状态</th></tr></thead>
                    <tbody>
                      {websiteOrders.length === 0 ? (
                        <tr><td colSpan={4} className="platform-table-empty">暂无网站订单</td></tr>
                      ) : websiteOrders.map((o) => (
                        <tr key={String(o.id)} className="cursor-pointer" onClick={() => { setSelectedWebsiteRequest(null); void selectWebsiteOrder(String(o.id)); }}>
                          <td>{String(o.brandName)}</td>
                          <td>{String((o.request as Record<string, unknown>)?.pageType ?? '—')}</td>
                          <td>{String(o.assigneeName ?? '—')}</td>
                          <td>{String(o.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === 'audit' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">审计日志</h2>
              <div className="flex gap-2 flex-wrap items-center">
                <input value={auditAction} onChange={(e) => setAuditAction(e.target.value)} placeholder="筛选动作（如 settlement）"
                  className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                <input value={auditEntity} onChange={(e) => setAuditEntity(e.target.value)} placeholder="筛选实体（如 TaskOrder）"
                  className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                <input type="date" value={auditSince} onChange={(e) => setAuditSince(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
                <input type="date" value={auditUntil} onChange={(e) => setAuditUntil(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
              </div>
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
