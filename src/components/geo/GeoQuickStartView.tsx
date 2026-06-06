import { useMemo, useRef, useState } from 'react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAgentTaskPolling } from '../../hooks/useAgentTaskPolling';
import AgentInputCard from '../common/AgentInputCard';
import TaskStatusPill from '../common/TaskStatusPill';
import { AgentTaskProgressHint, isAgentTaskInProgress, navigateToAgentTasks } from '../common/AgentTaskProgressLink';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import type { AgentTask, AgentTaskStatus } from '../../types';
import { submitGeoAgentTask } from '../../lib/geo-audit-client';
import { DEFAULT_GEO_AI_PLATFORMS, GEO_AI_PLATFORM_LABELS } from '../../../lib/media-platforms';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FileUp,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onOpenHistory?: (reportId?: string) => void;
}

type MaterialKind = 'link' | 'image' | 'document' | 'text';
type AnalysisDepth = 'quick' | 'deep';
type OutputType = 'visibility' | 'technical' | 'content' | 'assets';

interface MaterialInput {
  id: string;
  kind: MaterialKind;
  name: string;
  value: string;
}

const OUTPUT_OPTIONS: { id: OutputType; label: string; desc: string }[] = [
  { id: 'visibility', label: 'AI 平台提及检测', desc: '看品牌是否被豆包、DeepSeek、Kimi 等平台提到' },
  { id: 'technical', label: '官网可抓取检查', desc: '检查官网、页面、Schema、llms.txt 等基础项' },
  { id: 'content', label: '内容可引用性分析', desc: '判断材料是否容易被 AI 摘录、推荐和引用' },
  { id: 'assets', label: '生成技术资产草稿', desc: '输出 Schema、llms.txt 或内容改写建议' },
];

function splitList(value: string): string[] {
  return value.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
}

function materialIcon(kind: MaterialKind) {
  if (kind === 'image') return ImageIcon;
  if (kind === 'document') return FileText;
  if (kind === 'link') return LinkIcon;
  return ClipboardCheck;
}

