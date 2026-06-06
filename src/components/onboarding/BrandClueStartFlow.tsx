import { useRef, useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import type { BrandClueInputType } from '../../types';
import {
  CLUE_TYPE_CHIPS,
  detectBrandClueInputType,
  ONBOARDING_GOALS,
  type OnboardingGoal,
} from '../../lib/brand-clue';
import { startOnboarding, uploadBrandFile } from '../../lib/onboarding-client';

type Step = 'clue' | 'goal';

interface Props {
  brandName?: string;
  displayBrandName?: string;
  variant?: 'page' | 'modal';
  onComplete: (result: {
    brandName: string;
    extractTaskId: string;
    goal: OnboardingGoal;
  }) => void;
  onCancel?: () => void;
}

export default function BrandClueStartFlow({
  brandName,
  displayBrandName,
  variant = 'page',
  onComplete,
  onCancel,
}: Props) {
  const [step, setStep] = useState<Step>('clue');
  const [text, setText] = useState('');
  const [inputType, setInputType] = useState<BrandClueInputType | null>(null);
  const [files, setFiles] = useState<Array<{ id: string; name: string; url: string; mimeType?: string }>>([]);
  const [goal, setGoal] = useState<OnboardingGoal>('geo_quick_start');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim()) setInputType(detectBrandClueInputType(value));
  };

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
      setInputType('file');
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = Boolean(brandName || text.trim() || files.length);

  const handleStart = async () => {
    if (!canProceed) return;
    setLoading(true);
    setError('');
    try {
      const result = await startOnboarding({
        brandName: brandName || undefined,
        text: text.trim() || undefined,
        inputType: inputType ?? undefined,
        files,
        goal,
      });
      onComplete({
        brandName: result.brand.name,
        extractTaskId: result.extractTask.id,
        goal: result.goal ?? goal,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败');
    } finally {
      setLoading(false);
    }
  };

  const isModal = variant === 'modal';

  return (
    <div className={isModal ? '' : 'geo-card p-6 md:p-8'}>
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--neutral-text-01)' }}>
              {brandName ? `为「${displayBrandName ?? brandName}」启动项目` : '开始你的第一个 GEO 项目'}
            </h3>
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
              没有官网也可以。品牌名、海报、PPT 或社媒链接均可开始。
            </p>
          </div>
        </div>
      </div>

      {step === 'clue' ? (
        <div className="space-y-4">
          <textarea
            className="geo-input w-full min-h-[88px] resize-y"
            placeholder="输入品牌名、官网、店铺链接或业务描述"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
          />

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

          <div className="flex flex-wrap gap-2">
            {CLUE_TYPE_CHIPS.map((chip) => (
              <button
                key={chip.type}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  inputType === chip.type
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--neutral-text-03)]'
                }`}
                onClick={() => setInputType(chip.type)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-[var(--neutral-text-03)]">
            Agent 执行发生在你的本机 Hermes，模型能力由公司词元体系支持。
          </p>

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
              onClick={() => setStep('goal')}
            >
              下一步
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
