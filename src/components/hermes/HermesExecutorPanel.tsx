import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, KeyRound, List, Download } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  confirmHermesBinding,
  createHermesBindToken,
  fetchHermesHealth,
  fetchHermesSkills,
  type HermesHealth,
} from '../../lib/hermes-client';

export default function HermesExecutorPanel() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [skills, setSkills] = useState<{ version: string; skills: Array<{ name: string; status: string; riskLevel: string }> } | null>(null);
  const [bindToken, setBindToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([fetchHermesHealth(), fetchHermesSkills()]);
      setHealth(h);
      setSkills(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleBindToken = async () => {
    const data = await createHermesBindToken();
    setBindToken(data.token);
    toast(`绑定码已生成：${data.token}（15 分钟有效）`, 'info');
  };

  const handleMockBind = async () => {
    await confirmHermesBinding('Windows-PC · 演示');
    toast('已模拟绑定本机执行器（连调前演示）', 'success');
    void refresh();
  };

  return (
    <div className="geo-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-title)]">Hermes 本机执行器</h3>
          <p className="text-[11px] mt-0.5 text-[var(--neutral-text-03)]">
            下载 Hermes 并绑定账号后，可执行 GEO 技能包与自动发布（本阶段为 mock / 契约预留）
          </p>
        </div>
        <button type="button" className="geo-btn-secondary geo-btn-xs flex items-center gap-1" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          检测
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {[
          { label: '下载状态', value: health?.windowsAvailable ? 'Windows 可用' : '—' },
          { label: '绑定状态', value: health?.bound ? `已绑定 · ${health.boundDevice ?? ''}` : '未绑定' },
          { label: '心跳', value: health?.ok ? '在线' : '离线' },
          { label: 'GEO 技能', value: skills?.version ?? '—' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <p className="text-[var(--neutral-text-03)]">{item.label}</p>
            <p className="font-medium text-[var(--color-title)] truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {!health?.ok && (
        <p className="text-[11px] text-[var(--neutral-text-03)]">
          {health?.detail ?? '请打开 Hermes 客户端后重试检测'}
        </p>
      )}

      <p className="text-[10px] text-[var(--neutral-text-03)]">macOS / Linux 即将推出，本阶段仅承诺 Windows 下载可用。</p>

      <div className="flex flex-wrap gap-2">
        <a
          href={health?.downloadUrl ?? 'https://hermes.agentsyun.com/'}
          target="_blank"
          rel="noreferrer"
          className="geo-btn-primary geo-btn-xs inline-flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          下载 Hermes
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
        <button type="button" className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1" onClick={() => void handleBindToken()}>
          <KeyRound className="w-3 h-3" />
          生成绑定码
        </button>
        {!health?.bound && (
          <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void handleMockBind()}>
            模拟绑定（演示）
          </button>
        )}
        <button type="button" className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1" onClick={() => setShowSkills((v) => !v)}>
          <List className="w-3 h-3" />
          技能清单
        </button>
      </div>

      {bindToken && (
        <div className="text-xs rounded-lg px-3 py-2 bg-[var(--color-accent-light)]">
          绑定码：<strong className="font-mono">{bindToken}</strong> — 在 Hermes 客户端输入完成绑定
        </div>
      )}

      {showSkills && skills && (
        <div className="border rounded-lg overflow-hidden text-[11px]" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--neutral-bg-03)] text-left">
                <th className="px-2 py-1">技能</th>
                <th className="px-2 py-1">状态</th>
                <th className="px-2 py-1">风险</th>
              </tr>
            </thead>
            <tbody>
              {skills.skills.map((s) => (
                <tr key={s.name} className="border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                  <td className="px-2 py-1 font-mono">{s.name}</td>
                  <td className="px-2 py-1">{s.status}</td>
                  <td className="px-2 py-1">{s.riskLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
