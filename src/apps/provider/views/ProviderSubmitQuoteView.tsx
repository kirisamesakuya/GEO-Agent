import { useState } from 'react';
import { splitFromProviderNetCents } from '../../../../lib/platform-fee';
import { useToast } from '../../../context/ToastContext';

interface TaskSummary {
  id: string;
  title: string;
  brandName: string;
  platform: string;
  deliverable: string;
  acceptance: string;
  description?: string;
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
  const [estimatedDays, setEstimatedDays] = useState('3');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const netCents = Math.round(parseFloat(p0Yuan || '0') * 100);
  const split = Number.isFinite(netCents) && netCents > 0 ? splitFromProviderNetCents(netCents) : null;

  const submit = async () => {
    if (!approved) {
      onNeedOnboarding();
      return;
    }
    if (!split) {
      toast('请填写有效的期望到手金额', 'error');
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
        publishPlatform: task.platform,
        estimatedPublishAt: estimated.toISOString(),
        quoteExpiresAt: expires.toISOString(),
        includeLink: true,
        includeScreenshot: true,
        deliveryPromise: '链接 + 截图',
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
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-xs text-provider-muted hover:text-brand">
        ← 返回任务详情
      </button>
      <div className="provider-card rounded-2xl p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-provider-title">提交报价：{task.title}</h1>
        <p className="text-sm text-provider-secondary">
          {task.platform} · {task.brandName}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-provider-muted text-xs">期望到手金额 P0（元）</span>
            <input
              type="number"
              min={10}
              step={0.01}
              value={p0Yuan}
              onChange={(e) => setP0Yuan(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-provider rounded-lg"
            />
          </label>
          <label className="block text-sm">
            <span className="text-provider-muted text-xs">媒体名称</span>
            <input
              value={mediaName}
              onChange={(e) => setMediaName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-provider rounded-lg"
              placeholder="例：某行业垂类媒体"
            />
          </label>
          <label className="block text-sm">
            <span className="text-provider-muted text-xs">预计上线（天）</span>
            <input
              type="number"
              min={1}
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-provider rounded-lg"
            />
          </label>
        </div>

        {split && (
          <div className="bg-provider-subtle rounded-xl p-4 text-sm space-y-1">
            <p>
              平台技术服务费 F（30%）：¥{(split.platformServiceFeeCents / 100).toFixed(2)}
            </p>
            <p className="font-semibold text-brand">
              发布方成交支付价 G：¥{(split.publisherPayAmountCents / 100).toFixed(2)}
            </p>
            <p className="text-xs text-provider-muted mt-2">
              你填写的是本单验收完成后的预计到手金额。平台将按订单成交支付价的 30% 收取技术服务费。
            </p>
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="备注说明（可选）"
          className="w-full px-3 py-2 border border-provider rounded-lg text-sm"
        />

        <button
          type="button"
          className="provider-btn-primary w-full py-3"
          disabled={loading}
          onClick={() => void submit()}
        >
          {loading ? '提交中…' : '提交报价'}
        </button>
      </div>
    </div>
  );
}
