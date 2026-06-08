import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Cpu, Upload, Sparkles } from 'lucide-react';
import type { AgentTaskStatus, BrandClueInputType } from '../../types';
import type { ViewType } from '../../types';
import {
  CLUE_TYPE_CHIPS,
  ONBOARDING_GOALS,
  buildBrandCluePayload,
  type OnboardingGoal,
} from '../../lib/brand-clue';
import { fetchOnboardingStatus, startOnboarding, uploadBrandFile } from '../../lib/onboarding-client';
import AgentTaskBackgroundCard, { type TaskQueueHint } from '../common/AgentTaskBackgroundCard';

type Step = 'clue' | 'goal' | 'submitted';

interface Props {
  /** 弹窗标题；默认「开始你的第一个 GEO 项目」 */
  headline?: string;
  variant?: 'page' | 'modal';
  onNavigate?: (view: ViewType, hint?: string) => void;
  onComplete: (
    result: {
    brandName: string;
    extractTaskId: string;
    goal: OnboardingGoal;
    brand?: { website?: string; description?: string };
    clue?: {
      brandUrl?: string;
      website?: string;
      socialLink?: string;
      description?: string;
    };
  },
    options?: { preferBrandConfirm?: boolean }
  ) => void;
  onCancel?: () => void;
}

