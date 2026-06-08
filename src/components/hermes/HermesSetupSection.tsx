import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  KeyRound,
  List,
  Loader2,
  LogIn,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  confirmHermesLoginSync,
  createHermesBindToken,
  fetchHermesSyncStatus,
  type HermesHealth,
  type HermesSkill,
  type HermesSyncStatus,
} from '../../lib/hermes-client';
import {
  HERMES_CLIENT_LOCAL_URL,
  HERMES_DOWNLOAD_URL,
  hermesBindingStatusLabel,
  hermesConnectionStatusLabel,
  hermesConnectionTone,
  hermesTokenCapacityLabel,
} from '../../lib/hermes-status-utils';
import {
  hermesSkillLabel,
  hermesSkillStatusClass,
  hermesSkillStatusLabel,
  hermesSkillStatusTone,
  HERMES_RISK_LABELS,
} from '../../lib/hermes-skill-labels';
import {
  updateGeoApprovalPolicy,
  type GeoApprovalPolicy,
} from '../../lib/hermes-approval';

interface SkillsPayload {
  version: string;
  skills: HermesSkill[];
}

interface Props {
  health: HermesHealth | null;
  skills: SkillsPayload | null;
  approvalPolicy: GeoApprovalPolicy | null;
  onApprovalPolicyChange: (policy: GeoApprovalPolicy) => void;
  onRefresh: () => void;
  id?: string;
}

