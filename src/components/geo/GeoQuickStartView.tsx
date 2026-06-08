import { useMemo, useRef, useState } from 'react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import AgentInputCard from '../common/AgentInputCard';
import AgentTaskBackgroundCard, {
  isAgentTaskBlocking,
  type TaskQueueHint,
} from '../common/AgentTaskBackgroundCard';
import { navigateToAgentTasks } from '../common/AgentTaskProgressLink';
import type { AgentTask, AgentTaskStatus } from '../../types';
import { submitGeoAgentTask } from '../../lib/geo-audit-client';
import { DEFAULT_GEO_AI_PLATFORMS, GEO_AI_PLATFORM_LABELS } from '../../../lib/media-platforms';
import { useHermesSubmitGuard } from '../hermes/HermesSubmitGuard';
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  FileUp,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react';

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onOpenHistory?: (reportId?: string) => void;
}

type MaterialKind = 'link' | 'image' | 'document' | 'text';
type OutputType = 'visibility' | 'technical' | 'content' | 'assets';
type AnalysisDepth = 'quick' | 'deep';

const ANALYSIS_DEPTH_OPTIONS: {
  id: AnalysisDepth;
  label: string;
  hint: string;
}[] = [
  { id: 'quick', label: '快速检测', hint: '平台提及与内容缺口，适合首次体检' },
  { id: 'deep', label: '深度分析', hint: '全模块检测 + 技术资产草稿' },
];

const QUICK_OUTPUTS: OutputType[] = ['visibility', 'content'];
const QUICK_MODULES = ['平台提及速检', '内容可引用性快检'];

/** 深度分析覆盖全部检测模块 */
const DEEP_OUTPUTS: OutputType[] = ['visibility', 'technical', 'content', 'assets'];
const DEEP_MODULES = ['平台提及矩阵', '内容可引用性', '官网技术基础', '技术资产草稿'];

const DEPTH_CONFIG: Record<
  AnalysisDepth,
  {
    taskType: string;
    skill: string;
    titleSuffix: string;
    cardTitle: string;
    cardDescription: string;
    submitLabel: string;
    completeToast: string;
    outputs: OutputType[];
    modules: string[];
  }
> = {
  quick: {
    taskType: 'geo_quick_start',
    skill: 'geo-quick-start',
    titleSuffix: 'GEO 快速检测',
    cardTitle: 'GEO 快速检测',
    cardDescription:
      '上传或粘贴材料后，AI 自动拆解轻量检测方案（平台提及、内容缺口）；确认后提交 Hermes 执行。',
    submitLabel: '提交 Hermes 快速检测',
    completeToast: 'GEO 快速检测完成',
    outputs: QUICK_OUTPUTS,
    modules: QUICK_MODULES,
  },
  deep: {
    taskType: 'geo_audit',
    skill: 'geo-audit',
    titleSuffix: 'GEO 深度分析',
    cardTitle: 'GEO 深度分析',
    cardDescription:
      '上传或粘贴材料后，AI 自动拆解完整检测方案（平台提及、官网技术、内容引用、技术资产）；确认后提交 Hermes 执行。',
    submitLabel: '提交 Hermes 深度分析',
    completeToast: 'GEO 深度分析完成',
    outputs: DEEP_OUTPUTS,
    modules: DEEP_MODULES,
  },
};

