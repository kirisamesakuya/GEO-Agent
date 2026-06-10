import { ClipboardList } from 'lucide-react';
import type { AgentTask, ViewType } from '../../types';
import { resolveCampaignPlanNavigateHint } from '../../lib/campaign-plan-nav';

interface Props {
  task: AgentTask;
  campaignPlanId?: string | null;
  campaignPackageCount?: number | null;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function CampaignPlanResultPanel({
  task,
  campaignPlanId,
  campaignPackageCount,
  onNavigate,
}: Props) {
  if (task.type !== 'campaign_plan') return null;
  if (task.status !== 'succeeded' && task.status !== 'partial') return null;
  if (!task.output) return null;

  const outputPackages = task.output.packages;
  const packageCount =
    campaignPackageCount ??
    (Array.isArray(outputPackages) ? outputPackages.length : 0);
  const persistedPlanId =
    campaignPlanId ?? (task.output.campaignPlanId as string | undefined) ?? null;
  const navHint = resolveCampaignPlanNavigateHint(task, persistedPlanId);

  return (
    <div className="geo-card p-4 space-y-3 border border-[var(--color-border)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-title)]">投放任务包</h2>
          <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">
            {packageCount > 0
              ? `已拆分 ${packageCount} 个任务包，可在发单页调整预算与勾选后发布到资源平台。`
              : '方案已生成，可在发单页继续编辑并发布。'}
            {persistedPlanId ? ' 方案已保存，可直接打开编辑。' : ''}
          </p>
        </div>
        {onNavigate && (
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1.5 shrink-0"
            onClick={() => onNavigate('create_order', navHint)}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            应用到发布任务
          </button>
        )}
      </div>
    </div>
  );
}
