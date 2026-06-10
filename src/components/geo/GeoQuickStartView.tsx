import { useEffect, useMemo, useState } from 'react';
import type { ViewType, BrandProfile } from '../../types';
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
import { FieldCharLimitBox, FieldLimitLabel, fieldCharLimitInputClass } from '../common/FieldCharLimit';
import {
  BRAND_DESCRIPTION_MAX,
  BRAND_NAME_MAX,
  validateBrandProfileText,
} from '../../lib/brand-profile-limits';
import { useHermesSubmitGuard } from '../hermes/HermesSubmitGuard';
import {
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Plus,
  Search,
  Wand2,
  X,
} from 'lucide-react';
import GeoWebsiteDeployChecklist from './GeoWebsiteDeployChecklist';
import { fetchOnboardingStatus } from '../../lib/onboarding-client';

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onOpenHistory?: (reportId?: string) => void;
}

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
    cardDescription: '填写品牌资料，确认方案后检测 AI 平台提及与内容缺口。',
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
    cardDescription: '填写品牌资料，确认方案后输出全模块 GEO 检测与技术资产建议。',
    submitLabel: '提交 Hermes 深度分析',
    completeToast: 'GEO 深度分析完成',
    outputs: DEEP_OUTPUTS,
    modules: DEEP_MODULES,
  },
};

function splitList(value: string): string[] {
  return value.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
}

const REFERENCE_LINK_MAX = 10;