export default function GeoQuickStartView({ brandName, onNavigate, onOpenHistory }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(brandName === '__all__' ? '' : brandName);
  const [city, setCity] = useState('');
  const [services, setServices] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [freeText, setFreeText] = useState('');
  const [materials, setMaterials] = useState<MaterialInput[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_GEO_AI_PLATFORMS, 'Kimi']);
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('quick');
  const [outputs, setOutputs] = useState<OutputType[]>(['visibility', 'content']);
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);

  const serviceList = useMemo(() => splitList(services), [services]);
  const evidenceCount = materials.length + (websiteUrl.trim() ? 1 : 0) + (freeText.trim() ? 1 : 0);

  const aiPlan = useMemo(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('品牌名称');
    if (!city.trim()) missing.push('城市/目标市场');
    if (!serviceList.length) missing.push('产品/服务');
    if (evidenceCount === 0) missing.push('官网、链接、图片、文档或补充描述');

    const recommendedDepth: AnalysisDepth = evidenceCount >= 2 || outputs.includes('technical') || outputs.includes('assets') ? 'deep' : 'quick';
    const questions = Math.max(8, Math.min(24, platforms.length * 3 + serviceList.length * 2 + evidenceCount * 2));
    const modules = [
      outputs.includes('visibility') ? '平台提及矩阵' : null,
      outputs.includes('content') ? '内容可引用性' : null,
      outputs.includes('technical') ? '官网技术基础' : null,
      outputs.includes('assets') ? '技术资产草稿' : null,
    ].filter(Boolean);

    return {
      missing,
      recommendedDepth,
      questions,
      modules,
      summary:
        missing.length > 0
          ? `还缺 ${missing.join('、')}，补齐后检测结论会更稳。`
          : `AI 将把 ${evidenceCount} 组材料拆成 ${questions} 条检测问题，并检查 ${platforms.length} 个 AI 平台。`,
    };
  }, [evidenceCount, name, city, serviceList.length, outputs, platforms.length]);

  const onComplete = (task: AgentTask) => {
    setLoading(false);
    setTaskStatus('succeeded');
    const reportId = task.output?.geoReportId as string | undefined;
    toast('GEO 智能检测完成', 'success');
    if (reportId) onOpenHistory?.(reportId);
  };

  const onUpdate = (task: AgentTask) => setTaskStatus(resolveTaskPillDisplay(task).status);
  useAgentTaskPolling({ taskId, onUpdate, onComplete });

  const togglePlatform = (p: string) => {
    setPlanConfirmed(false);
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const toggleOutput = (id: OutputType) => {
    setPlanConfirmed(false);
    setOutputs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length ? next : prev;
    });
  };

  const addLinkMaterial = () => {
    const value = materialUrl.trim();
    if (!value) return;
    setPlanConfirmed(false);
    setMaterials((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind: 'link', name: value.replace(/^https?:\/\//, '').slice(0, 42), value },
    ]);
    setMaterialUrl('');
  };

  const addTextMaterial = () => {
    const value = freeText.trim();
    if (!value) return;
    setPlanConfirmed(false);
    setMaterials((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind: 'text', name: `补充说明 ${prev.filter((m) => m.kind === 'text').length + 1}`, value },
    ]);
    setFreeText('');
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setPlanConfirmed(false);
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      kind: file.type.startsWith('image/') ? 'image' : 'document',
      name: file.name,
      value: `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)}MB · ${file.type || 'unknown'}`,
    })) satisfies MaterialInput[];
    setMaterials((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    if (!name.trim()) {
      toast('请填写品牌名称', 'error');
      return;
    }
    if (!outputs.length) {
      toast('请至少选择一个检测目标', 'error');
      return;
    }
    if (!planConfirmed) {
      toast('请先确认 AI 拆解方案，再提交 Hermes', 'error');
      return;
    }

    setLoading(true);
    setTaskStatus('queued');
    const taskType = analysisDepth === 'deep' || outputs.includes('technical') || outputs.includes('assets') ? 'geo_audit' : 'geo_quick_start';
    const { task, error } = await submitGeoAgentTask({
      type: taskType,
      title: `${name.trim()} · GEO 智能检测`,
      brandName: name.trim(),
      payload: {
        skill: taskType === 'geo_audit' ? 'geo-audit' : 'geo-quick-start',
        brandName: name.trim(),
        brandCity: city.trim() || undefined,
        productNames: serviceList.length ? serviceList : undefined,
        brandUrl: websiteUrl.trim() || undefined,
        brandDesc: freeText.trim() || undefined,
        platforms,
        analysisDepth,
        requestedOutputs: outputs,
        sourceMaterials: [
          ...(websiteUrl.trim()
            ? [{ kind: 'link', name: '官网 URL', value: websiteUrl.trim() }]
            : []),
          ...materials,
        ],
        plannedQuestions: aiPlan.questions,
        plannedModules: aiPlan.modules,
      },
    });
    if (error || !task) {
      toast(error ?? '提交失败', 'error');
      setLoading(false);
      setTaskStatus(null);
      return;
    }
    setTaskId(task.id);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content space-y-4 max-w-4xl px-6 pb-6">
        <AgentInputCard
          title="GEO 智能检测"
          description="先上传或粘贴材料，AI 自动拆解检测范围；确认后再提交 Hermes。"
          footer={
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="geo-btn-secondary text-sm"
                  onClick={() => {
                    setAnalysisDepth(aiPlan.recommendedDepth);
                    setPlanConfirmed(true);
                    toast('已确认检测方案', 'success');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认 AI 拆解方案
                </button>
                <button type="button" className="geo-btn-primary text-sm" disabled={loading} onClick={() => void submit()}>
                  {loading ? '检测中…' : '提交 Hermes 检测'}
                </button>
              </div>
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
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="geo-label">品牌名称 *</label>
                <input
                  className="geo-input w-full mt-1"
                  value={name}
                  onChange={(e) => {
                    setPlanConfirmed(false);
                    setName(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="geo-label">城市 / 目标市场</label>
                <input
                  className="geo-input w-full mt-1"
                  value={city}
                  onChange={(e) => {
                    setPlanConfirmed(false);
                    setCity(e.target.value);
                  }}
                  placeholder="南京 / 中国"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="geo-label">产品 / 服务</label>
                <input
                  className="geo-input w-full mt-1"
                  value={services}
                  onChange={(e) => {
                    setPlanConfirmed(false);
                    setServices(e.target.value);
                  }}
                  placeholder="种植牙, 隐形矫正"
                />
              </div>
              <div>
                <label className="geo-label">官网 URL（可选）</label>
                <input
                  className="geo-input w-full mt-1"
                  value={websiteUrl}
                  onChange={(e) => {
                    setPlanConfirmed(false);
                    setWebsiteUrl(e.target.value);
                  }}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-title)]">输入材料</p>
                  <p className="text-[11px] text-[var(--neutral-text-03)]">支持官网、文章链接、落地页截图、品牌文档、客户案例或补充说明。</p>
                </div>
                <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="w-3.5 h-3.5" />
                  上传图片/文档
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.md"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-text-03)]" />
                  <input
                    className="geo-input w-full pl-9"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="粘贴官网、文章、竞品或发布内容链接"
                  />
                </div>
                <button type="button" className="geo-btn-secondary geo-btn-sm" onClick={addLinkMaterial}>
                  <Plus className="w-4 h-4" />
                  加入
                </button>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                <textarea
                  className="geo-input w-full min-h-[72px]"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="也可以直接粘贴品牌介绍、客户案例、页面文案或想检测的问题"
                />
                <button type="button" className="geo-btn-secondary geo-btn-sm self-start" onClick={addTextMaterial}>
                  <ClipboardCheck className="w-4 h-4" />
                  加入说明
                </button>
              </div>

              {materials.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {materials.map((m) => {
                    const Icon = materialIcon(m.kind);
                    return (
                      <div key={m.id} className="flex items-center gap-2 rounded-lg bg-[var(--neutral-bg-03)] px-3 py-2 text-xs">
                        <Icon className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                        <span className="flex-1 truncate">{m.name}</span>
                        <button
                          type="button"
                          className="p-1 text-[var(--neutral-text-03)] hover:text-[var(--color-danger)]"
                          onClick={() => {
                            setPlanConfirmed(false);
                            setMaterials((prev) => prev.filter((x) => x.id !== m.id));
                          }}
                          aria-label="移除材料"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="geo-label">目标平台</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GEO_AI_PLATFORM_LABELS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${platforms.includes(p) ? 'geo-nav-active' : 'geo-nav-item'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="geo-label">希望 AI 检查什么</label>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {OUTPUT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOutput(option.id)}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                      outputs.includes(option.id)
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--neutral-divider-02)] hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    <span className="text-xs font-semibold block text-[var(--color-title)]">{option.label}</span>
                    <span className="text-[11px] text-[var(--neutral-text-03)]">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AgentInputCard>
      </div>

      <aside className="hidden xl:block w-80 shrink-0 border-l p-4 text-xs space-y-4 overflow-y-auto" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <div className="geo-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center">
              <Wand2 className="w-4 h-4" />
            </span>
            <div>
              <p className="font-semibold text-[var(--color-title)]">AI 拆解方案</p>
              <p className="text-[11px] text-[var(--neutral-text-03)]">{planConfirmed ? '已确认，可提交执行' : '提交前请先确认'}</p>
            </div>
          </div>
          <p className="text-[var(--neutral-text-02)] leading-relaxed">{aiPlan.summary}</p>
          {aiPlan.missing.length > 0 && (
            <div className="rounded-lg bg-[var(--color-warning)]/10 px-3 py-2 text-[11px] text-[var(--neutral-text-02)]">
              建议补充：{aiPlan.missing.join('、')}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[var(--neutral-bg-03)] p-3">
              <span className="text-[var(--neutral-text-03)]">检测深度</span>
              <p className="font-semibold text-[var(--color-title)]">{analysisDepth === 'deep' ? '深度检测' : '快速检测'}</p>
            </div>
            <div className="rounded-lg bg-[var(--neutral-bg-03)] p-3">
              <span className="text-[var(--neutral-text-03)]">AI 问题数</span>
              <p className="font-semibold text-[var(--color-title)]">{aiPlan.questions} 条</p>
            </div>
          </div>
          <div className="flex rounded-lg bg-[var(--neutral-bg-03)] p-1">
            {(['quick', 'deep'] as const).map((depth) => (
              <button
                key={depth}
                type="button"
                onClick={() => {
                  setPlanConfirmed(false);
                  setAnalysisDepth(depth);
                }}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] ${
                  analysisDepth === depth ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-[var(--neutral-text-03)]'
                }`}
              >
                {depth === 'quick' ? '快速' : '深度'}
              </button>
            ))}
          </div>
          <div>
            <p className="font-medium text-[var(--neutral-text-02)] mb-2">将执行</p>
            <ul className="space-y-1">
              {aiPlan.modules.map((m) => (
                <li key={String(m)} className="flex items-center gap-2 text-[var(--neutral-text-03)]">
                  <Search className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="geo-card p-4 space-y-2">
          <p className="font-semibold text-[var(--color-title)]">预计产物</p>
          <ul className="space-y-1 text-[var(--neutral-text-03)] list-disc pl-4">
            <li>AI 平台提及矩阵与风险等级</li>
            <li>可引用内容缺口和修复建议</li>
            {analysisDepth === 'deep' && <li>官网技术基础与抓取建议</li>}
            {outputs.includes('assets') && <li>Schema / llms.txt / 改写草稿</li>}
          </ul>
          {onNavigate && (
            <button type="button" className="geo-link text-[11px]" onClick={() => navigateToAgentTasks(onNavigate, taskId)}>
              查看任务详情
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
