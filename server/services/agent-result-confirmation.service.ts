import type { AgentTask } from '../agent/types.js';
import type { BrandSourceMaterial } from '../../lib/brand-source-material.js';
import { getAgentTask, updateAgentTask, createAgentTask } from './agent-task.service.js';
import { getBrandProfile, saveBrandProfile } from './brand.service.js';
import { bulkCreateKeywords, type KeywordGroup } from './keyword.service.js';
import { bulkCreateKnowledge, knowledgeCategoryLabel, type KnowledgeCategory } from './knowledge.service.js';
import { updateContentItem } from './content.service.js';
import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { extractKeywordSuggestions, normalizeKeywordGroup } from '../lib/task-business-output.js';

export const RESULT_CONFIRM_REQUIRED = 'result_confirm_required';
export const RESULT_REJECTED = 'result_rejected';

export const KEYWORD_GROUP_LABELS: Record<string, string> = {
  brand: '品牌词',
  industry: '行业词',
  longtail: '长尾词',
  geo: '地域词',
  competitor: '竞品词',
};

const REGENERATABLE_TYPES = new Set(['brand_extract', 'keyword_mining', 'knowledge_extract']);

function knowledgeEntryKey(item: { category: string; title: string }) {
  return `${item.category}::${item.title}`;
}

function groupKnowledgeEntries(entries: Array<{ category: string; title: string; body: string }>) {
  const groups = new Map<string, typeof entries>();
  for (const item of entries) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()].map(([category, items]) => ({
    category,
    label: knowledgeCategoryLabel(category),
    items,
    count: items.length,
  }));
}

export function isResultConfirmationPending(task: {
  status: string;
  needsReview?: boolean;
  reviewCategory?: string | null;
  output?: Record<string, unknown>;
}): boolean {
  if (task.output?.confirmedAt || task.output?.rejectedAt) return false;
  return (
    task.status === 'succeeded' &&
    Boolean(task.needsReview) &&
    task.reviewCategory === RESULT_CONFIRM_REQUIRED
  );
}

export function getResultConfirmationStatus(task: AgentTask): 'pending' | 'confirmed' | 'rejected' | 'none' {
  if (task.output?.confirmedAt) return 'confirmed';
  if (task.output?.rejectedAt || task.reviewCategory === RESULT_REJECTED) return 'rejected';
  if (isResultConfirmationPending(task)) return 'pending';
  return 'none';
}

function groupKeywordSuggestions(suggestions: Array<{ term: string; group: string }>) {
  const groups = new Map<string, string[]>();
  for (const item of suggestions) {
    const group = item.group || 'longtail';
    const list = groups.get(group) ?? [];
    list.push(item.term);
    groups.set(group, list);
  }
  return [...groups.entries()].map(([group, terms]) => ({
    group,
    label: KEYWORD_GROUP_LABELS[group] ?? group,
    terms,
    count: terms.length,
  }));
}

