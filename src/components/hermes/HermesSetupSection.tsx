import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  KeyRound,
  List,
  Settings,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  createHermesBindToken,
  type HermesHealth,
  type HermesSkill,
} from '../../lib/hermes-client';
import {
  HERMES_DOWNLOAD_URL,
  hermesBindingStatusLabel,
  hermesConnectionStatusLabel,
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
  const [bindToken, setBindToken] = useState<string | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingApprovalPolicy, setSavingApprovalPolicy] = useState(false);

  const showApiServerOff =
    health?.desktopRunning && !health.apiGatewayOk && !health.bound;
  const showBindingHint = health && !health.apiGatewayOk && !health.bound && health.desktopRunning;

  const handleBindToken = async () => {
    const data = await createHermesBindToken();
    setBindToken(data.token);
    toast(`绑定码已生成：${data.token}（15 分钟有效）`, 'info');
  };

  return (
    <div id={id} className="geo-card p-5 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-title)]">安装与绑定</h3>

      {showApiServerOff && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 space-y-2 text-xs text-amber-950">
          <p className="font-semibold">API Server 未启用</p>
          <p className="leading-relaxed opacity-90">
            请在 Hermes 设置中开启 Platforms → API Server，保存后重启 Gateway。
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={HERMES_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="geo-btn-primary geo-btn-xs inline-flex items-center gap-1"
            >
              打开 Hermes
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void onRefresh()}>
              我已开启，重新检测
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '连接状态', value: hermesConnectionStatusLabel(health) },
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

      {!health?.ok && !showApiServerOff && health?.detail && (
        <p className="text-xs text-[var(--neutral-text-03)]">{health.detail}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={health?.downloadUrl ?? HERMES_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          className="geo-btn-primary geo-btn-xs inline-flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          打开 Hermes
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
        <a
          href={HERMES_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
          title="Settings → Platforms → API Server"
        >
          <Settings className="w-3 h-3" />
          打开设置说明
        </a>
        {showBindingHint && (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
            onClick={() => void handleBindToken()}
          >
            <KeyRound className="w-3 h-3" />
            生成绑定码
          </button>
        )}
        <button
          type="button"
          className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
          onClick={() => setShowSkills((v) => !v)}
        >
          <List className="w-3 h-3" />
          技能清单
        </button>
      </div>

      {bindToken && (
        <div className="text-xs rounded-lg px-3 py-2 bg-[var(--color-accent-light)]">
          绑定码：<strong className="font-mono">{bindToken}</strong> — 请在 Hermes 客户端输入此绑定码完成设备绑定
        </div>
      )}

      {showSkills && skills && (
        <div className="border rounded-lg overflow-hidden text-xs" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          {skills.note && (
            <p className="px-3 py-2 text-[var(--neutral-text-03)] border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {skills.note}
            </p>
          )}
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--neutral-bg-03)] text-left">
                <th className="px-3 py-2 font-medium">技能</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">风险</th>
              </tr>
            </thead>
            <tbody>
              {skills.skills.map((s) => {
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
                      {HERMES_RISK_LABELS[s.riskLevel] ?? s.riskLevel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
