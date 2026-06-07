import { useState, useEffect } from 'react';
import AgentInputCard from './common/AgentInputCard';
import TaskStatusPill from './common/TaskStatusPill';
import { useToast } from '../context/ToastContext';
import { LOBBY_PLATFORM_LABELS } from '../../lib/media-platforms';

interface Props {
  brandName: string;
}

interface PublishedTask {
  id: string;
  title: string;
  platform: string;
  budget: number;
  status: string;
  createdAt: string;
}

export default function FindProviderView({ brandName }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('小红书');
  const [budget, setBudget] = useState(3000);
  const [type, setType] = useState('达人');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState<PublishedTask[]>([]);

  const loadPublished = () => {
    fetch(`/api/orders?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setPublished((d.orders ?? []).filter((o: PublishedTask) => o.status === 'published')));
  };

  useEffect(() => { loadPublished(); }, [brandName]);

  const submit = async () => {
    if (!title.trim()) {
      toast('请填写任务标题', 'error');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName,
        title,
        platform,
        budget,
        type,
        description,
        deliverable: description || '按任务描述交付',
        acceptance: '截图证明 / 链接回传',
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('任务已发布到资源平台任务大厅', 'success');
    setTitle('');
    setDescription('');
    loadPublished();
  };

  return (
    <div className="geo-page-content max-w-3xl space-y-4">
      <AgentInputCard
        title="找人投放"
        description="发布自定义任务到资源平台任务大厅"
        footer={
          <button type="button" className="geo-btn-primary text-sm" onClick={() => void submit()} disabled={loading}>
            {loading ? '发布中…' : '发布任务'}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1">任务标题</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1">平台</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {LOBBY_PLATFORM_LABELS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1">接单方类型</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                <option>达人</option><option>内容写手</option><option>MCN</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1">预算 (¥)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
          </div>
          <div>
            <label className="text-xs block mb-1">任务描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
          </div>
        </div>
      </AgentInputCard>

      {published.length > 0 && (
        <div className="geo-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            待接单任务
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            {published.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-text-03)' }}>
                    {t.platform} · ¥{t.budget}
                  </p>
                </div>
                <TaskStatusPill status="queued" size="sm" showDot={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