interface MaterialInput {
  id: string;
  kind: MaterialKind;
  name: string;
  value: string;
}

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
  const { ensureHermesReady, showHermesError } = useHermesSubmitGuard();
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
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);

  const serviceList = useMemo(() => splitList(services), [services]);
  const evidenceCount = materials.length + (websiteUrl.trim() ? 1 : 0) + (freeText.trim() ? 1 : 0);

  const readinessChecklist = useMemo(
    () => [
      { id: 'name', label: '品牌名称', done: Boolean(name.trim()) },
      { id: 'city', label: '城市/目标市场', done: Boolean(city.trim()) },
      { id: 'services', label: '产品/服务', done: serviceList.length > 0 },
      { id: 'evidence', label: '官网、链接或补充材料', done: evidenceCount > 0 },
    ],
    [name, city, serviceList.length, evidenceCount]
  );

  const depthConfig = DEPTH_CONFIG[analysisDepth];

  const aiPlan = useMemo(() => {
    const missing = readinessChecklist.filter((item) => !item.done).map((item) => item.label);
    const doneCount = readinessChecklist.filter((item) => item.done).length;
    const modeLabel = analysisDepth === 'quick' ? '快速检测' : '深度分析';

    const questions =
      analysisDepth === 'quick'
        ? Math.max(6, Math.min(12, platforms.length * 2 + serviceList.length + evidenceCount + 3))
        : Math.max(12, Math.min(24, platforms.length * 3 + serviceList.length * 2 + evidenceCount * 2 + 4));

    let summary: string;
    if (missing.length === 0) {
      summary =
        analysisDepth === 'quick'
          ? `关键信息已补齐。快速检测将覆盖 ${platforms.length} 个 AI 平台的提及与内容缺口，约 ${questions} 条问题。`
          : `关键信息已补齐。深度分析将把 ${evidenceCount} 组材料拆成 ${questions} 条检测问题，并检查 ${platforms.length} 个 AI 平台及官网技术资产。`;
    } else if (doneCount === 0) {
      summary = `请逐步补齐以下信息，材料越完整，${modeLabel}结论越稳。`;
    } else {
      summary = `已填写 ${doneCount}/${readinessChecklist.length} 项，继续补充剩余项可提升分析质量。`;
    }

    return {
      missing,
      doneCount,
      readinessChecklist,
      questions,
      modules: depthConfig.modules,
      summary,
    };
  }, [analysisDepth, depthConfig.modules, evidenceCount, platforms.length, readinessChecklist, serviceList.length]);

  const onComplete = (task: AgentTask) => {
    setLoading(false);
    setTaskStatus('succeeded');
    const reportId = task.output?.geoReportId as string | undefined;
    const depth: AnalysisDepth = task.type === 'geo_audit' ? 'deep' : 'quick';
    toast(DEPTH_CONFIG[depth].completeToast, 'success');
    if (reportId) onOpenHistory?.(reportId);
  };

  const switchAnalysisDepth = (depth: AnalysisDepth) => {
    setAnalysisDepth(depth);
    setPlanConfirmed(false);
  };

  const togglePlatform = (p: string) => {
    setPlanConfirmed(false);
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
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
    if (!planConfirmed) {
      toast('请先确认 AI 拆解方案，再提交 Hermes', 'error');
      return;
    }
    if (!(await ensureHermesReady(name.trim()))) return;

    setLoading(true);
    setTaskStatus('queued');
    const title = `${name.trim()} · ${depthConfig.titleSuffix}`;
    const { task, error, queueHint: hint } = await submitGeoAgentTask({
      type: depthConfig.taskType,
      title,
      brandName: name.trim(),
      payload: {
        skill: depthConfig.skill,
        brandName: name.trim(),
        brandCity: city.trim() || undefined,
        productNames: serviceList.length ? serviceList : undefined,
        brandUrl: websiteUrl.trim() || undefined,
        brandDesc: freeText.trim() || undefined,
        platforms,
        analysisDepth,
        requestedOutputs: depthConfig.outputs,
        sourceMaterials: [
          ...(websiteUrl.trim()
            ? [{ kind: 'link', name: '官网 URL', value: websiteUrl.trim() }]
            : []),
          ...materials,
        ],
        plannedQuestions: aiPlan.questions,
        plannedModules: aiPlan.modules,
        outputContract: {
          format: 'json',
          version: 'geoWebOutput.v1',
          artifacts: ['markdown', 'pdf', 'screenshots', 'json'],
        },
      },
    });
    if (error || !task) {
      if (error) showHermesError(error, name.trim());
      toast(error ?? '提交失败', 'error');
      setLoading(false);
      setTaskStatus(null);
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
      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content space-y-4 max-w-4xl">
        <AgentInputCard
          title={depthConfig.cardTitle}
          description={depthConfig.cardDescription}
          footer={
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-wrap gap-2 p-1 rounded-lg bg-[var(--neutral-bg-03)] w-full sm:w-auto">
                {ANALYSIS_DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => switchAnalysisDepth(opt.id)}
                    className={`flex-1 sm:flex-none text-xs px-3 py-2 rounded-md font-medium transition ${
                      analysisDepth === opt.id
                        ? 'bg-white text-[var(--color-primary)] shadow-sm'
                        : 'text-[var(--neutral-text-02)] hover:text-[var(--color-title)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="geo-btn-secondary text-sm"
                  onClick={() => {
                    setPlanConfirmed(true);
                    toast('已确认检测方案', 'success');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认 AI 拆解方案
                </button>
                <button
                  type="button"
                  className="geo-btn-primary text-sm"
                  disabled={loading || isAgentTaskBlocking(taskId, taskStatus)}
                  onClick={() => void submit()}
                >
                  {loading ? '分析中…' : depthConfig.submitLabel}
                </button>
              </div>
              {!taskId && loading && (
                <p className="text-xs text-[var(--neutral-text-03)]">正在创建任务…</p>
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

            <div className="rounded-lg bg-[var(--neutral-bg-03)] p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-title)]">输入材料</p>
                  <p className="text-[11px] text-[var(--neutral-text-03)]">支持官网、文章链接、落地页截图、品牌文档、客户案例或补充说明。</p>
                </div>
                <button type="button" className="geo-btn-secondary geo-btn-xs shrink-0" onClick={() => fileInputRef.current?.click()}>
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

              <div
                className="rounded-lg border bg-white p-3 space-y-2"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <p className="text-[11px] font-medium text-[var(--neutral-text-02)]">粘贴链接</p>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-center">
                  <div className="relative min-w-0">
                    <LinkIcon className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-text-03)]" />
                    <input
                      className="geo-input w-full geo-input-with-icon !pl-11"
                      value={materialUrl}
                      onChange={(e) => setMaterialUrl(e.target.value)}
                      placeholder="粘贴官网、文章、竞品或发布内容链接"
                    />
                  </div>
                  <button type="button" className="geo-btn-secondary geo-btn-sm h-10 px-4" onClick={addLinkMaterial}>
                    <Plus className="w-4 h-4" />
                    加入
                  </button>
                </div>
              </div>

              <div
                className="rounded-lg border bg-white p-3 space-y-2"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <p className="text-[11px] font-medium text-[var(--neutral-text-02)]">粘贴文本 / 说明</p>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-start">
                  <textarea
                    className="geo-input w-full min-h-[80px]"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="也可以直接粘贴品牌介绍、客户案例、页面文案或想检测的问题"
                  />
                  <button type="button" className="geo-btn-secondary geo-btn-sm h-10 px-4" onClick={addTextMaterial}>
                    <ClipboardCheck className="w-4 h-4" />
                    加入说明
                  </button>
                </div>
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
                {GEO_AI_PLATFORM_LABELS.map((p) => {
                  const selected = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                        selected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                          : 'border-[var(--neutral-divider-02)] bg-white text-[var(--neutral-text-02)] hover:bg-[var(--neutral-bg-03)] hover:border-[var(--neutral-divider-01)]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
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
          <ul className="space-y-1.5">
            {aiPlan.readinessChecklist.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  item.done
                    ? 'bg-[var(--color-success)]/10 text-[var(--neutral-text-02)]'
                    : 'bg-[var(--color-warning)]/10 text-[var(--neutral-text-02)]'
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-success)]" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 text-[var(--color-warning)]" />
                )}
                <span>{item.label}</span>
                {item.done && (
                  <span className="ml-auto text-[10px] font-medium text-[var(--color-success)]">已填</span>
                )}
              </li>
            ))}
          </ul>
          <div>
            <p className="font-medium text-[var(--neutral-text-02)] mb-2">分析模式</p>
            <div className="grid grid-cols-2 gap-2">
              {ANALYSIS_DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => switchAnalysisDepth(opt.id)}
                  className={`rounded-lg p-3 text-left border transition ${
                    analysisDepth === opt.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-transparent bg-[var(--neutral-bg-03)] hover:border-[var(--neutral-divider-02)]'
                  }`}
                >
                  <p className="font-semibold text-[var(--color-title)]">{opt.label}</p>
                  <p className="text-[10px] text-[var(--neutral-text-03)] mt-1 leading-relaxed">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[var(--neutral-bg-03)] p-3">
              <span className="text-[var(--neutral-text-03)]">当前模式</span>
              <p className="font-semibold text-[var(--color-title)]">
                {ANALYSIS_DEPTH_OPTIONS.find((o) => o.id === analysisDepth)?.label}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--neutral-bg-03)] p-3">
              <span className="text-[var(--neutral-text-03)]">AI 分析数</span>
              <p className="font-semibold text-[var(--color-title)]">{aiPlan.questions} 条</p>
            </div>
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
            {analysisDepth === 'quick' ? (
              <>
                <li>AI 平台提及速检摘要</li>
                <li>内容缺口与优先修复建议</li>
              </>
            ) : (
              <>
                <li>AI 平台提及矩阵与风险等级</li>
                <li>可引用内容缺口和修复建议</li>
                <li>官网技术基础与抓取建议</li>
                <li>Schema / llms.txt / 改写草稿</li>
              </>
            )}
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
