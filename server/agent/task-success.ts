import {
  appendLog,
  updateAgentTask,
} from '../services/agent-task.service.js';
import { createContentBatch } from '../services/content.service.js';
import { createGeoReport } from '../services/campaign.service.js';
import { createGeoReportFromTaskOutput } from '../services/geo-audit.service.js';
import { createCampaignPlan } from '../services/campaign.service.js';
import { createWebsiteRequest } from '../services/website.service.js';
import { saveBrandProfile } from '../services/brand.service.js';
import { saveIndexResults } from '../services/indexing.service.js';
import { updatePublishRecordFromTask } from '../services/publish-plan.service.js';
import { findBrandRow } from '../services/brand.service.js';
import { prisma } from '../db/client.js';
import type { AgentTask } from './types.js';

export async function handleTaskSuccess(
  task: AgentTask,
  output: Record<string, unknown>,
  resultStatus: string
) {
  if (
    (task.type === 'article_generation' || task.type === 'article_rewrite') &&
    output.articles
  ) {
    const articles = output.articles as Array<Record<string, unknown>>;
    const batchQuality = output.qualityChecks as Record<string, unknown> | undefined;
    const brandName = String(task.brandName ?? task.input.brand ?? '品牌');
    const { ensureProjectFromArticleTask, attachBatchToProject } = await import(
      '../services/geo-content-project.service.js'
    );
    const projectId = await ensureProjectFromArticleTask({
      brandName,
      geoProjectId: task.input.geoProjectId ? String(task.input.geoProjectId) : undefined,
      sourceType: String(task.input.source ?? ''),
      geoReportId: task.input.geoReportId ? String(task.input.geoReportId) : null,
      sourceIndexPlanId: task.input.sourceIndexPlanId ? String(task.input.sourceIndexPlanId) : null,
      targetQuestions: Array.isArray(task.input.targetQuestions)
        ? task.input.targetQuestions.map(String)
        : [],
      targetKeywords: Array.isArray(task.input.keywords) ? task.input.keywords.map(String) : [],
      targetPlatforms: Array.isArray(task.input.targetPlatforms)
        ? task.input.targetPlatforms.map(String)
        : [],
      targetPlatform: task.input.targetPlatform ? String(task.input.targetPlatform) : undefined,
      taskTitle: task.title,
    });

    const batch = await createContentBatch({
      brandName,
      platform: String(task.input.targetPlatform ?? '通用'),
      projectId,
      taskId: task.id,
      articles: articles.map((a) => ({
        title: String(a.title ?? ''),
        platform: String(a.platform ?? task.input.targetPlatform ?? ''),
        previewText: String(a.previewText ?? ''),
        fullContent: String(a.fullContent ?? ''),
        structure: String(a.structure ?? ''),
        generationMetaJson: a.generationMeta ? JSON.stringify(a.generationMeta) : undefined,
        qualityChecksJson: a.qualityChecks
          ? JSON.stringify(a.qualityChecks)
          : batchQuality
            ? JSON.stringify(batchQuality)
            : undefined,
        effectBaselineJson: a.effectBaselineJson ? String(a.effectBaselineJson) : undefined,
      })),
      status: resultStatus === 'partial' ? 'partial' : 'ready',
    });
    await attachBatchToProject(
      projectId,
      batch.id,
      batch.items.map((i) => i.id),
      Array.isArray(task.input.targetQuestions) ? task.input.targetQuestions.map(String) : undefined
    );
    const nextOutput: Record<string, unknown> = {
      ...output,
      contentBatchId: batch.id,
      geoProjectId: projectId,
    };
    if (task.input.autoPublish) {
      nextOutput.awaitingPublishConfirm = true;
    }
    await updateAgentTask(task.id, { output: nextOutput });
  }

  if (task.type === 'hermes_publish' && output.publishLink) {
    await appendLog(
      task.id,
      'info',
      `自动发布完成：${String(output.publishLink)}`,
      JSON.stringify({ userConfirmed: task.input.userConfirmed })
    );
    const publishJobId = task.input.publishJobId as string | undefined;
    if (publishJobId) {
      const { updatePublishJobFromTask } = await import('../services/publish-plan.service.js');
      await updatePublishJobFromTask(publishJobId, true, {
        publishLink: String(output.publishLink),
      });
    }
    const planId = task.input.planId as string | undefined;
    if (planId && task.brandName && !publishJobId) {
      const brand = await findBrandRow(task.brandName);
      if (brand) {
        await updatePublishRecordFromTask(planId, brand.id, true, String(output.publishLink));
      }
    }
    const contentBatchId = String(task.input.contentBatchId ?? task.businessRef ?? '');
    const pubBatch = contentBatchId
      ? await prisma.contentBatch.findUnique({ where: { id: contentBatchId } })
      : null;
    if (pubBatch) {
      const selectedItemIds = Array.isArray(task.input.contentItemIds)
        ? task.input.contentItemIds.map((id) => String(id))
        : [];
      await prisma.contentItem.updateMany({
        where: {
          batchId: pubBatch.id,
          ...(selectedItemIds.length ? { id: { in: selectedItemIds } } : {}),
        },
        data: { status: 'published' },
      });

      const publishRecordId = task.input.publishRecordId as string | undefined;
      const publishLink = String(output.publishLink ?? '');
      const { createArticleEffectRetestPlans } = await import(
        '../services/article-effect.service.js'
      );
      const publishedItems = await prisma.contentItem.findMany({
        where: {
          batchId: pubBatch.id,
          ...(selectedItemIds.length ? { id: { in: selectedItemIds } } : {}),
          effectBaselineJson: { not: null },
        },
      });
      for (const item of publishedItems) {
        try {
          const baseline = JSON.parse(item.effectBaselineJson!) as import('../services/article-effect.service.js').EffectBaseline;
          const meta = item.generationMetaJson
            ? (JSON.parse(item.generationMetaJson) as { effectScheduleDays?: number[] })
            : {};
          await createArticleEffectRetestPlans({
            brandName: String(task.brandName ?? pubBatch.brandName),
            contentItemId: item.id,
            publishRecordId,
            publishUrl: publishLink,
            baseline,
            scheduleDays: meta.effectScheduleDays ?? [7, 14, 30],
            publishedAt: new Date(),
          });
        } catch {
          // non-blocking
        }
      }
    }
  }

  if (task.type === 'index_sampling' && output.results) {
    const planId = String(task.input.planId ?? task.businessRef ?? '');
    if (planId) {
      const results = output.results as Array<{
        keyword: string;
        platform: string;
        hit: boolean;
        citedMerchant?: boolean;
        citationSnippet?: string;
      }>;
      await saveIndexResults(planId, results);
      await updateAgentTask(task.id, { output: { ...output, planId } });
      const plan = await prisma.indexQueryPlan.findUnique({ where: { id: planId } });
      if (plan?.verificationType === 'article_effect') {
        const { updateArticleEffectFromRetest } = await import(
          '../services/article-effect.service.js'
        );
        await updateArticleEffectFromRetest(planId);
      }
    }
  }

  if (task.type === 'geo_analysis' && output.data) {
    const data = output.data as Record<string, unknown>;
    const metrics = output.metrics as Record<string, number> | undefined;
    const inp = task.input as Record<string, unknown>;
    const platforms = Array.isArray(inp.platforms) ? inp.platforms.map(String) : [];
    const keywords = Array.isArray(inp.keywords) ? inp.keywords.map(String) : [];
    const report = await createGeoReport({
      brandName: String(task.brandName ?? inp.brand ?? ''),
      taskId: task.id,
      mentionRate: metrics?.mentionRate,
      rank: metrics?.rank,
      gapsFound: metrics?.gapsFound,
      platforms,
      keywords,
      prospectMode: Boolean(inp.prospectMode),
      brandMentionSummary: data.brandMentionSummary ?? '',
      competitorAnalysis: data.competitorAnalysis ?? '',
      contentGap: data.contentGap ?? '',
      optimizationSuggestions: data.optimizationSuggestions ?? '',
    });
    await updateAgentTask(task.id, {
      output: { ...output, geoReportId: report.id, geoReportTitle: report.title },
    });
  }

  const GEO_SKILL_TASK_TYPES = new Set([
    'geo_quick_start',
    'geo_audit',
    'geo_schema',
    'geo_llmstxt',
    'geo_citability',
    'geo_report_pdf',
    'geo_compare',
  ]);
  if (GEO_SKILL_TASK_TYPES.has(task.type) && (output.audit || output.data)) {
    const report = await createGeoReportFromTaskOutput(task, output);
    await updateAgentTask(task.id, {
      output: { ...output, geoReportId: report.id, geoReportTitle: report.title },
    });
  }

  if (task.type === 'campaign_plan' && output.packages) {
    const packages = output.packages as Array<Record<string, unknown>>;
    const plan = await createCampaignPlan({
      brandName: String(task.brandName ?? task.input.brand ?? ''),
      goal: String(output.goal ?? task.input.goal ?? ''),
      platforms: (task.input.platforms as string[]) ?? ['小红书'],
      budgetMin: Number(task.input.budgetMin ?? 1000),
      budgetMax: Number(task.input.budgetMax ?? 5000),
      taskId: task.id,
      packages: packages.map((p) => ({
        name: String(p.name ?? '任务包'),
        platform: String(p.platform ?? '小红书'),
        payeeType: String(p.payeeType ?? '达人'),
        quantity: Number(p.quantity ?? 1),
        unitPrice: p.unitPrice != null ? Number(p.unitPrice) : undefined,
        budget: Number(p.budget ?? 1000),
        deliverable: String(p.deliverable ?? '内容交付'),
        acceptance: String(p.acceptance ?? '截图证明'),
      })),
    });
    await updateAgentTask(task.id, { output: { ...output, campaignPlanId: plan.id } });
  }

  if (task.type === 'account_verify' && task.input.accountId) {
    const verified = Boolean(output.verified);
    const checkedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const resolvedName =
      typeof output.accountName === 'string' && output.accountName.trim()
        ? String(output.accountName)
        : undefined;
    const bindingId = String(task.input.accountId);
    await prisma.accountBinding.update({
      where: { id: bindingId },
      data: {
        status: verified ? '已授权' : '校验失败',
        lastChecked: checkedAt,
        ...(resolvedName ? { accountName: resolvedName, externalAccountId: resolvedName } : {}),
        ...(typeof output.authMethod === 'string' ? { authMethod: String(output.authMethod) } : {}),
        bindSessionId: verified ? null : undefined,
      },
    });
    const { syncAdAccountAfterBindingVerify } = await import('../services/ad-account.service.js');
    await syncAdAccountAfterBindingVerify(bindingId);
    const { appendAuditLog } = await import('../services/audit.service.js');
    await appendAuditLog({
      action: 'account_verify_complete',
      entity: 'AccountBinding',
      entityId: String(task.input.accountId),
      detail: `${output.platform}:${verified ? 'ok' : 'fail'}`,
    });
  }

  if (task.type === 'website_preview' && output.previewHtml) {
    const inputAttachments = task.input.attachments;
    const req = await createWebsiteRequest({
      brandName: String(task.brandName ?? task.input.brand ?? ''),
      pageType: String(task.input.pageType ?? '品牌介绍页'),
      goal: String(task.input.goal ?? ''),
      referenceUrl: task.input.referenceUrl as string | undefined,
      modules: (output.modules as string[]) ?? (task.input.modules as string[]) ?? [],
      previewHtml: String(output.previewHtml ?? ''),
      taskId: task.id,
      attachments: Array.isArray(inputAttachments) ? inputAttachments : undefined,
    });
    await updateAgentTask(task.id, { output: { ...output, websiteRequestId: req.id } });
  }

  if (task.type === 'brand_extract' && output.profile) {
    const profile = output.profile as Record<string, unknown>;
    await saveBrandProfile({
      website: String(task.input.website ?? profile.website ?? ''),
      name: String(profile.name ?? task.brandName ?? ''),
      industry: String(profile.industry ?? ''),
      city: String(profile.city ?? ''),
      storeCount: Number(profile.storeCount ?? 1),
      description: String(profile.description ?? ''),
      keywords: (profile.keywords as string[]) ?? [],
      competitors: (profile.competitors as string[]) ?? [],
      forbiddenWords: (profile.forbiddenWords as string[]) ?? [],
      sourceMaterials: Array.isArray(task.input.sourceMaterials)
        ? (task.input.sourceMaterials as import('../../lib/brand-source-material.js').BrandSourceMaterial[])
        : undefined,
    });
  }
}
