import type { CrawlSnapshot, RuleFinding, RuleScorePreview } from './geo-crawl-snapshot.js';
import type { GeoWebOutput } from './geo-web-output-contract.js';

type HermesFinding = {
  id?: string;
  level?: string;
  severity?: string;
  category?: string;
  title?: string;
  impact?: string;
  suggestion?: string;
  recommendation?: string;
  evidence?: string;
  source?: string;
  [key: string]: unknown;
};

function findingKey(f: { id?: string; title?: string; category?: string }): string {
  return `${f.id ?? ''}|${f.title ?? ''}|${f.category ?? ''}`;
}

function normalizeHermesFinding(raw: HermesFinding): HermesFinding {
  return {
    ...raw,
    id: raw.id ?? `hermes-${findingKey(raw)}`,
    level: raw.level ?? raw.severity ?? 'medium',
    suggestion: raw.suggestion ?? raw.recommendation ?? '',
    source: raw.source ?? 'hermes',
  };
}

function mergeScores(
  rule: RuleScorePreview,
  hermesScores: Record<string, number> | undefined
): Record<string, number> {
  const merged = { ...hermesScores, ...rule.scores };
  for (const [key, ruleVal] of Object.entries(rule.scores)) {
    const hermesVal = hermesScores?.[key];
    if (hermesVal == null) {
      merged[key] = ruleVal;
    } else if (key === 'technicalGeo' || key === 'schema' || key === 'technicalScore' || key === 'crawlerAccessScore') {
      // Rule scores take precedence for technical dimensions
      merged[key] = ruleVal;
    } else {
      merged[key] = hermesVal;
    }
  }
  return merged;
}

function computeMergedTotal(scores: Record<string, number>, hermesTotal?: number): number {
  const technical = scores.technicalGeo ?? scores.technicalScore ?? 0;
  const schema = scores.schema ?? 0;
  const platform = scores.platformOptimization ?? hermesTotal ?? 0;
  const content = scores.contentEeat ?? scores.aiCitability ?? 0;
  if (hermesTotal != null && platform > 0) {
    return Math.round(technical * 0.25 + schema * 0.2 + platform * 0.35 + content * 0.2);
  }
  return Math.round(technical * 0.45 + schema * 0.35 + (scores.crawlerAccessScore ?? 0) * 0.2);
}

export function buildPartialOutputFromPreCrawl(
  snapshot: CrawlSnapshot,
  rulePreview: RuleScorePreview,
  taskInput: Record<string, unknown>
): Record<string, unknown> {
  const brand = String(taskInput.brandName ?? taskInput.brand ?? '品牌');
  return {
    audit: {
      reportType: 'quick_start',
      brandName: brand,
      totalScore: rulePreview.totalScore,
      summary: snapshot.partial
        ? '技术预检已完成（部分抓取失败），平台向分析需 Hermes 补充。'
        : '技术预检已完成，平台向分析需 Hermes 补充。',
      scores: rulePreview.scores,
    },
    data: {
      brandMentionSummary: '—',
      competitorAnalysis: '—',
      contentGap: '—',
      optimizationSuggestions: '请根据技术预检 findings 优先修复官网与 robots/schema 问题。',
    },
    metrics: {
      ...rulePreview.scores,
      scoringSource: 'rule',
      partial: snapshot.partial,
      mentionRate: 0,
    },
    findings: rulePreview.findings,
    artifacts: [],
    actionPlan: rulePreview.findings.slice(0, 3).map((f, i) => ({
      priority: f.level === 'critical' || f.level === 'high' ? 'P0' : 'P1',
      task: f.suggestion,
      expectedImpact: f.impact,
      id: `plan-${i + 1}`,
    })),
    contractVersion: 'geoWebOutput.v1',
    contractValid: true,
    preCrawlSnapshot: snapshot,
    ruleScorePreview: rulePreview,
  };
}

export function mergeGeoWebOutputWithRuleScore(
  hermesOutput: Record<string, unknown>,
  rulePreview: RuleScorePreview | null | undefined,
  snapshot: CrawlSnapshot | null | undefined
): Record<string, unknown> {
  if (!rulePreview) {
    return {
      ...hermesOutput,
      ...(snapshot ? { preCrawlSnapshot: snapshot } : {}),
    };
  }

  const audit = (hermesOutput.audit ?? {}) as Record<string, unknown>;
  const metrics = (hermesOutput.metrics ?? {}) as Record<string, unknown>;
  const hermesScores = audit.scores as Record<string, number> | undefined;
  const mergedScores = mergeScores(rulePreview, hermesScores);

  const ruleFindings = rulePreview.findings;
  const hermesFindings = Array.isArray(hermesOutput.findings)
    ? (hermesOutput.findings as HermesFinding[]).map(normalizeHermesFinding)
    : [];

  const ruleKeys = new Set(ruleFindings.map((f) => findingKey(f)));
  const technicalCategories = new Set(['technical', 'schema', 'crawlers']);

  const filteredHermes = hermesFindings.filter((f) => {
    const cat = String(f.category ?? '');
    if (technicalCategories.has(cat) && ruleFindings.some((r) => r.category === cat)) {
      return false;
    }
    if (ruleKeys.has(findingKey(f))) return false;
    return true;
  });

  const mergedFindings = [...ruleFindings, ...filteredHermes];
  const hermesTotal = audit.totalScore != null ? Number(audit.totalScore) : undefined;
  const totalScore = computeMergedTotal(mergedScores, hermesTotal);

  return {
    ...hermesOutput,
    audit: {
      ...audit,
      scores: mergedScores,
      totalScore,
    },
    metrics: {
      ...metrics,
      ...rulePreview.scores,
      scoringSource: 'rule+hermes',
      partial: snapshot?.partial ?? metrics.partial,
    },
    findings: mergedFindings,
    preCrawlSnapshot: snapshot ?? hermesOutput.preCrawlSnapshot,
    ruleScorePreview: rulePreview,
  };
}

export function extractPreCrawlFromTaskInput(
  input: Record<string, unknown>
): { snapshot: CrawlSnapshot | null; rulePreview: RuleScorePreview | null } {
  const snapshot = input.preCrawlSnapshot as CrawlSnapshot | undefined;
  const rulePreview = input.ruleScorePreview as RuleScorePreview | undefined;
  return {
    snapshot: snapshot ?? null,
    rulePreview: rulePreview ?? null,
  };
}
