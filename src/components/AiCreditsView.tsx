import { useEffect, useState } from 'react';
import AgentInputCard from './common/AgentInputCard';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

import { DUAL_ACCOUNT_HINT, TOKEN_ACCOUNT_HINT } from '../../lib/platform-legal-copy';

const AGENT_CLOUD_RECHARGE_URL = 'https://www.agentsyun.com/hub/keys';

interface Props {
  brandName: string;
}

const CREDIT_COSTS = [
  { action: '文章生成', cost: 10 },
  { action: 'GEO 分析', cost: 20 },
  { action: '投放计划', cost: 15 },
  { action: '网页预览', cost: 15 },
  { action: '品牌提取', cost: 5 },
];

export default function AiCreditsView({ brandName }: Props) {
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    if (brandName === '__all__') return;
    fetch(`/api/ai-credits/${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.balance ?? 0);
        setLastSync(d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString('zh-CN') : null);
      });
  };

  useEffect(() => {
    load();
  }, [brandName]);

  const syncFromCloud = async () => {
    setSyncing(true);
    const res = await fetch(`/api/ai-credits/${encodeURIComponent(brandName)}/sync`, { method: 'POST' });
    const data = await res.json();
    setSyncing(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    setBalance(data.balance ?? 0);
    setLastSync(data.lastSyncAt ? new Date(data.lastSyncAt).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN'));
    toast('算力余额已从 Agent 云同步', 'success');
  };

  if (brandName === '__all__') {
    return (
      <div className="geo-page-content max-w-2xl">
        <p className="text-sm" style={{ color: 'var(--neutral-text-03)' }}>请选择具体品牌查看 AI 算力余额。</p>
      </div>
    );
  }

  return (
    <div className="geo-page-content max-w-2xl space-y-4">
      <div className="geo-card p-4 text-xs" style={{ color: 'var(--neutral-text-02)' }}>
        {DUAL_ACCOUNT_HINT}
      </div>

      <AgentInputCard title="AI 算力（Agent 云）" description={TOKEN_ACCOUNT_HINT}>
        <div className="space-y-4">
          <div className="geo-card p-6 text-center">
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>当前品牌可用算力</p>
            <p className="text-4xl font-bold mt-2" style={{ color: 'var(--color-accent)' }}>{balance}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
              算力点 · {lastSync ? `最近同步 ${lastSync}` : '尚未同步'}
            </p>
          </div>
          <button
            type="button"
            className="geo-btn-secondary text-sm w-full inline-flex items-center justify-center gap-2"
            disabled={syncing}
            onClick={() => void syncFromCloud()}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中…' : '从 Agent 云同步余额'}
          </button>
          <a
            href={AGENT_CLOUD_RECHARGE_URL}
            target="_blank"
            rel="noreferrer"
            className="geo-btn-primary text-sm inline-flex items-center gap-2 w-full justify-center"
          >
            前往 Agent 云充值算力
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </AgentInputCard>

      <div className="geo-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          算力消耗参考（按品牌记账）
        </div>
        <table className="w-full text-sm geo-table">
          <thead><tr><th>操作</th><th>消耗</th></tr></thead>
          <tbody>
            {CREDIT_COSTS.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                <td>{row.cost} 点</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
