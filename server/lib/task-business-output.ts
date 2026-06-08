import {
  markdownFromTaskArticles,
  sanitizeDeliverableMarkdown,
} from '../../lib/task-deliverable-markdown.js';
import type { AgentTaskType } from '../agent/types.js';
import type { KeywordGroup } from '../services/keyword.service.js';
import type { GeoWebArtifact } from './geo-web-output-contract.js';

export type TaskDeliverableFormat = 'markdown' | 'html' | 'pdf' | 'structured' | 'text';

export type TaskDeliverableView = {
  format: TaskDeliverableFormat;
  title: string;
  content?: string;
  url?: string;
  /** 业务侧优先展示交付物，隐藏原始 JSON */
  hideRawJson: boolean;
  /** 结构化预览（如关键词分组） */
  structured?: Record<string, unknown>;
};

const GEO_SKILL_TASK_TYPES = new Set<AgentTaskType>([
  'geo_quick_start',
  'geo_audit',
  'geo_schema',
  'geo_llmstxt',
  'geo_citability',
  'geo_technical',
  'geo_crawlers',
  'geo_content',
  'geo_platform_optimizer',
  'geo_report',
  'geo_report_pdf',
  'geo_compare',
  'geo_proposal',
  'geo_prospect',
  'geo_analysis',
]);

const GROUP_ALIASES: Record<string, KeywordGroup> = {
  brand: 'brand',
  品牌: 'brand',
  品牌词: 'brand',
  industry: 'industry',
  行业: 'industry',
  行业词: 'industry',
  longtail: 'longtail',
  长尾: 'longtail',
  长尾词: 'longtail',
  geo: 'geo',
  地域: 'geo',
  地域词: 'geo',
  local: 'geo',
  location: 'geo',
  competitor: 'competitor',
  竞品: 'competitor',
  竞品词: 'competitor',
};

export function normalizeKeywordGroup(raw: unknown): KeywordGroup {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (GROUP_ALIASES[key]) return GROUP_ALIASES[key];
  const original = String(raw ?? '').trim();
  return GROUP_ALIASES[original] ?? 'longtail';
}

function coerceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseEmbeddedJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function pushSuggestion(
  out: Array<{ term: string; group: KeywordGroup }>,
  term: unknown,
  group: unknown
) {
  const t = String(term ?? '').trim();
  if (!t) return;
  out.push({ term: t, group: normalizeKeywordGroup(group) });
}

function extractFromKeywordGroupsObject(
  groups: Record<string, unknown>,
  out: Array<{ term: string; group: KeywordGroup }>
) {
  for (const [groupKey, value] of Object.entries(groups)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') pushSuggestion(out, item, groupKey);
        else if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          pushSuggestion(out, row.term ?? row.keyword ?? row.text, row.group ?? groupKey);
        }
      }
    }
  }
}

