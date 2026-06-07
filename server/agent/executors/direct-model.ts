import type { AgentExecutor, AgentTask } from '../types.js';
import { taskRequiresHermesExecutor, allowsDirectModelGeoFixtureMock } from '../../lib/agent-status.js';
import {
  buildMockAccountVerifyOutput,
  buildMockHermesPublishOutput,
} from '../../lib/hermes-publish-mock.js';
import { mockOutputForTaskType } from '../../mocks/skill-mock-registry.js';
import {
  mockCampaignPlan,
  mockIndexSampling,
  mockKeywordMining,
  mockKnowledgeExtract,
  mockWebsitePreview,
} from '../../mocks/direct-model-fixtures.js';

const MOCK_MODEL_LABEL = 'Mock AI（未调用 MiniMax）';

function hermesRequiredFailure(task: AgentTask) {
  return {
    status: 'failed' as const,
    progress: 0,
    errorMessage: `任务类型 ${task.type} 需本机 Hermes 执行`,
    userErrorMessage:
      '该任务已禁用 Mock。请启动 Hermes Gateway（8642）并设置 HERMES_EXECUTOR=nous_hermes，或开启 GEO_SKILL_MOCK_DEMO=true',
    log: {
      level: 'error' as const,
      message: '已禁用 Mock：GEO/Hermes 任务仅支持本机 Hermes 执行',
    },
  };
}

export class DirectModelExecutor implements AgentExecutor {
  async submit(_task: AgentTask) {
    return {};
  }

  async poll(task: AgentTask) {
    if (taskRequiresHermesExecutor(task.type, task.input)) {
      return hermesRequiredFailure(task);
    }

    if (allowsDirectModelGeoFixtureMock(task)) {
      const output = mockOutputForTaskType(task.type, task.input ?? {}, task);
      return {
        status: 'succeeded' as const,
        progress: 100,
        output,
        log: {
          level: 'info' as const,
          message: `Mock GEO 技能完成：${task.type}`,
        },
      };
    }

    switch (task.type) {
      case 'article_generation':
      case 'article_rewrite': {
        const { executeArticleGenerationTask } = await import(
          '../../services/article-generation.service.js'
        );
        const output = await executeArticleGenerationTask(task);
        const count = (output.articles as unknown[]).length;
        const qc = output.qualityChecks as { forbiddenWords?: { passed?: boolean } } | undefined;
        const qcNote = qc?.forbiddenWords?.passed === false ? '（含禁用词风险）' : '';
        return {
          status: 'succeeded' as const,
          progress: 100,
          output,
          log: {
            level: 'info' as const,
            message: `Web AI 写作完成：${count} 篇${qcNote}`,
          },
        };
      }
      case 'campaign_plan': {
        const output = mockCampaignPlan(task.input);
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: 'Mock 数据生成：投放计划任务包已生成' } };
      }
      case 'website_preview': {
        const output = mockWebsitePreview(task.input);
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: 'Mock 数据生成：网页预览已生成' } };
      }
      case 'account_verify': {
        const result = buildMockAccountVerifyOutput(task);
        if (result.status === 'failed') {
          return {
            status: 'failed' as const,
            progress: 100,
            output: result.output,
            errorMessage: result.errorMessage,
            userErrorMessage: result.userErrorMessage,
            log: { level: 'error' as const, message: result.userErrorMessage ?? '账号校验失败' },
          };
        }
        return {
          status: 'succeeded' as const,
          progress: 100,
          output: result.output,
          log: { level: 'info' as const, message: result.logMessage ?? '账号校验通过' },
        };
      }
      case 'keyword_mining': {
        const output = mockKeywordMining({ ...task.input, brand: task.brandName ?? task.input.brand });
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: `Mock 数据生成：已挖掘 ${(output.suggestions as unknown[]).length} 个关键词建议` } };
      }
      case 'knowledge_extract': {
        const output = mockKnowledgeExtract({ ...task.input, brand: task.brandName ?? task.input.brand });
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: `Mock 数据生成：已抽取 ${(output.entries as unknown[]).length} 条知识库条目` } };
      }
      case 'index_sampling': {
        const output = mockIndexSampling({ ...task.input, brand: task.brandName ?? task.input.brand });
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: `Mock 数据生成：收录采样完成 ${(output.results as unknown[]).length} 条` } };
      }
      case 'hermes_publish': {
        if (!task.input.userConfirmed) {
          return {
            status: 'failed' as const,
            progress: 0,
            errorMessage: '缺少用户发布确认',
            userErrorMessage: '请先确认后再执行自动发布',
          };
        }
        const mock = buildMockHermesPublishOutput(task);
        return {
          status: mock.status,
          progress: 100,
          output: mock.output,
          errorMessage: mock.errorMessage,
          userErrorMessage: mock.userErrorMessage,
          log: { level: mock.status === 'succeeded' ? 'info' as const : 'warn' as const, message: mock.logMessage },
        };
      }
      default:
        return { status: 'failed' as const, progress: 0, errorMessage: `Unsupported: ${task.type}`, userErrorMessage: '暂不支持该任务类型' };
    }
  }

  async cancel(_task: AgentTask) {}
}

export function getActiveModelLabel(): string {
  return MOCK_MODEL_LABEL;
}
