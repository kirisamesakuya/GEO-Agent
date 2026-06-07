import type { AgentTask } from '../../types';
import { AGENT_TASK_TYPE_LABELS } from '../../types';
import { getResultConfirmUiStatus } from '../../lib/agent-result-confirmation';

function geoReportSummary(task: AgentTask): string | null {
  const output = task.output ?? {};
  const gaps = output.gapsFound ?? output.findingsCount;
  const mention = output.mentionRate;
  const parts: string[] = [];
  if (typeof mention === 'number') parts.push(`提及率 ${mention}%`);
  if (typeof gaps === 'number') parts.push(`发现 ${gaps} 项内容缺口`);
  if (output.summary && typeof output.summary === 'string') return output.summary;
  if (parts.length) return parts.join(' · ');
  return 'GEO 报告已生成，可在下方预览结构化结果。';
}

function publishSummary(task: AgentTask): string | null {
  const output = task.output ?? {};
  if (task.status === 'partial') {
    return typeof output.evidence === 'string'
      ? output.evidence
      : '部分平台已发布，部分需要手动处理。';
  }
  if (output.publishLink) return `已发布，链接：${String(output.publishLink)}`;
  return '发布任务已完成，请查看下方证据与日志。';
}

function campaignPlanSummary(task: AgentTask): string | null {
  const packages = task.output?.packages;
  if (Array.isArray(packages) && packages.length) {
    return `已生成 ${packages.length} 个任务包，可在下方确认是否应用到发布任务。`;
  }
  return '投放方案已生成，请预览后确认应用。';
}

export default function AgentTaskResultSummary({ task }: { task: AgentTask }) {
  const confirmStatus = getResultConfirmUiStatus(task);
  const typeLabel = AGENT_TASK_TYPE_LABELS[task.type] ?? task.type;

  let summary: string | null = null;
  if (task.type.startsWith('geo_') || task.type === 'geo_analysis') {
    summary = geoReportSummary(task);
  } else if (task.type === 'hermes_publish') {
    summary = publishSummary(task);
  } else if (task.type === 'account_verify') {
    summary = task.output?.verified ? '账号登录态校验通过。' : '账号校验未通过，请查看原因并更新账号状态。';
  } else if (task.type === 'campaign_plan') {
    summary = campaignPlanSummary(task);
  } else if (task.type === 'keyword_mining') {
    const count = Array.isArray(task.output?.suggestions) ? task.output!.suggestions!.length : 0;
    summary = `已生成 ${count} 个候选关键词，确认后将写入关键词库。`;
  } else if (task.type === 'knowledge_extract') {
    const count = Array.isArray(task.output?.entries) ? task.output!.entries!.length : 0;
    summary = `已生成 ${count} 条知识库条目，确认后将写入企业知识库。`;
  } else if (task.type === 'brand_extract') {
    summary = 'AI 已提取品牌资料字段，请对比来源材料后确认写入。';
  } else if (task.userErrorMessage) {
    summary = task.userErrorMessage;
  } else if (task.errorMessage) {
    summary = task.errorMessage;
  }

  return (
    <div className="geo-card p-4 space-y-2">
      <h2 className="text-sm font-semibold text-[var(--color-title)]">结果摘要</h2>
      <p className="text-xs text-[var(--neutral-text-03)]">
        {typeLabel}
        {task.brandName ? ` · ${task.brandName}` : ''}
        {confirmStatus ? ` · ${confirmStatus}` : ''}
      </p>
      {summary && (
        <p className="text-sm leading-relaxed text-[var(--neutral-text-02)]">{summary}</p>
      )}
    </div>
  );
}