/** 从 Hermes / Mock / 旧字段中提取关键词建议，供确认入库与关键词库分组。 */
export function extractKeywordSuggestions(
  output: Record<string, unknown>
): Array<{ term: string; group: KeywordGroup }> {
  const direct = output.suggestions;
  if (Array.isArray(direct) && direct.length) {
    return direct
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          term: String(row.term ?? row.keyword ?? '').trim(),
          group: normalizeKeywordGroup(row.group),
        };
      })
      .filter((s) => s.term.length > 0);
  }

  const out: Array<{ term: string; group: KeywordGroup }> = [];
  const data = coerceRecord(output.data);

  if (Array.isArray(data.keywords)) {
    for (const item of data.keywords) {
      if (typeof item === 'string') pushSuggestion(out, item, 'longtail');
      else if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        pushSuggestion(out, row.term ?? row.keyword, row.group);
      }
    }
  }

  const keywordGroups = data.keywordGroups ?? data.groups ?? output.keywordGroups;
  if (keywordGroups && typeof keywordGroups === 'object') {
    extractFromKeywordGroupsObject(keywordGroups as Record<string, unknown>, out);
  }

  const artifacts = (output.artifacts ?? []) as GeoWebArtifact[];
  for (const art of artifacts) {
    const preview = art.preview ?? art.content;
    if (!preview || typeof preview !== 'string') continue;
    if (art.type === 'json' || art.name?.endsWith('.json')) {
      const parsed = parseEmbeddedJson(preview);
      if (parsed?.suggestions && Array.isArray(parsed.suggestions)) {
        for (const item of parsed.suggestions) {
          const row = item as Record<string, unknown>;
          pushSuggestion(out, row.term ?? row.keyword, row.group);
        }
      }
      if (parsed?.keywordGroups) {
        extractFromKeywordGroupsObject(parsed.keywordGroups as Record<string, unknown>, out);
      }
    }
  }

  const rawText = String(output.rawText ?? output.summary ?? '');
  const embedded = parseEmbeddedJson(rawText);
  if (embedded) {
    return extractKeywordSuggestions({ ...output, ...embedded, suggestions: embedded.suggestions ?? output.suggestions });
  }

  const seen = new Set<string>();
  return out.filter((s) => {
    const key = `${s.group}::${s.term}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstArtifact(
  output: Record<string, unknown>,
  types: string[]
): GeoWebArtifact | undefined {
  const artifacts = (output.artifacts ?? []) as GeoWebArtifact[];
  return artifacts.find((a) => types.includes(String(a.type ?? '')));
}

function markdownFromGeoOutput(output: Record<string, unknown>): string | undefined {
  const mdArt = firstArtifact(output, ['markdown']);
  if (mdArt?.preview || mdArt?.content) {
    return String(mdArt.preview ?? mdArt.content);
  }

  const audit = coerceRecord(output.audit);
  const data = coerceRecord(output.data);
  const lines: string[] = [];

  const title = String(audit.title ?? output.geoReportTitle ?? 'GEO 分析报告');
  lines.push(`# ${title}`, '');

  if (audit.summary) {
    lines.push(String(audit.summary), '');
  }

  const sections: Array<[string, unknown]> = [
    ['品牌提及摘要', data.brandMentionSummary ?? output.brandMentionSummary],
    ['竞品分析', data.competitorAnalysis ?? output.competitorAnalysis],
    ['内容缺口', data.contentGap ?? output.contentGap],
    ['优化建议', data.optimizationSuggestions ?? output.optimizationSuggestions],
  ];

  for (const [heading, body] of sections) {
    const text = body != null ? String(body).trim() : '';
    if (!text || text === '—') continue;
    lines.push(`## ${heading}`, '', text, '');
  }

  const findings = output.findings;
  if (Array.isArray(findings) && findings.length) {
    lines.push('## 发现问题', '');
    for (const f of findings) {
      const row = f as Record<string, unknown>;
      lines.push(`- **${row.title ?? '问题'}**${row.recommendation ? `：${row.recommendation}` : ''}`);
    }
    lines.push('');
  }

  return lines.length > 2 ? lines.join('\n') : undefined;
}

function resolveMarkdownContent(output: Record<string, unknown>): string | undefined {
  const fromArticles = markdownFromTaskArticles(output);
  if (fromArticles) return sanitizeDeliverableMarkdown(fromArticles);

  const mdArt = firstArtifact(output, ['markdown']);
  if (mdArt?.preview || mdArt?.content) {
    return sanitizeDeliverableMarkdown(String(mdArt.preview ?? mdArt.content));
  }

  const fromGeo = markdownFromGeoOutput(output);
  if (fromGeo) return sanitizeDeliverableMarkdown(fromGeo);

  for (const key of ['summary', 'rawText', 'reportMarkdown', 'markdown'] as const) {
    const value = output[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const cleaned = sanitizeDeliverableMarkdown(value);
    if (cleaned && !cleaned.startsWith('{')) return cleaned;
  }

  return undefined;
}

/** 将任务 output 归一化为业务可理解的 suggestions 等字段（写回 task.output 时使用）。 */
export function normalizeTaskBusinessOutput(
  taskType: AgentTaskType,
  output: Record<string, unknown>
): Record<string, unknown> {
  if (taskType === 'keyword_mining') {
    const suggestions = extractKeywordSuggestions(output);
    if (suggestions.length) {
      return { ...output, suggestions, deliverableFormat: 'structured' };
    }
  }
  return output;
}

export function buildTaskDeliverableView(
  taskType: AgentTaskType,
  output: Record<string, unknown> | undefined | null
): TaskDeliverableView | null {
  if (!output || !Object.keys(output).length) return null;

  if (taskType === 'keyword_mining') {
    const suggestions = extractKeywordSuggestions(output);
    const groups: Record<string, string[]> = {};
    for (const s of suggestions) {
      const list = groups[s.group] ?? [];
      list.push(s.term);
      groups[s.group] = list;
    }
    return {
      format: 'structured',
      title: 'AI 挖词候选',
      hideRawJson: true,
      structured: { type: 'keyword_suggestions', groups, total: suggestions.length },
    };
  }

  if (taskType === 'article_generation' || taskType === 'article_rewrite') {
    const md = resolveMarkdownContent(output);
    if (md) {
      return { format: 'markdown', title: '生成文章', content: md, hideRawJson: true };
    }
  }

  if (taskType === 'geo_content') {
    const data = coerceRecord(output.data);
    const brief = String(data.rewriteBrief ?? data.brandMentionSummary ?? '').trim();
    if (brief) {
      return { format: 'markdown', title: '内容优化 Brief', content: brief, hideRawJson: true };
    }
  }

  if (GEO_SKILL_TASK_TYPES.has(taskType)) {
    const pdfArt = firstArtifact(output, ['pdf']);
    if (pdfArt?.url) {
      return {
        format: 'pdf',
        title: pdfArt.name ?? 'GEO 报告 PDF',
        url: pdfArt.url,
        hideRawJson: true,
      };
    }

    const htmlArt = firstArtifact(output, ['html']);
    if (htmlArt?.preview || htmlArt?.content) {
      return {
        format: 'html',
        title: htmlArt.name ?? 'GEO 报告 HTML',
        content: String(htmlArt.preview ?? htmlArt.content),
        hideRawJson: true,
      };
    }

    const md = resolveMarkdownContent(output);
    if (md) {
      return {
        format: 'markdown',
        title: 'GEO 分析报告',
        content: md,
        hideRawJson: true,
      };
    }

    if (output.geoReportId) {
      return {
        format: 'text',
        title: '报告已生成',
        content: '完整报告已写入报告历史，请在 GEO 分析页查看详情与 PDF 导出。',
        hideRawJson: true,
      };
    }
  }

  const md = resolveMarkdownContent(output);
  if (md) {
    return {
      format: 'markdown',
      title: '执行结果',
      content: md,
      hideRawJson: true,
    };
  }

  return {
    format: 'text',
    title: '结构化结果',
    content: '该任务结果已写入业务模块，请查看上方确认面板或关联页面。',
    hideRawJson: true,
  };
}
