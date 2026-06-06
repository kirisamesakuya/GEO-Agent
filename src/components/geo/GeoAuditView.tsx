import { useState } from 'react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAgentTaskPolling } from '../../hooks/useAgentTaskPolling';
import AgentInputCard from '../common/AgentInputCard';
import TaskStatusPill from '../common/TaskStatusPill';
import { AgentTaskProgressHint, isAgentTaskInProgress } from '../common/AgentTaskProgressLink';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import type { AgentTask, AgentTaskStatus } from '../../types';
import { submitGeoAgentTask } from '../../lib/geo-audit-client';
import { DEFAULT_GEO_AI_PLATFORMS, GEO_AI_PLATFORM_LABELS } from '../../../lib/media-platforms';
import HermesReadinessPanel from './HermesReadinessPanel';

const MODULES = [
  { id: 'audit', label: '总审计' },
  { id: 'technical', label: '技术基础' },
  { id: 'crawlers', label: 'AI 爬虫访问' },
  { id: 'schema', label: 'Schema' },
  { id: 'llmstxt', label: 'llms.txt' },
  { id: 'content', label: '内容可引用性' },
];

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onOpenHistory?: (reportId?: string) => void;
}

export default function GeoAuditView({ brandName, onNavigate, onOpenHistory }: Props) {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pageUrls, setPageUrls] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [market, setMarket] = useState('china');
  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_GEO_AI_PLATFORMS, 'Kimi']);
  const [modules, setModules] = useState(MODULES.map((m) => m.id));
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const displayBrand = brandName === '__all__' ? '品牌' : brandName;

  const onComplete = (task: AgentTask) => {
    setLoading(false);
    setTaskStatus('succeeded');
    toast('专业审计完成', 'success');
    const reportId = task.output?.geoReportId as string | undefined;
    if (reportId) onOpenHistory?.(reportId);
  };
  const onUpdate = (task: AgentTask) => setTaskStatus(resolveTaskPillDisplay(task).status);
  useAgentTaskPolling({ taskId, onUpdate, onComplete });

  const submit = async () => {
    if (!websiteUrl.trim()) {
      toast('请填写官网 URL', 'error');
      return;
    }
    if (brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    setLoading(true);
    setTaskStatus('waiting_local_device');
    const { task, error } = await submitGeoAgentTask({
      type: 'geo_audit',
      title: `${displayBrand} · GEO 专业审计`,
      brandName: displayBrand,
      payload: {
        skill: 'geo-audit',
        brandName: displayBrand,
        brandUrl: websiteUrl.trim(),
        brandCity: market.trim() || undefined,
        pageUrls: pageUrls.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5),
        competitors: competitors.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5),
        platforms,
        modules,
        outputContract: { format: 'json', artifacts: ['markdown', 'pdf', 'screenshots', 'json'] },
      },
    });
    if (error || !task) {
      toast(error ?? '提交失败', 'error');
      setLoading(false);
      return;
    }
    setTaskId(task.id);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content max-w-3xl px-6 pb-6">
        <AgentInputCard
          title="GEO 专业审计"
          description="由本机 Hermes 执行 geo-audit 技能，输出结构化审计报告与 artifact"
          footer={
            <div className="flex flex-col gap-2 w-full">
              <button type="button" className="geo-btn-primary text-sm" disabled={loading || brandName === '__all__'} onClick={() => void submit()}>
                {loading ? '等待本机 Hermes 执行…' : '提交专业审计'}
              </button>
              {taskStatus && (
                <div className="flex flex-col gap-1 items-start">
                  <TaskStatusPill status={taskStatus} />
                  {isAgentTaskInProgress(taskStatus) && onNavigate && (
                    <AgentTaskProgressHint onNavigate={onNavigate} taskId={taskId} />
                  )}
                </div>
              )}
            </div>
          }
        >
          <HermesReadinessPanel brandName={displayBrand} compact onNavigate={onNavigate} />
          <div className="space-y-3 mt-3">
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
      </div>

      <aside className="hidden lg:block w-56 shrink-0 border-l p-4 text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <p className="font-semibold mb-2">审计模块</p>
        <div className="space-y-1">
          {MODULES.map((m) => (
            <label key={m.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modules.includes(m.id)}
                onChange={() =>
                  setModules((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                }
              />
              {m.label}
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
}
