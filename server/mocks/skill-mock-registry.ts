import type { AgentTask } from '../agent/types.js';
import { fixtureForGeoTaskType } from '../lib/geo-skill-fixtures.js';
import {
  extractPreCrawlFromTaskInput,
  mergeGeoWebOutputWithRuleScore,
} from '../lib/geo-score-merge.js';
import {
  buildMockAccountVerifyOutput,
  buildMockHermesPublishOutput,
} from '../lib/hermes-publish-mock.js';
import { mockArticleGenerationOutput } from './article-fixtures.js';
import {
  mockCampaignPlan,
  mockIndexSampling,
  mockKeywordMining,
  mockKnowledgeExtract,
  mockWebsitePreview,
} from './direct-model-fixtures.js';
import {
  SKILL_SAMPLE_ENTRIES,
  sampleInputForTaskType,
  skillSampleMeta,
  type SkillSampleEntry,
} from './skill-samples.js';

export type SkillMockCatalogItem = SkillSampleEntry & {
  mockAvailable: boolean;
  mockGate: string;
};

const GEO_HERMES_TYPES = new Set([
  'geo_quick_start',
  'geo_audit',
  'geo_analysis',
  'brand_extract',
  'geo_schema',
  'geo_llmstxt',
  'geo_citability',
  'geo_technical',
  'geo_crawlers',
  'geo_content',
  'geo_platform_optimizer',
  'geo_report_pdf',
  'geo_compare',
]);

function mockGateFor(entry: SkillSampleEntry): string {
  if (entry.category === 'geo_hermes') {
    return '设置 userConfirmedExecution: true，或开启 GEO_SKILL_MOCK_DEMO=true';
  }
  if (entry.taskType === 'hermes_publish') {
    return 'GEO_SKILL_MOCK_DEMO=true 且 mockHermes: true';
  }
  if (entry.taskType === 'account_verify') {
    return 'mockVerify: true 或 bindSessionId';
  }
  return 'direct_model 默认可用（无需 Hermes）';
}

export function getSkillMockCatalog(): SkillMockCatalogItem[] {
  return SKILL_SAMPLE_ENTRIES.map((entry) => ({
    ...entry,
    mockAvailable: true,
    mockGate: mockGateFor(entry),
  }));
}

function withBrand(input: Record<string, unknown>, brandName?: string | null) {
  return {
    ...input,
    brandName: brandName ?? input.brandName,
    brand: brandName ?? input.brand ?? input.brandName,
  };
}

/** 生成指定 taskType 的 Mock 输出（演示 / POC） */
export function mockOutputForTaskType(
  type: string,
  input: Record<string, unknown> = {},
  task?: Pick<AgentTask, 'id' | 'brandName' | 'input'>
): Record<string, unknown> {
  const merged = withBrand({ ...sampleInputForTaskType(type), ...input }, task?.brandName);

  if (GEO_HERMES_TYPES.has(type)) {
    const output = fixtureForGeoTaskType(type, merged) as Record<string, unknown>;
    const taskInput = task?.input ?? merged;
    if (type === 'geo_quick_start' || type === 'geo_audit') {
      const { snapshot, rulePreview } = extractPreCrawlFromTaskInput(taskInput);
      if (rulePreview) {
        return {
          source: 'mock_geo_fixture',
          ...mergeGeoWebOutputWithRuleScore(output, rulePreview, snapshot),
        };
      }
    }
    return { source: 'mock_geo_fixture', ...output };
  }

  switch (type) {
    case 'article_generation':
    case 'article_rewrite':
      return mockArticleGenerationOutput(merged);
    case 'campaign_plan':
      return mockCampaignPlan(merged);
    case 'website_preview':
      return mockWebsitePreview(merged);
    case 'keyword_mining':
      return mockKeywordMining(merged);
    case 'knowledge_extract':
      return mockKnowledgeExtract(merged);
    case 'index_sampling':
      return mockIndexSampling(merged);
    case 'hermes_publish': {
      const mockTask = {
        id: task?.id ?? 'demo-task',
        type: 'hermes_publish' as const,
        brandName: task?.brandName ?? String(merged.brand ?? ''),
        input: { ...merged, userConfirmed: true },
      } satisfies Pick<AgentTask, 'id' | 'type' | 'brandName' | 'input'>;
      const mock = buildMockHermesPublishOutput(mockTask as AgentTask);
      return {
        source: 'mock_hermes_publish',
        ...(mock.output as Record<string, unknown>),
      };
    }
    case 'account_verify': {
      const mockTask = {
        id: task?.id ?? 'demo-task',
        type: 'account_verify' as const,
        brandName: task?.brandName ?? '',
        input: merged,
      } satisfies Pick<AgentTask, 'id' | 'type' | 'brandName' | 'input'>;
      const result = buildMockAccountVerifyOutput(mockTask as AgentTask);
      return {
        source: 'mock_account_verify',
        ...(result.output as Record<string, unknown>),
      };
    }
    default:
      throw new Error(`Unsupported mock taskType: ${type}`);
  }
}

export function getSkillMockPreview(taskType: string, inputOverrides?: Record<string, unknown>) {
  const meta = skillSampleMeta(taskType);
  if (!meta) return null;
  const sampleInput = { ...meta.sampleInput, ...inputOverrides };
  const output = mockOutputForTaskType(taskType, sampleInput);
  return {
    ...meta,
    sampleInput,
    sampleOutput: output,
    mockGate: mockGateFor(meta),
  };
}

export { sampleInputForTaskType, skillSampleMeta, SKILL_SAMPLE_ENTRIES };
