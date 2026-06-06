import { prisma } from '../db/client.js';
import type { AgentTask } from '../agent/types.js';

function toStoredText(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function reportTypeLabel(reportType: string): string {
  const map: Record<string, string> = {
    quick_start: '快速检测',
    audit: '专业审计',
    analysis: 'GEO分析',
    assets: '资产生成',
    compare: '月度对比',
  };
  return map[reportType] ?? 'GEO报告';
}

function buildTitle(input: {
  id: string;
  brandName: string;
  reportType: string;
  createdAt: Date;
  totalScore?: number | null;
  mentionRate?: number | null;
}): string {
  const timePart = input.createdAt.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const scorePart = input.totalScore != null ? `总分${input.totalScore}` : input.mentionRate != null ? `提及${input.mentionRate}%` : null;
  return [input.brandName, reportTypeLabel(input.reportType), timePart, scorePart, `#${input.id.slice(0, 8)}`]
    .filter(Boolean)
    .join(' · ');
}

export async function createGeoReportFromTaskOutput(
  task: AgentTask,
  output: Record<string, unknown>
) {
  const audit = (output.audit ?? {}) as Record<string, unknown>;
  const data = (output.data ?? {}) as Record<string, unknown>;
  const metrics = (output.metrics ?? {}) as Record<string, number>;
  const inp = task.input as Record<string, unknown>;
  const platforms = Array.isArray(inp.platforms) ? inp.platforms.map(String) : [];
  const keywords = Array.isArray(inp.keywords) ? inp.keywords.map(String) : [];
  const reportType = String(audit.reportType ?? (task.type === 'geo_quick_start' ? 'quick_start' : task.type === 'geo_audit' ? 'audit' : 'analysis'));
  const createdAt = new Date();
  const id = crypto.randomUUID();
  const totalScore = audit.totalScore != null ? Number(audit.totalScore) : undefined;

  return prisma.geoReport.create({
    data: {
      id,
      brandName: String(task.brandName ?? audit.brandName ?? inp.brandName ?? ''),
      title: buildTitle({
        id,
        brandName: String(task.brandName ?? audit.brandName ?? ''),
        reportType,
        createdAt,
        totalScore,
        mentionRate: metrics.mentionRate ?? (audit.mentionRate as number | undefined),
      }),
      taskId: task.id,
      reportType,
      mentionRate: metrics.mentionRate ?? (audit.mentionRate as number | undefined) ?? null,
      rank: metrics.rank ?? (audit.rank as number | undefined) ?? null,
      gapsFound: metrics.gapsFound ?? (audit.gapsFound as number | undefined) ?? null,
      totalScore: totalScore ?? null,
      platformsJson: platforms.length ? JSON.stringify(platforms) : null,
      keywordsJson: keywords.length ? JSON.stringify(keywords) : null,
      prospectMode: Boolean(inp.prospectMode),
      brandMentionSummary: toStoredText(data.brandMentionSummary, '—'),
      competitorAnalysis: toStoredText(data.competitorAnalysis, '—'),
      contentGap: toStoredText(data.contentGap, '—'),
      optimizationSuggestions: toStoredText(data.optimizationSuggestions, '—'),
      scoresJson: audit.scores ? JSON.stringify(audit.scores) : null,
      findingsJson: output.findings ? JSON.stringify(output.findings) : null,
      artifactsJson: output.artifacts ? JSON.stringify(output.artifacts) : null,
      actionPlanJson: output.actionPlan ? JSON.stringify(output.actionPlan) : null,
      rawJson: JSON.stringify({ audit, asset: output.asset, questions: audit.questions, platformMatrix: audit.platformMatrix }),
      createdAt,
    },
  });
}

export function mapGeoReportRow(row: {
  id: string;
  brandName: string;
  title: string;
  taskId: string | null;
  reportType: string;
  mentionRate: number | null;
  rank: number | null;
  gapsFound: number | null;
  totalScore: number | null;
  platformsJson: string | null;
  keywordsJson: string | null;
  prospectMode: boolean;
  isBaseline: boolean;
  brandMentionSummary: string;
  competitorAnalysis: string;
  contentGap: string;
  optimizationSuggestions: string;
  scoresJson: string | null;
  findingsJson: string | null;
  artifactsJson: string | null;
  actionPlanJson: string | null;
  rawJson: string | null;
  createdAt: Date;
}) {
  const parse = <T>(raw: string | null): T | null => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };
  return {
    id: row.id,
    brandName: row.brandName,
    title: row.title,
    taskId: row.taskId,
    reportType: row.reportType,
    status: 'succeeded',
    mentionRate: row.mentionRate,
    rank: row.rank,
    gapsFound: row.gapsFound,
    totalScore: row.totalScore,
    platforms: parse<string[]>(row.platformsJson) ?? [],
    keywords: parse<string[]>(row.keywordsJson) ?? [],
    prospectMode: row.prospectMode,
    isBaseline: row.isBaseline,
    brandMentionSummary: row.brandMentionSummary,
    competitorAnalysis: row.competitorAnalysis,
    contentGap: row.contentGap,
    optimizationSuggestions: row.optimizationSuggestions,
    scores: parse<Record<string, number>>(row.scoresJson),
    findings: parse<unknown[]>(row.findingsJson) ?? [],
    actionPlan: parse<unknown[]>(row.actionPlanJson) ?? [],
    artifacts: parse<unknown[]>(row.artifactsJson) ?? [],
    raw: parse<Record<string, unknown>>(row.rawJson),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getGeoAudit(id: string) {
  const row = await prisma.geoReport.findUnique({ where: { id } });
  if (!row) return null;
  const audit = mapGeoReportRow(row);
  let taskMeta: { executor?: string; skillName?: string; status?: string } | null = null;
  if (row.taskId) {
    const task = await prisma.agentTask.findUnique({ where: { id: row.taskId } });
    if (task) {
      const { skillNameForTaskType } = await import('../lib/agent-skill.js');
      taskMeta = {
        executor: task.executor,
        skillName: skillNameForTaskType(task.type),
        status: task.status,
      };
    }
  }
  return { ...audit, taskMeta };
}

export async function listGeoAuditArtifacts(id: string) {
  const audit = await getGeoAudit(id);
  if (!audit) return null;
  return { reportId: id, artifacts: audit.artifacts ?? [] };
}

export async function confirmGeoAuditAction(
  reportId: string,
  input: { actionType: string; riskLevel: string; payload?: Record<string, unknown>; confirmedBy?: string }
) {
  const report = await prisma.geoReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error('报告不存在');
  return prisma.geoActionConfirmation.create({
    data: {
      reportId,
      actionType: input.actionType,
      riskLevel: input.riskLevel,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null,
      confirmedBy: input.confirmedBy ?? 'merchant',
      confirmedAt: new Date(),
    },
  });
}

export async function listGeoActionConfirmations(reportId: string) {
  return prisma.geoActionConfirmation.findMany({
    where: { reportId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function setGeoReportBaseline(reportId: string, brandName: string) {
  await prisma.geoReport.updateMany({
    where: { brandName, isBaseline: true },
    data: { isBaseline: false },
  });
  return prisma.geoReport.update({
    where: { id: reportId },
    data: { isBaseline: true },
  });
}
