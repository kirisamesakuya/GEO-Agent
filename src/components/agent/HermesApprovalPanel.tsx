import { useEffect, useState } from 'react';
import { Shield, ShieldOff, CheckCircle2 } from 'lucide-react';
import type { AgentTask } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  approveHermesTaskRun,
  fetchGeoApprovalPolicy,
  updateGeoApprovalPolicy,
  type GeoApprovalPolicy,
  type HermesRunSnapshot,
} from '../../lib/hermes-approval';

interface Props {
  task: AgentTask;
  hermesRun?: HermesRunSnapshot | null;
  approvalPolicy?: GeoApprovalPolicy | null;
  onUpdated: () => void;
}

export default function HermesApprovalPanel({
  task,
  hermesRun,
  approvalPolicy,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<GeoApprovalPolicy>(
    approvalPolicy ?? { skipApprovalForGeo: false }
  );
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (approvalPolicy) setPolicy(approvalPolicy);
  }, [approvalPolicy]);

  if (task.executor !== 'nous_hermes') return null;

  const pending = Boolean(hermesRun?.pendingApproval);
  const inProgress = ['running', 'queued'].includes(task.status);

  const toggleSkipApproval = async () => {
    setSavingPolicy(true);
    try {
      const next = !policy.skipApprovalForGeo;
      const saved = await updateGeoApprovalPolicy(next);
      setPolicy(saved);
      toast(
        next
          ? '已开启：GEO 推送将自动批准工具（本会话范围）'
          : '已关闭：GEO 推送恢复 Hermes 人工审批',
        next ? 'info' : 'success'
      );
      onUpdated();
    } catch (e) {
      toast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const approve = async (choice: 'once' | 'session' | 'always') => {
    setApproving(true);
    try {
      await approveHermesTaskRun(task.id, choice);
      toast(
        choice === 'once'
          ? '已批准本次工具'
          : choice === 'session'
            ? '已批准：本会话内同类工具自动放行'
            : '已永久批准该命令模式（写入 Hermes allowlist）',
        'success'
      );
      onUpdated();
    } catch (e) {
      toast(e instanceof Error ? e.message : '批准失败', 'error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="geo-card p-4 space-y-3 border border-amber-200/80 bg-amber-50/40">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-title)] flex items-center gap-2">
            {policy.skipApprovalForGeo ? (
              <ShieldOff className="w-4 h-4 text-amber-700" />
            ) : (
              <Shield className="w-4 h-4 text-amber-700" />
            )}
            Hermes 工具审批
          </h2>
          <p className="text-xs text-[var(--neutral-text-03)] mt-1 max-w-xl">
            GEO 任务通过 Gateway 推送时，shell / 脚本等危险工具需 Hermes 批准。可先开启「自动跳过」，或在下方手动批准当前 pending 工具。
          </p>
        </div>
        <button
          type="button"
          className={`geo-btn-sm shrink-0 ${policy.skipApprovalForGeo ? 'geo-btn-secondary' : 'geo-btn-primary'}`}
          disabled={savingPolicy}
          onClick={() => void toggleSkipApproval()}
        >
          {savingPolicy
            ? '保存中…'
            : policy.skipApprovalForGeo
              ? '关闭 GEO 自动跳过审批'
              : '开启 GEO 推送跳过审批'}
        </button>
      </div>

      {policy.skipApprovalForGeo && (
        <p className="text-[11px] text-amber-900 bg-amber-100/80 border border-amber-200 rounded-lg px-3 py-2">
          已开启：轮询检测到待审批工具时，系统将自动以「本会话批准」放行（约每 2 秒）。仅建议本机连调使用。
        </p>
      )}

      {pending && (
        <div className="rounded-lg border border-amber-300 bg-white/80 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-900">
            当前 run 正在等待工具审批
            {hermesRun?.runId ? ` · ${hermesRun.runId.slice(0, 16)}…` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1"
              disabled={approving}
              onClick={() => void approve('once')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              批准本次
            </button>
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm"
              disabled={approving}
              onClick={() => void approve('session')}
            >
              本会话自动批准
            </button>
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm text-amber-900"
              disabled={approving}
              onClick={() => void approve('always')}
            >
              永久批准（慎用）
            </button>
          </div>
        </div>
      )}

      {!pending && inProgress && !policy.skipApprovalForGeo && (
        <p className="text-[11px] text-[var(--neutral-text-03)]">
          任务执行中。若日志出现「等待工具审批」，请返回此面板点击批准，或先开启上方「跳过审批」。
        </p>
      )}
    </div>
  );
}