export async function previewAgentTaskResult(taskId: string) {
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');

  const status = getResultConfirmationStatus(task);

  if (task.type === 'brand_extract') {
    const suggested = (task.output?.profile as Record<string, unknown> | undefined) ?? null;
    const current = task.brandName ? await getBrandProfile(task.brandName) : null;
    const fields = [
      { key: 'name', label: '品牌名称', current: current?.name ?? '', suggested: String(suggested?.name ?? '') },
      { key: 'industry', label: '行业', current: current?.industry ?? '', suggested: String(suggested?.industry ?? '') },
      { key: 'city', label: '城市', current: current?.city ?? '', suggested: String(suggested?.city ?? '') },
      {
        key: 'storeCount',
        label: '门店数量',
        current: current?.storeCount != null ? String(current.storeCount) : '',
        suggested: suggested?.storeCount != null ? String(suggested.storeCount) : '',
      },
      {
        key: 'description',
        label: '业务描述',
        current: current?.description ?? '',
        suggested: String(suggested?.description ?? ''),
      },
      {
        key: 'keywords',
        label: '关键词',
        current: (current?.keywords ?? []).join('、'),
        suggested: Array.isArray(suggested?.keywords) ? suggested.keywords.map(String).join('、') : '',
      },
      {
        key: 'competitors',
        label: '竞品',
        current: (current?.competitors ?? []).join('、'),
        suggested: Array.isArray(suggested?.competitors) ? suggested.competitors.map(String).join('、') : '',
      },
      {
        key: 'forbiddenWords',
        label: '禁用词',
        current: (current?.forbiddenWords ?? []).join('、'),
        suggested: Array.isArray(suggested?.forbiddenWords)
          ? suggested.forbiddenWords.map(String).join('、')
          : '',
      },
    ]
      .filter((f) => f.suggested)
      .map((f) => ({
        ...f,
        changed: f.current.trim() !== f.suggested.trim(),
      }));

    return {
      task,
      status,
      preview: {
        confirmationType: 'brand_profile' as const,
        fields,
        suggestedProfile: suggested,
        currentProfile: current,
      },
    };
  }

  if (task.type === 'keyword_mining') {
    const suggestions = task.output
      ? extractKeywordSuggestions(task.output as Record<string, unknown>)
      : [];
    return {
      task,
      status,
      preview: {
        confirmationType: 'keyword_suggestions' as const,
        totalCount: suggestions.length,
        groups: groupKeywordSuggestions(suggestions),
        suggestions,
      },
    };
  }

  if (task.type === 'knowledge_extract') {
    const entries =
      (task.output?.entries as Array<{ category: string; title: string; body: string }> | undefined) ??
      [];
    return {
      task,
      status,
      preview: {
        confirmationType: 'knowledge_entries' as const,
        totalCount: entries.length,
        knowledgeGroups: groupKnowledgeEntries(entries),
        entries,
      },
    };
  }

  if (task.type === 'geo_content') {
    const data = (task.output?.data ?? {}) as Record<string, unknown>;
    const findings = (task.output?.findings as Array<Record<string, unknown>> | undefined) ?? [];
    return {
      task,
      status,
      preview: {
        confirmationType: 'geo_content_brief' as const,
        rewriteBrief: String(data.rewriteBrief ?? data.brandMentionSummary ?? ''),
        findingsCount: findings.length,
        contentItemId: String(task.input.contentItemId ?? ''),
        candidateTopics: Array.isArray(data.candidateTopics)
          ? (data.candidateTopics as string[])
          : [],
      },
    };
  }

  throw new Error('该任务类型不支持结果确认');
}

export async function confirmAgentTaskResult(
  taskId: string,
  input: {
    confirmedBy?: string;
    selectedTerms?: string[];
    groupOverrides?: Record<string, string>;
    selectedEntryKeys?: string[];
  } = {}
) {
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');
  if (!isResultConfirmationPending(task)) throw new Error('该任务没有待确认的结果');

  let confirmResult: Record<string, unknown>;

  if (task.type === 'brand_extract') {
    const profile = task.output?.profile as Record<string, unknown> | undefined;
    if (!profile) throw new Error('缺少品牌资料结果');

    const taskInput = task.input as Record<string, unknown>;
    const website =
      [taskInput.brandUrl, taskInput.website, taskInput.websiteUrl, profile.website]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .find(Boolean) ?? '';

    const saved = await saveBrandProfile({
      website,
      name: String(profile.name ?? task.brandName ?? ''),
      industry: String(profile.industry ?? ''),
      city: String(profile.city ?? ''),
      storeCount: Number(profile.storeCount ?? 1),
      description: String(profile.description ?? ''),
      keywords: (profile.keywords as string[]) ?? [],
      competitors: (profile.competitors as string[]) ?? [],
      forbiddenWords: (profile.forbiddenWords as string[]) ?? [],
      sourceMaterials: Array.isArray(task.input.sourceMaterials)
        ? (task.input.sourceMaterials as BrandSourceMaterial[])
        : Array.isArray(task.input.materials)
          ? (task.input.materials as BrandSourceMaterial[])
          : undefined,
    });
    confirmResult = { type: 'brand_profile', target: saved.name };
  } else if (task.type === 'keyword_mining') {
    const suggestions = task.output
      ? extractKeywordSuggestions(task.output as Record<string, unknown>)
      : [];
    if (!suggestions.length) throw new Error('缺少候选关键词');

    let items = suggestions;
    if (input.selectedTerms !== undefined) {
      const selected = new Set(input.selectedTerms);
      items = suggestions.filter((s) => selected.has(s.term));
    }
    if (input.groupOverrides) {
      items = items.map((s) => ({
        ...s,
        group: normalizeKeywordGroup(input.groupOverrides![s.term] ?? s.group),
      }));
    }

    const brandName = String(task.brandName ?? task.input.brand ?? '').trim();
    if (!brandName) throw new Error('缺少品牌归属');

    const created = await bulkCreateKeywords(
      brandName,
      items.map((s) => ({
        term: s.term,
        group: (s.group ?? 'longtail') as KeywordGroup,
        source: 'ai_mining',
      }))
    );
    confirmResult = { type: 'keyword_suggestions', count: created.length, target: brandName };
  } else if (task.type === 'knowledge_extract') {
    const entries =
      (task.output?.entries as Array<{ category: string; title: string; body: string }> | undefined) ??
      [];
    if (!entries.length) throw new Error('缺少候选知识库条目');

    let items = entries;
    if (input.selectedEntryKeys !== undefined) {
      const selected = new Set(input.selectedEntryKeys);
      items = entries.filter((e) => selected.has(knowledgeEntryKey(e)));
    }

    const brandName = String(task.brandName ?? task.input.brand ?? '').trim();
    if (!brandName) throw new Error('缺少品牌归属');

    const created = await bulkCreateKnowledge(
      brandName,
      items.map((e) => ({
        category: e.category as KnowledgeCategory,
        title: e.title,
        body: e.body,
      }))
    );
    confirmResult = { type: 'knowledge_entries', count: created.length, target: brandName };
  } else if (task.type === 'geo_content') {
    const contentItemId = String(task.input.contentItemId ?? '').trim();
    if (!contentItemId) throw new Error('缺少 contentItemId');

    const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
    if (!item) throw new Error('内容库条目不存在');

    let existingMeta: Record<string, unknown> = {};
    if (item.generationMetaJson) {
      try {
        existingMeta = JSON.parse(item.generationMetaJson) as Record<string, unknown>;
      } catch {
        existingMeta = {};
      }
    }
    const data = (task.output?.data ?? {}) as Record<string, unknown>;
    await updateContentItem(item.batchId, contentItemId, {
      generationMetaJson: JSON.stringify({
        ...existingMeta,
        geoContentBrief: {
          taskId: task.id,
          rewriteBrief: data.rewriteBrief ?? data.brandMentionSummary,
          candidateTopics: data.candidateTopics,
          findings: task.output?.findings,
          confirmedAt: new Date().toISOString(),
        },
      }),
    });
    confirmResult = { type: 'geo_content_brief', target: contentItemId };
  } else {
    throw new Error('不支持的任务类型');
  }

  const output = {
    ...(task.output ?? {}),
    confirmedAt: new Date().toISOString(),
    confirmedBy: input.confirmedBy ?? 'merchant',
    confirmResult,
  };

  await updateAgentTask(taskId, {
    needsReview: false,
    reviewCategory: null,
    output,
  });

  await appendAuditLog({
    action: 'agent_result_confirm',
    entity: 'AgentTask',
    entityId: taskId,
    detail: JSON.stringify({
      taskType: task.type,
      brandName: task.brandName,
      confirmedBy: input.confirmedBy ?? 'merchant',
      confirmResult,
    }),
  });

  return { task: (await getAgentTask(taskId))!, confirmResult };
}

