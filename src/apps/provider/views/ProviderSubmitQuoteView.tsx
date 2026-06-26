import { useState } from 'react';
import { ArrowLeft, Calculator, ShieldCheck } from 'lucide-react';
import { splitFromProviderNetCents } from '../../../../lib/platform-fee';
import { useToast } from '../../../context/ToastContext';
import ProviderPageHeader from '../components/workspace/ProviderPageHeader';
import ProviderBrandBriefCard from '../components/ProviderBrandBriefCard';
import type { ProviderBrandBriefView } from '../../../../lib/provider-brand-brief';

interface TaskSummary {
  id: string;
  title: string;
  brandName: string;
  platform: string;
  deliverable: string;
  acceptance: string;
  description?: string;
  suggestedMinCents?: number;
  suggestedMaxCents?: number;
  brandBrief?: ProviderBrandBriefView;
}

interface Props {
  task: TaskSummary;
  providerId: string;
  providerName: string;
  approved: boolean;
  onNeedOnboarding: () => void;
  onSubmitted: () => void;
  onBack: () => void;
}

export default function ProviderSubmitQuoteView({
  task,
  providerId,
  providerName,
  approved,
  onNeedOnboarding,
  onSubmitted,
  onBack,
}: Props) {
  const { toast } = useToast();
  const [p0Yuan, setP0Yuan] = useState('1000');
  const [mediaName, setMediaName] = useState('');
  const [mediaAccountLink, setMediaAccountLink] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('3');
  const [overRangeReason, setOverRangeReason] = useState('');
  const [includeLink, setIncludeLink] = useState(true);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [includeIndexingProof, setIncludeIndexingProof] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const netCents = Math.round(parseFloat(p0Yuan || '0') * 100);
  const split = Number.isFinite(netCents) && netCents > 0 ? splitFromProviderNetCents(netCents) : null;
  const overRange =
    split &&
    task.suggestedMaxCents != null &&
    netCents > task.suggestedMaxCents;

  const submit = async () => {
    if (!approved) {
      onNeedOnboarding();
      return;
    }
    if (!split || netCents < 1000) {
      toast('期望到手金额最低 ¥10', 'error');
      return;
    }
    if (overRange && !overRangeReason.trim()) {
      toast('报价超建议区间，请填写原因', 'error');
      return;
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const estimated = new Date();
    estimated.setDate(estimated.getDate() + Number(estimatedDays || 3));

    setLoading(true);
    const res = await fetch(`/api/provider/task-orders/${task.id}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        providerName,
        providerExpectedIncomeCents: netCents,
        mediaName: mediaName || undefined,
        mediaAccountLink: mediaAccountLink || undefined,
        publishPlatform: task.platform,
        estimatedPublishAt: estimated.toISOString(),
        quoteExpiresAt: expires.toISOString(),
        includeLink,
        includeScreenshot,
        includeIndexingProof,
        deliveryPromise: [
          includeLink && '发布链接',
          includeScreenshot && '截图证明',
          includeIndexingProof && '收录证明',
        ]
          .filter(Boolean)
          .join(' + ') || '标准交付',
        overRangeReason: overRangeReason.trim() || undefined,
        message: message || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('报价已提交', 'success');
    onSubmitted();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button type="button" onClick={onBack} className="text-xs text-provider-muted hover:text-workbench flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回任务详情
      </button>

      <ProviderPageHeader
        title="提交报价方案"
        subtitle={`${task.title} · ${task.brandName} · ${task.platform}`}
      />

      {task.brandBrief && <ProviderBrandBriefCard brief={task.brandBrief} />}

      <section className="provider-section-card space-y-3">
        <h2 className="text-sm font-bold text-provider-title">任务摘要</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-provider-muted">交付物</dt>
            <dd className="text-provider-body mt-0.5">{task.deliverable}</dd>
          </div>
          <div>
            <dt className="text-provider-muted">验收标准</dt>
            <dd className="text-provider-body mt-0.5">{task.acceptance}</dd>
          </div>
        </dl>
        {task.suggestedMinCents != null && task.suggestedMaxCents != null && (
          <p className="text-xs text-workbench bg-workbench-light rounded-lg px-3 py-2">
            建议报价区间：¥{(task.suggestedMinCents / 100).toLocaleString()} – ¥
            {(task.suggestedMaxCents / 100).toLocaleString()}（到手价参考，非客户预算）
          </p>
        )}
      </section>

      <section className="provider-section-card space-y-4">
        <h2 className="text-sm font-bold text-provider-title flex items-center gap-2">
          <Calculator className="w-4 h-4 text-workbench" /> 报价输入
        </h2>
        <label className="block text-sm">
          <span className="text-provider-secondary text-xs font-medium">期望到手金额 P0（元）</span>
          <input
            type="number"
            min={10}
            step={0.01}
            value={p0Yuan}
            onChange={(e) => setP0Yuan(e.target.value)}
            className="provider-input-field mt-1 text-base font-mono"
          />
        </label>
        <label className="block text-sm">
          <span className="text-provider-secondary text-xs font-medium">媒体 / 账号说明</span>
          <input
            value={mediaName}
            onChange={(e) => setMediaName(e.target.value)}
            className="provider-input-field mt-1"
            placeholder="例：某科技垂类媒体官方号"
          />
        </label>
        <label className="block text-sm">
          <span className="text-provider-secondary text-xs font-medium">账号链接 / 平台主页</span>
          <input
            value={mediaAccountLink}
            onChange={(e) => setMediaAccountLink(e.target.value)}
            className="provider-input-field mt-1"
            placeholder="例：https://www.xiaohongshu.com/user/profile/..."
          />
        </label>
        <label className="block text-sm">
          <span className="text-provider-secondary text-xs font-medium">预计上线（天）</span>
          <input
            type="number"
            min={1}
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            className="provider-input-field mt-1 w-32"
          />
        </label>
        {overRange && (
          <label className="block text-sm">
            <span className="text-amber-800 text-xs font-medium">超区间原因（必填）</span>
            <textarea
              value={overRangeReason}
              onChange={(e) => setOverRangeReason(e.target.value)}
              rows={2}
              className="provider-input-field mt-1 border-amber-200"
              placeholder="说明高于建议区间的理由，便于品牌方决策"
            />
          </label>
        )}
      </section>

      {split && (
        <section className="provider-section-card bg-workbench-light/40 border-workbench/20 space-y-2">
          <h2 className="text-sm font-bold text-provider-title">金额自动计算</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-provider-muted">到手 P0</p>
              <p className="text-lg font-bold font-mono text-provider-title">¥{(netCents / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-provider-muted">服务费 F (30%)</p>
              <p className="text-lg font-bold font-mono text-provider-secondary">
                ¥{(split.platformServiceFeeCents / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-provider-muted">成交价 G</p>
              <p className="text-lg font-bold font-mono text-workbench">
                ¥{(split.publisherPayAmountCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-provider-muted">
            你填写的是验收完成后的预计到手金额；发布方比价页仅展示成交支付价 G。
          </p>
        </section>
      )}

      <section className="provider-section-card space-y-3">
        <h2 className="text-sm font-bold text-provider-title flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-workbench" /> 交付承诺
        </h2>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeLink} onChange={(e) => setIncludeLink(e.target.checked)} />
            含发布链接
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeScreenshot} onChange={(e) => setIncludeScreenshot(e.target.checked)} />
            含截图证明
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeIndexingProof}
              onChange={(e) => setIncludeIndexingProof(e.target.checked)}
            />
            含收录证明
          </label>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="补充说明（可选）"
          className="provider-input-field text-sm"
        />
      </section>

      <button
        type="button"
        className="provider-btn-workbench w-full py-3 text-sm"
        disabled={loading}
        onClick={() => void submit()}
      >
        {loading ? '提交中…' : '提交报价方案'}
      </button>
    </div>
  );
}