export default function BrandClueStartFlow({
  headline,
  variant = 'page',
  onNavigate,
  onComplete,
  onCancel,
}: Props) {
  const [step, setStep] = useState<Step>('clue');
  const [activeField, setActiveField] = useState<BrandClueInputType>('website_url');
  const [brandNameInput, setBrandNameInput] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<Array<{ id: string; name: string; url: string; mimeType?: string }>>([]);
  const [goal, setGoal] = useState<OnboardingGoal>('geo_quick_start');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(null);
  const [submittedTaskTitle, setSubmittedTaskTitle] = useState('');
  const [submittedTaskStatus, setSubmittedTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);
  const [pendingComplete, setPendingComplete] = useState<Parameters<Props['onComplete']>[0] | null>(null);
  const [hermesReady, setHermesReady] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'submitted' || !pendingComplete?.brandName) return;
    let cancelled = false;
    void fetchOnboardingStatus(pendingComplete.brandName)
      .then((status) => {
        if (!cancelled) setHermesReady(status.hermesReady);
      })
      .catch(() => {
        if (!cancelled) setHermesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, pendingComplete?.brandName]);

  const resolvedBrandName = brandNameInput.trim();
  const hasWebsite = Boolean(websiteUrl.trim());
  const hasSocial = Boolean(socialLink.trim());
  const hasDescription = Boolean(description.trim());
  const hasFiles = files.length > 0;
  const canProceed =
    Boolean(resolvedBrandName) || hasWebsite || hasSocial || hasDescription || hasFiles;

  const handleFileUpload = async (list: FileList | null) => {
    if (!list?.length) return;
    setLoading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of Array.from(list)) {
        const result = await uploadBrandFile(file);
        uploaded.push({
          id: crypto.randomUUID(),
          name: result.name,
          url: result.url,
          mimeType: result.mimeType,
        });
      }
      setFiles((prev) => [...prev, ...uploaded]);
      setActiveField('file');
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!canProceed) return;
    setLoading(true);
    setError('');
    try {
      const payload = buildBrandCluePayload({
        brandName: resolvedBrandName || undefined,
        brandUrl: websiteUrl.trim() || undefined,
        socialLink: socialLink.trim() || undefined,
        description: description.trim() || undefined,
        files,
      });
      const result = await startOnboarding({ ...payload, goal });
      const website =
        result.clue?.brandUrl?.trim() ||
        result.clue?.website?.trim() ||
        result.brand.website?.trim() ||
        websiteUrl.trim();
      const completePayload = {
        brandName: result.brand.name,
        extractTaskId: result.extractTask.id,
        goal: result.goal ?? goal,
        brand: result.brand,
        clue: {
          brandUrl: website || undefined,
          website: website || undefined,
          socialLink:
            result.clue?.socialLink?.trim() || socialLink.trim() || undefined,
          description:
            result.clue?.description?.trim() || description.trim() || undefined,
        },
      };
      setSubmittedTaskId(result.extractTask.id);
      setSubmittedTaskTitle(`${result.brand.name} · 品牌资料整理`);
      setSubmittedTaskStatus((result.extractTask.status as AgentTaskStatus | undefined) ?? 'pending');
      setQueueHint(result.queueHint ?? null);
      setPendingComplete(completePayload);
      setHermesReady(null);
      setStep('submitted');
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败');
    } finally {
      setLoading(false);
    }
  };

  const isModal = variant === 'modal';
  /** 快速发起项目固定为新建品牌 GEO 分析，不再展示起步目标二次选择 */
  const skipGoalStep = isModal;

  const fieldPanel: Record<BrandClueInputType, ReactNode> = {
    brand_name: (
      <label className="block text-xs text-[var(--neutral-text-03)]">
        品牌名称
        <input
          className="geo-input w-full mt-1"
          placeholder="如：汇智智能"
          value={brandNameInput}
          onChange={(e) => setBrandNameInput(e.target.value)}
        />
      </label>
    ),
    website_url: (
      <label className="block text-xs text-[var(--neutral-text-03)]">
        官网 URL
        <input
          className="geo-input w-full mt-1"
          placeholder="https://www.example.com"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </label>
    ),
    file: (
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
          multiple
          className="hidden"
          onChange={(e) => void handleFileUpload(e.target.files)}
        />
        <button
          type="button"
          className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          <Upload className="w-3.5 h-3.5" />
          上传海报 / PPT / PDF / 产品图
        </button>
        {files.length > 0 && (
          <ul className="mt-2 text-xs text-[var(--neutral-text-02)] space-y-1">
            {files.map((f) => (
              <li key={f.id}>· {f.name}</li>
            ))}
          </ul>
        )}
      </div>
    ),
    social_link: (
      <label className="block text-xs text-[var(--neutral-text-03)]">
        小红书 / 抖音 / 店铺链接
        <input
          className="geo-input w-full mt-1"
          placeholder="https://www.xiaohongshu.com/..."
          value={socialLink}
          onChange={(e) => setSocialLink(e.target.value)}
        />
      </label>
    ),
    description: (
      <label className="block text-xs text-[var(--neutral-text-03)]">
        业务描述
        <textarea
          className="geo-input w-full mt-1 min-h-[88px] resize-y"
          placeholder="简述主营业务、服务区域、目标客户等"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
    ),
  };

  return (
    <div className={isModal ? '' : 'geo-card p-6 md:p-8'}>
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--neutral-text-01)' }}>
              {headline ?? '开始你的第一个 GEO 项目'}
            </h3>
          </div>
        </div>
      </div>

      {step === 'clue' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CLUE_TYPE_CHIPS.map((chip) => (
              <button
                key={chip.type}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  activeField === chip.type
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--neutral-text-03)]'
                }`}
                onClick={() => setActiveField(chip.type)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--color-border)] p-3 space-y-3">
            {fieldPanel[activeField]}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <button type="button" className="geo-btn-secondary" onClick={onCancel}>
                取消
              </button>
            )}
            <button
              type="button"
              className="geo-btn-primary"
              disabled={!canProceed || loading}
              onClick={() => (skipGoalStep ? void handleStart() : setStep('goal'))}
            >
              {skipGoalStep ? (loading ? '创建中…' : '开始整理品牌资料') : '下一步'}
            </button>
          </div>
        </div>
      ) : !skipGoalStep && step === 'goal' ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--neutral-text-02)]">选择起步目标（默认首次体检）：</p>
          <div className="space-y-2">
            {ONBOARDING_GOALS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full text-left border rounded-xl p-3 transition-colors ${
                  goal === item.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/40'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
                onClick={() => setGoal(item.id)}
              >
                <span className="font-semibold text-sm block">{item.title}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{item.desc}</span>
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" className="geo-btn-secondary" onClick={() => setStep('clue')}>
              返回
            </button>
            <button
              type="button"
              className="geo-btn-primary"
              disabled={loading}
              onClick={() => void handleStart()}
            >
              {loading ? '创建中…' : '开始整理品牌资料'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hermesReady === false && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 space-y-2 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">本机 Hermes 尚未绑定</p>
                  <p className="leading-relaxed opacity-90">
                    GEO 检测与发布任务需在本机 Hermes 环境执行。请先前往「本机 Hermes」完成安装、登录与设备绑定，绑定后已创建的任务会自动继续。
                  </p>
                </div>
              </div>
            </div>
          )}
          {submittedTaskId && (
            <AgentTaskBackgroundCard
              taskId={submittedTaskId}
              taskTitle={submittedTaskTitle}
              initialStatus={submittedTaskStatus ?? 'pending'}
              queueHint={queueHint}
              hermesSetupRequired={hermesReady === false}
              onNavigate={onNavigate}
            />
          )}
          <div className="flex gap-2 justify-end flex-wrap">
            {onNavigate && (
              <button
                type="button"
                className="geo-btn-secondary"
                onClick={() => onNavigate('notifications')}
              >
                查看通知
              </button>
            )}
            {hermesReady === false && onNavigate ? (
              <>
                <button
                  type="button"
                  className="geo-btn-secondary"
                  disabled={!pendingComplete}
                  onClick={() => {
                    if (pendingComplete) onComplete(pendingComplete, { preferBrandConfirm: true });
                  }}
                >
                  稍后绑定，先确认品牌
                </button>
                <button
                  type="button"
                  className="geo-btn-primary inline-flex items-center gap-1.5"
                  disabled={!pendingComplete}
                  onClick={() => {
                    if (pendingComplete) onComplete(pendingComplete);
                  }}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  前往绑定 Hermes
                </button>
              </>
            ) : (
              <button
                type="button"
                className="geo-btn-primary"
                disabled={!pendingComplete || hermesReady === null}
                onClick={() => {
                  if (pendingComplete) onComplete(pendingComplete);
                }}
              >
                {hermesReady === null ? '检测环境中…' : '继续确认品牌资料'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