export async function rejectAgentTaskResult(taskId: string, reason?: string) {
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');
  if (!isResultConfirmationPending(task)) throw new Error('该任务没有待确认的结果');

  const output = {
    ...(task.output ?? {}),
    rejectedAt: new Date().toISOString(),
    rejectReason: reason?.trim() || '用户忽略本次结果',
  };

  await updateAgentTask(taskId, {
    needsReview: false,
    reviewCategory: RESULT_REJECTED,
    output,
  });

  await appendAuditLog({
    action: 'agent_result_reject',
    entity: 'AgentTask',
    entityId: taskId,
    detail: JSON.stringify({
      taskType: task.type,
      brandName: task.brandName,
      reason: output.rejectReason,
    }),
  });

  return { task: (await getAgentTask(taskId))! };
}

export async function regenerateAgentTaskFromResult(taskId: string) {
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');
  if (!REGENERATABLE_TYPES.has(task.type)) {
    throw new Error('该任务类型不支持重新生成');
  }

  const baseTitle = task.title.replace(/\s·\s重跑$/, '');
  const newTask = await createAgentTask({
    type: task.type,
    title: `${baseTitle} · 重跑`,
    input: { ...task.input },
    brandName: task.brandName,
    executor: task.executor ?? (await resolveExecutorKindForTask(task.type)),
  });

  await appendAuditLog({
    action: 'agent_result_regenerate',
    entity: 'AgentTask',
    entityId: newTask.id,
    detail: JSON.stringify({ sourceTaskId: taskId, taskType: task.type, brandName: task.brandName }),
  });

  return newTask;
}

export async function markTaskPendingResultConfirmation(
  task: AgentTask,
  confirmationType:
    | 'brand_profile'
    | 'keyword_suggestions'
    | 'knowledge_entries'
    | 'geo_content_brief'
) {
  await updateAgentTask(task.id, {
    needsReview: true,
    reviewCategory: RESULT_CONFIRM_REQUIRED,
    output: {
      ...(task.output ?? {}),
      confirmationType,
    },
  });
}