export default function HermesSetupSection({
  health,
  skills,
  approvalPolicy,
  onApprovalPolicyChange,
  onRefresh,
  id = 'hermes-setup',
}: Props) {
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<HermesSyncStatus | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [bindToken, setBindToken] = useState<string | null>(null);
  const [bindSteps, setBindSteps] = useState<string[]>([]);
  const [bindLoading, setBindLoading] = useState(false);
  const [showBindingPanel, setShowBindingPanel] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingApprovalPolicy, setSavingApprovalPolicy] = useState(false);

  const isConnected = Boolean(health?.apiGatewayOk || health?.bound || syncStatus?.phase === 'ready');
  const needsConnect = !isConnected;
  const connectionTone = hermesConnectionTone(health);
  const connectionStatusClass =
    connectionTone === 'danger'
      ? 'geo-stat-value--danger'
      : connectionTone === 'warn'
        ? 'geo-stat-value--warning'
        : connectionTone === 'ready'
          ? 'geo-stat-value--success'
          : '';

  const loadSyncStatus = async () => {
    try {
      const status = await fetchHermesSyncStatus();
      setSyncStatus(status);
    } catch {
      setSyncStatus(null);
    }
  };

  useEffect(() => {
    void loadSyncStatus();
  }, [health?.bound, health?.apiGatewayOk]);

  useEffect(() => {
    if (!showBindingPanel) return;
    const el = document.getElementById('hermes-bind-panel');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [showBindingPanel, bindToken]);

  const handleGenerateBindToken = async () => {
    setBindLoading(true);
    try {
      const data = await createHermesBindToken();
      setBindToken(data.token);
      setBindSteps(data.steps);
      setShowBindingPanel(true);
      toast(`绑定码已生成：${data.token}（15 分钟有效）`, 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : '生成绑定码失败', 'error');
    } finally {
      setBindLoading(false);
    }
  };

  const handleStartBinding = async () => {
    setShowBindingPanel(true);
    if (!bindToken) {
      await handleGenerateBindToken();
    }
  };

  const handleCopyBindToken = async () => {
    if (!bindToken) return;
    try {
      await navigator.clipboard.writeText(bindToken);
      toast('绑定码已复制', 'success');
    } catch {
      toast('复制失败，请手动选择复制', 'error');
    }
  };

  const handleMockSync = async () => {
    setSyncLoading(true);
    try {
      const result = await confirmHermesLoginSync();
      setSyncStatus(result);
      toast(result.message, 'success');
      await loadSyncStatus();
      await onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : '演示同步失败，请使用绑定码完成绑定', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const skillRows = Array.isArray(skills?.skills) ? skills.skills : [];
  const syncMockEnabled = syncStatus?.mock ?? true;
  const bindBusy = bindLoading || syncLoading;

  return (
    <div id={id} className="geo-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-title)]">安装与连接</h3>
          <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">
            在汇智爱马仕助手中登录后，完成设备绑定，GEO 将同步本机执行环境与技能配置。
          </p>
        </div>
        <div className="min-w-[12rem] rounded-lg border px-3 py-2" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[var(--neutral-text-03)]">连接状态</span>
            <Cpu className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
          </div>
          <p className={`geo-stat-value mt-0.5 ${connectionStatusClass}`}>
            {syncStatus?.phase === 'ready'
              ? '已同步'
              : syncStatus?.phase === 'syncing'
                ? '同步中'
                : hermesConnectionStatusLabel(health)}
          </p>
          <p className="text-xs text-[var(--neutral-text-03)] truncate">
            {syncStatus?.deviceName ?? health?.boundDevice ?? health?.url ?? '等待绑定'}
          </p>
        </div>
      </div>

      {needsConnect && (
        <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <p className="text-sm text-[var(--neutral-text-02)] leading-relaxed">
            尚未安装请先<strong>下载客户端</strong>；已安装请<strong>打开 Hermes 并登录</strong>，再点击「开始同步绑定」生成绑定码，在
            Hermes 客户端输入后即可完成设备绑定。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1.5"
              disabled={bindBusy}
              onClick={() => void handleStartBinding()}
            >
              {bindLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  开始同步绑定
                </>
              )}
            </button>
            <a
              href={HERMES_CLIENT_LOCAL_URL}
              target="_blank"
              rel="noreferrer"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
              title="打开本机已安装的汇智爱马仕助手"
            >
              <LogIn className="w-3.5 h-3.5" />
              打开 Hermes 登录
            </a>
            <a
              href={health?.downloadUrl ?? HERMES_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              下载 Windows 版
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm"
              disabled={bindBusy}
              onClick={() => void onRefresh()}
            >
              重新检测
            </button>
          </div>

          {showBindingPanel && (
            <div
              id="hermes-bind-panel"
              className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent-light)]/40 p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-[var(--color-title)]">设备绑定</p>
              {bindToken ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--neutral-text-03)]">绑定码</span>
                    <code className="text-base font-mono font-bold text-[var(--color-accent)] tracking-wider">
                      {bindToken}
                    </code>
                    <button
                      type="button"
                      className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
                      onClick={() => void handleCopyBindToken()}
                    >
                      <Copy className="w-3 h-3" />
                      复制
                    </button>
                  </div>
                  <ol className="text-xs text-[var(--neutral-text-02)] space-y-1 list-decimal list-inside">
                    {(bindSteps.length > 0
                      ? bindSteps
                      : ['打开 Hermes 客户端', '进入「绑定 GEO 投放助手」', '输入绑定码并确认']
                    ).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="text-xs text-[var(--neutral-text-03)]">正在生成绑定码…</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="geo-btn-primary geo-btn-xs"
                  disabled={bindBusy}
                  onClick={() => void onRefresh()}
                >
                  已在 Hermes 输入绑定码，重新检测
                </button>
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs"
                  disabled={bindLoading}
                  onClick={() => void handleGenerateBindToken()}
                >
                  重新生成绑定码
                </button>
              </div>
              {syncMockEnabled && (
                <p className="text-[10px] text-[var(--neutral-text-03)] border-t border-dashed border-[var(--neutral-divider-02)] pt-2">
                  演示环境：
                  <button
                    type="button"
                    className="text-[var(--color-accent)] underline ml-1"
                    disabled={syncLoading}
                    onClick={() => void handleMockSync()}
                  >
                    跳过绑定，模拟同步就绪
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isConnected && syncStatus?.mock && (
        <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          本机环境已通过 Mock 同步就绪；正式环境请在 Hermes 客户端完成绑定。
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: '设备绑定', value: hermesBindingStatusLabel(health) },
          { label: '词元/模型', value: hermesTokenCapacityLabel(health) },
          { label: 'GEO 技能', value: skills?.version ?? '—' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <p className="text-[var(--neutral-text-03)]">{item.label}</p>
            <p className="font-medium text-[var(--color-title)] truncate mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {!health?.ok && !isConnected && health?.detail && (
        <p className="text-xs text-[var(--neutral-text-03)]">{health.detail}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
          onClick={() => setShowSkills((v) => !v)}
        >
          <List className="w-3 h-3" />
          技能清单
        </button>
      </div>

      {showSkills && (
        <div className="border rounded-lg overflow-hidden text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          {skills?.note && (
            <p className="px-3 py-2 text-[var(--neutral-text-03)] border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {skills.note}
            </p>
          )}
          {skillRows.length === 0 ? (
            <p className="px-3 py-4 text-[var(--neutral-text-03)] text-center">
              暂无技能数据。请先完成 Hermes 连接，或点击页面顶部「刷新状态」后重试。
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--neutral-bg-03)] text-left">
                  <th className="px-3 py-2 font-medium">技能</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">风险</th>
                </tr>
              </thead>
              <tbody>
                {skillRows.map((s) => {
                  const tone = hermesSkillStatusTone(s.status);
                  return (
                    <tr key={s.name} className="border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-[var(--color-title)]">{hermesSkillLabel(s.name)}</span>
                        <span className="block text-[10px] text-[var(--neutral-text-03)] font-mono mt-0.5">{s.name}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${hermesSkillStatusClass(tone)}`}
                        >
                          {hermesSkillStatusLabel(s.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--neutral-text-02)]">
                        {HERMES_RISK_LABELS[s.riskLevel] ?? s.riskLevel ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {health?.apiGatewayOk && (
        <div className="border-t pt-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <button
            type="button"
            className="text-xs text-[var(--neutral-text-03)] flex items-center gap-1"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            高级设置（开发连调）
          </button>
          {showAdvanced && (
            <div
              className="mt-2 flex items-center justify-between gap-2 flex-wrap rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: 'var(--neutral-divider-02)' }}
            >
              <span className="text-[var(--neutral-text-02)]">GEO 推送跳过 Hermes 工具审批</span>
              <button
                type="button"
                className={approvalPolicy?.skipApprovalForGeo ? 'geo-btn-secondary geo-btn-xs' : 'geo-btn-primary geo-btn-xs'}
                disabled={savingApprovalPolicy}
                onClick={() => {
                  setSavingApprovalPolicy(true);
                  void updateGeoApprovalPolicy(!approvalPolicy?.skipApprovalForGeo)
                    .then((saved) => {
                      onApprovalPolicyChange(saved);
                      toast(
                        saved.skipApprovalForGeo ? '已开启自动跳过审批' : '已关闭自动跳过审批',
                        'success'
                      );
                    })
                    .catch((e) => toast(e instanceof Error ? e.message : '保存失败', 'error'))
                    .finally(() => setSavingApprovalPolicy(false));
                }}
              >
                {savingApprovalPolicy
                  ? '…'
                  : approvalPolicy?.skipApprovalForGeo
                    ? '已开启 · 点击关闭'
                    : '未开启 · 点击开启'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
