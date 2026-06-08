import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import AgentInputCard from '../common/AgentInputCard';
import AgentTaskBackgroundCard, {
  isAgentTaskBlocking,
  type TaskQueueHint,
} from '../common/AgentTaskBackgroundCard';
import type { AgentTask, AgentTaskStatus } from '../../types';
import { submitGeoAgentTask } from '../../lib/geo-audit-client';
import { AUDIT_MODULE_SPECS, resolveAuditModuleTask } from '../../lib/geo-audit-modules';
import { DEFAULT_GEO_AI_PLATFORMS, GEO_AI_PLATFORM_LABELS } from '../../../lib/media-platforms';
import { useHermesSubmitGuard } from '../hermes/HermesSubmitGuard';

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onOpenHistory?: (reportId?: string) => void;
}

export default function GeoAuditView({ brandName, onNavigate, onOpenHistory }: Props) {
  const { toast } = useToast();
  const { ensureHermesReady, showHermesError } = useHermesSubmitGuard();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pageUrls, setPageUrls] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [market, setMarket] = useState('china');
  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_GEO_AI_PLATFORMS, 'Kimi']);
  const [modules, setModules] = useState(AUDIT_MODULE_SPECS.map((m) => m.id));
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);
  const displayBrand = brandName === '__all__' ? '品牌' : brandName;

  const modulePlan = resolveAuditModuleTask(modules);
  const isSingleModuleRun = modules.length === 1 && modules[0] !== 'audit';

  useEffect(() => {
    if (!brandName || brandName === '__all__') return;
    void fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.website && !websiteUrl) setWebsiteUrl(String(data.website));
      })
      .catch(() => {});
  }, [brandName, websiteUrl]);

  const onComplete = (task: AgentTask) => {
    setLoading(false);
    setTaskStatus('succeeded');
    toast(isSingleModuleRun ? `${modulePlan.label}已完成` : '专业审计完成', 'success');
    const reportId = task.output?.geoReportId as string | undefined;
    if (reportId) onOpenHistory?.(reportId);
  };

  const submit = async (mode: 'full' | 'modules') => {
    if (!websiteUrl.trim()) {
      toast('请填写官网 URL', 'error');
      return;
    }
    if (brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    if (mode === 'modules' && modules.length === 0) {
      toast('请至少选择一个审计模块', 'error');
      return;
    }
    if (!(await ensureHermesReady(displayBrand))) return;

    const plan = mode === 'modules' ? resolveAuditModuleTask(modules) : resolveAuditModuleTask(AUDIT_MODULE_SPECS.map((m) => m.id));
    const pageUrlList = pageUrls.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5);
    const competitorList = competitors.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);

    setLoading(true);
    setTaskStatus('waiting_local_device');
    const title = `${displayBrand} · GEO ${plan.label}`;
    const { task, error, queueHint: hint } = await submitGeoAgentTask({
      type: plan.type,
      title,
      brandName: displayBrand,
      payload: {
        skill: plan.skill,
        brandName: displayBrand,
        brandUrl: websiteUrl.trim(),
        brandCity: market.trim() || undefined,
        pageUrls: pageUrlList,
        competitors: plan.type === 'geo_audit' ? competitorList : undefined,
        platforms,
        ...(plan.modules ? { modules: plan.modules } : {}),
        ...(plan.type === 'geo_content' && pageUrlList.length === 0
          ? { targetQuestions: competitorList.length ? competitorList : undefined }
          : {}),
        outputContract: { format: 'json', version: 'geoWebOutput.v1', artifacts: ['markdown', 'pdf', 'screenshots', 'json'] },
      },
    });
    if (error || !task) {
      if (error) showHermesError(error, displayBrand);
      toast(error ?? '提交失败', 'error');
      setLoading(false);
      return;
    }
    setTaskId(task.id);
    setTaskTitle(title);
    setTaskStatus(task.status);
    setQueueHint(hint ?? null);
    setLoading(false);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content max-w-3xl">
        <AgentInputCard
          title="GEO 专业审计"
          description={
            isSingleModuleRun
              ? `将单跑「${modulePlan.label}」专项（${modulePlan.skill}），不触发完整 geo-audit`
              : '由本机 Hermes 执行 geo-audit 或专项 skill，输出结构化报告与 artifact'
          }
          footer={
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                className="geo-btn-primary text-sm"
                disabled={loading || brandName === '__all__' || isAgentTaskBlocking(taskId, taskStatus)}
                onClick={() => void submit('full')}
              >
                {loading ? '等待本机 Hermes 执行…' : '提交完整专业审计'}
              </button>
              <button
                type="button"
                className="geo-btn-secondary text-sm"
                disabled={
                  loading ||
                  brandName === '__all__' ||
                  modules.length === 0 ||
                  isAgentTaskBlocking(taskId, taskStatus)
                }
                onClick={() => void submit('modules')}
              >
                {loading
                  ? '等待本机 Hermes 执行…'
                  : isSingleModuleRun
                    ? `单跑：${modulePlan.label}`
                    : `单跑选中模块（${modules.length} 项）`}
              </button>
              {!taskId && loading && (
                <p className="text-xs text-[var(--neutral-text-03)]">正在创建任务…</p>
              )}
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-[var(--neutral-text-03)]">品牌：{displayBrand}</p>
            <div>
              <label className="geo-label">官网 URL *</label>
              <input className="geo-input w-full mt-1" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            </div>
            <div>
              <label className="geo-label">重点页面 URLs（每行一个，最多 5 个）</label>
              <textarea className="geo-input w-full mt-1 min-h-[64px]" value={pageUrls} onChange={(e) => setPageUrls(e.target.value)} />
            </div>
            <div>
              <label className="geo-label">竞品（名称或 URL）</label>
              <input className="geo-input w-full mt-1" value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="geo-label">目标市场</label>
                <select className="geo-input w-full mt-1" value={market} onChange={(e) => setMarket(e.target.value)}>
                  <option value="china">中国</option>
                  <option value="overseas">海外</option>
                  <option value="dual">双市场</option>
                </select>
              </div>
              <div>
                <label className="geo-label">目标平台</label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {GEO_AI_PLATFORM_LABELS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
                      className={`text-[10px] px-2 py-0.5 rounded ${platforms.includes(p) ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AgentInputCard>

        {taskId && (
          <div className="mt-4">
            <AgentTaskBackgroundCard
              taskId={taskId}
              taskTitle={taskTitle}
              initialStatus={taskStatus}
              queueHint={queueHint}
              onNavigate={onNavigate}
              onComplete={onComplete}
              onStatusChange={setTaskStatus}
            />
          </div>
        )}
      </div>

      <aside className="hidden lg:block w-56 shrink-0 border-l p-4 text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <p className="font-semibold mb-2">审计模块</p>
        <p className="text-[10px] text-[var(--neutral-text-03)] mb-2 leading-relaxed">
          勾选后可用「单跑选中模块」。仅选 1 项时将映射到对应 Hermes 专项 skill。
        </p>
        <div className="space-y-1">
          {AUDIT_MODULE_SPECS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modules.includes(m.id)}
                onChange={() =>
                  setModules((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                }
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
}