export default function GeoQuickStartView({ brandName, onNavigate, onOpenHistory }: Props) {
  const { toast } = useToast();
  const { ensureHermesReady, showHermesError } = useHermesSubmitGuard();
  const [name, setName] = useState(() =>
    (brandName === '__all__' ? '' : brandName).slice(0, BRAND_NAME_MAX)
  );
  const [city, setCity] = useState('');
  const [services, setServices] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [freeText, setFreeText] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_GEO_AI_PLATFORMS, 'Kimi']);
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('quick');
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [libraryKeywords, setLibraryKeywords] = useState<string[]>([]);
  const [activeOnboardingTaskId, setActiveOnboardingTaskId] = useState<string | null>(null);

  const workspaceBrand = brandName !== '__all__' ? brandName.trim() : '';

  useEffect(() => {
    if (!workspaceBrand) return;

    setPlanConfirmed(false);
    setName(workspaceBrand.slice(0, BRAND_NAME_MAX));
    setProfileLoading(true);
    let cancelled = false;

    void fetch(`/api/brand-profile?brandName=${encodeURIComponent(workspaceBrand)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BrandProfile | null) => {
        if (cancelled || !data?.name) return;
        setName(String(data.name).slice(0, BRAND_NAME_MAX));
        setCity(String(data.city ?? '').trim());
        const serviceText =
          Array.isArray(data.keywords) && data.keywords.length > 0
            ? data.keywords.join(', ')
            : String(data.description ?? '').trim();
        setServices(serviceText.slice(0, BRAND_DESCRIPTION_MAX));
        setWebsiteUrl(String(data.website ?? '').trim());
        setFreeText(String(data.description ?? '').trim().slice(0, BRAND_DESCRIPTION_MAX));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceBrand]);

  useEffect(() => {
    if (!workspaceBrand) {
      setActiveOnboardingTaskId(null);
      return;
    }
    let cancelled = false;
    void fetchOnboardingStatus(workspaceBrand)
      .then((s) => {
        if (!cancelled) setActiveOnboardingTaskId(s.activeGeoTaskId ?? null);
      })
      .catch(() => {
        if (!cancelled) setActiveOnboardingTaskId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceBrand]);

  useEffect(() => {
    if (!workspaceBrand) {
      setLibraryKeywords([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/keywords?brandName=${encodeURIComponent(workspaceBrand)}`)
      .then((r) => (r.ok ? r.json() : { keywords: [] }))
      .then((d: { keywords?: Array<{ term: string }> }) => {
        if (cancelled) return;
        setLibraryKeywords((d.keywords ?? []).map((k) => k.term).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setLibraryKeywords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceBrand]);

  const serviceList = useMemo(() => splitList(services), [services]);
  const evidenceCount =
    (websiteUrl.trim() ? 1 : 0) + referenceLinks.length + (freeText.trim() ? 1 : 0);

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
  const activeDepthOption = ANALYSIS_DEPTH_OPTIONS.find((o) => o.id === analysisDepth)!;

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

  const addReferenceLink = () => {
    const url = linkDraft.trim();
    if (!url) return;
    if (referenceLinks.length >= REFERENCE_LINK_MAX) {
      toast(`最多添加 ${REFERENCE_LINK_MAX} 条参考链接`, 'error');
      return;
    }
    if (referenceLinks.includes(url)) {
      toast('该链接已添加', 'error');
      return;
    }
    setPlanConfirmed(false);
    setReferenceLinks((prev) => [...prev, url]);
    setLinkDraft('');
  };

  const removeReferenceLink = (index: number) => {
    setPlanConfirmed(false);
    setReferenceLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const profileError = validateBrandProfileText({
      name,
      description: freeText.trim() ? freeText : undefined,
    });
    if (profileError) {
      toast(profileError, 'error');
      return;
    }
    if (!name.trim()) {
      toast('请填写品牌名称', 'error');
      return;
    }
    if (services.trim().length > BRAND_DESCRIPTION_MAX) {
      toast(`产品/服务不能超过 ${BRAND_DESCRIPTION_MAX} 字`, 'error');
      return;
    }
    if (!planConfirmed) {
      toast('请先确认 AI 拆解方案，再提交 Hermes', 'error');
      return;
    }
    const detectBrand = name.trim();
    if (workspaceBrand && detectBrand !== workspaceBrand) {
      toast(
        `当前工作区为「${workspaceBrand}」，品牌名称须一致；请切换上方工作区品牌或改回该名称后再提交`,
        'error'
      );
      return;
    }
    const taskBrand = workspaceBrand || detectBrand;
    if (!(await ensureHermesReady(taskBrand))) return;

    const plannedQuestionTerms = [
      ...libraryKeywords.slice(0, 12),
      ...serviceList.map((s) => `${taskBrand} ${s}`.trim()),
      ...platforms.map((p) => `${taskBrand} 在${p}的推荐情况`),
    ].filter((v, i, arr) => v.length > 0 && arr.indexOf(v) === i).slice(0, 20);

    setLoading(true);
    setTaskStatus('queued');
    const title = `${taskBrand} · ${depthConfig.titleSuffix}`;
    const { task, error, queueHint: hint } = await submitGeoAgentTask({
      type: depthConfig.taskType,
      title,
      brandName: taskBrand,
      payload: {
        skill: depthConfig.skill,
        brandName: taskBrand,
        brandCity: city.trim() || undefined,
        productNames: serviceList.length ? serviceList : undefined,
        brandUrl: websiteUrl.trim() || undefined,
        brandDesc: freeText.trim() || undefined,
        platforms,
        analysisDepth,
        requestedOutputs: depthConfig.outputs,
        sourceMaterials: [
          ...(websiteUrl.trim()
            ? [{ kind: 'link' as const, name: '官网 URL', value: websiteUrl.trim() }]
            : []),
          ...referenceLinks.map((url, index) => ({
            kind: 'link' as const,
            name: referenceLinks.length > 1 ? `参考链接 ${index + 1}` : '参考链接',
            value: url,
          })),
          ...(freeText.trim()
            ? [{ kind: 'text' as const, name: '补充说明', value: freeText.trim() }]
            : []),
        ],
        plannedQuestions: plannedQuestionTerms.length ? plannedQuestionTerms : undefined,
        plannedModules: aiPlan.modules,
        outputContract: {
          format: 'json',
          version: 'geoWebOutput.v1',
          artifacts: ['markdown', 'pdf', 'screenshots', 'json'],
        },
      },
    });
    if (error || !task) {
      if (error) showHermesError(error, taskBrand);
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

  const analysisDepthSwitcher = (
    <div
      className="flex h-full shrink-0 items-center gap-1 p-1 rounded-lg bg-[var(--neutral-bg-03)]"
      role="group"
      aria-label="分析模式"
    >
      {ANALYSIS_DEPTH_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => switchAnalysisDepth(opt.id)}
          className={`h-full min-h-[2.5rem] text-xs px-3 rounded-md font-medium transition whitespace-nowrap ${
            analysisDepth === opt.id
              ? 'bg-white text-[var(--color-primary)] shadow-sm'
              : 'text-[var(--neutral-text-02)] hover:text-[var(--color-title)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content space-y-4 max-w-4xl">
        {activeOnboardingTaskId && !taskId && onNavigate && (
          <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-light)]/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-title)]">已有进行中的 GEO 首检</p>
              <p className="text-xs text-[var(--neutral-text-03)] mt-1">
                请先在「添加品牌 · 首次体检」流程或检测进度页查看，避免重复提交。
              </p>
            </div>
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm"
              onClick={() => onNavigate('brand_onboarding', activeOnboardingTaskId)}
            >
              查看检测进度
            </button>
          </div>
        )}
        <AgentInputCard
          title={depthConfig.cardTitle}
          description={depthConfig.cardDescription}
          headerLeading={analysisDepthSwitcher}
          footer={
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:items-center">
              <div className="flex flex-wrap gap-2 sm:ml-auto">
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
                <p className="text-xs text-[var(--neutral-text-03)] sm:w-full">正在创建任务…</p>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLimitLabel label="品牌名称 *" className="block mb-1" />
                <FieldCharLimitBox current={name.length} max={BRAND_NAME_MAX} className="mt-0">
                  <input
                    className={`geo-input w-full ${fieldCharLimitInputClass()} ${workspaceBrand ? 'bg-[var(--neutral-bg-02)] cursor-default' : ''}`}
                    value={name}
                    maxLength={BRAND_NAME_MAX}
                    readOnly={Boolean(workspaceBrand)}
                    disabled={profileLoading && !workspaceBrand}
                    aria-readonly={Boolean(workspaceBrand)}
                    onChange={(e) => {
                      if (workspaceBrand) return;
                      setPlanConfirmed(false);
                      setName(e.target.value.slice(0, BRAND_NAME_MAX));
                    }}
                  />
                </FieldCharLimitBox>
                {workspaceBrand && (
                  <p className="text-[10px] mt-1 text-[var(--color-accent)] font-medium">
                    本次检测归属：{workspaceBrand}（切换请使用顶栏品牌选择器）
                    {profileLoading ? ' · 资料加载中…' : ''}
                  </p>
                )}
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
                <FieldLimitLabel label="产品 / 服务" className="block mb-1" />
                <FieldCharLimitBox current={services.length} max={BRAND_DESCRIPTION_MAX}>
                  <input
                    className={`geo-input w-full ${fieldCharLimitInputClass()}`}
                    value={services}
                    maxLength={BRAND_DESCRIPTION_MAX}
                    onChange={(e) => {
                      setPlanConfirmed(false);
                      setServices(e.target.value.slice(0, BRAND_DESCRIPTION_MAX));
                    }}
                    placeholder="种植牙, 隐形矫正"
                  />
                </FieldCharLimitBox>
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
              <div>
                <p className="text-xs font-semibold text-[var(--color-title)]">输入材料（可选）</p>
                <p className="text-[11px] text-[var(--neutral-text-03)] mt-0.5">
                  可添加多条参考链接或补充说明，提交时将自动带入检测任务。
                </p>
              </div>

              <div
                className="rounded-lg border bg-white p-3 space-y-2"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-[var(--neutral-text-02)]">参考链接</p>
                  <span className="text-[10px] text-[var(--neutral-text-03)] shrink-0">
                    已添加 {referenceLinks.length}/{REFERENCE_LINK_MAX} 条
                  </span>
                </div>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-center">
                  <div className="relative min-w-0">
                    <LinkIcon className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-text-03)]" />
                    <input
                      className="geo-input w-full geo-input-with-icon !pl-11"
                      value={linkDraft}
                      onChange={(e) => setLinkDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addReferenceLink();
                        }
                      }}
                      placeholder="粘贴文章、竞品或发布内容链接"
                      disabled={referenceLinks.length >= REFERENCE_LINK_MAX}
                    />
                  </div>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-sm h-10 px-4 shrink-0"
                    onClick={addReferenceLink}
                    disabled={!linkDraft.trim() || referenceLinks.length >= REFERENCE_LINK_MAX}
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                {referenceLinks.length > 0 && (
                  <ul className="space-y-1.5">
                    {referenceLinks.map((url, index) => (
                      <li
                        key={`${url}-${index}`}
                        className="flex items-center gap-2 rounded-md bg-[var(--neutral-bg-03)] px-2.5 py-2 text-xs"
                      >
                        <LinkIcon className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)]" />
                        <span className="flex-1 truncate text-[var(--neutral-text-02)]" title={url}>
                          {url}
                        </span>
                        <button
                          type="button"
                          className="p-1 text-[var(--neutral-text-03)] hover:text-[var(--color-danger)] shrink-0"
                          onClick={() => removeReferenceLink(index)}
                          aria-label="移除链接"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className="rounded-lg border bg-white p-3 space-y-2"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <FieldLimitLabel label="补充说明" className="block mb-1" />
                <FieldCharLimitBox current={freeText.length} max={BRAND_DESCRIPTION_MAX} multiline>
                  <textarea
                    className={`geo-input w-full min-h-[80px] ${fieldCharLimitInputClass(true)}`}
                    value={freeText}
                    maxLength={BRAND_DESCRIPTION_MAX}
                    onChange={(e) => {
                      setPlanConfirmed(false);
                      setFreeText(e.target.value.slice(0, BRAND_DESCRIPTION_MAX));
                    }}
                    placeholder="品牌介绍、客户案例、页面文案或想检测的问题"
                  />
                </FieldCharLimitBox>
              </div>
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
          {analysisDepth === 'deep' && workspaceBrand && (
            <GeoWebsiteDeployChecklist
              compact
              brandName={workspaceBrand}
              websiteUrl={websiteUrl}
              preCrawl={null}
            />
          )}
          <div>
            <p className="font-medium text-[var(--neutral-text-02)] mb-2">分析模式</p>
            <div className="rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 p-3">
              <p className="font-semibold text-[var(--color-title)]">{activeDepthOption.label}</p>
              <p className="text-[10px] text-[var(--neutral-text-03)] mt-1 leading-relaxed">
                {activeDepthOption.hint}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-[var(--neutral-bg-03)] p-3">
            <span className="text-[var(--neutral-text-03)]">AI 分析数</span>
            <p className="font-semibold text-[var(--color-title)]">{aiPlan.questions} 条</p>
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
