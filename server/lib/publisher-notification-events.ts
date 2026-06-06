import type { AgentTask } from '../agent/types.js';
import { AGENT_TASK_TYPE_LABELS } from '../agent/status.js';
import { createPublisherNotification } from '../services/notification.service.js';

function brandFromTask(task: AgentTask): string {
  return String(task.brandName ?? task.input.brand ?? '').trim();
}

export async function notifyPublisherAgentTask(
  task: AgentTask,
  succeeded: boolean,
  detail?: string | null
) {
  const brandName = brandFromTask(task);
  if (!brandName) return;

  const typeLabel = AGENT_TASK_TYPE_LABELS[task.type] ?? task.type;

  if (succeeded) {
    let body = `「${task.title}」已执行完成，可在运行日志查看详情。`;
    let actionView = 'agent_tasks';
    let title = `${typeLabel}完成`;

    if (task.needsReview && task.reviewCategory === 'result_confirm_required') {
      actionView = 'agent_tasks';
      if (task.type === 'brand_extract') {
        title = '品牌资料已提取，待确认入库';
        body = 'AI 已根据官网或参考材料提取品牌资料，请确认后写入品牌中心。';
      } else if (task.type === 'keyword_mining') {
        const count = Array.isArray(task.output?.suggestions)
          ? task.output!.suggestions!.length
          : 0;
        title = 'AI 挖词完成，待确认入库';
        body = `已生成 ${count} 个候选关键词，请确认后写入关键词库。`;
      } else if (task.type === 'knowledge_extract') {
        const count = Array.isArray(task.output?.entries) ? task.output!.entries!.length : 0;
        title = '知识库抽取完成，待确认入库';
        body = `已生成 ${count} 条知识库条目，请确认后写入企业知识库。`;
      } else {
        title = `${typeLabel}完成，待确认入库`;
        body = 'AI 结果已生成，请确认后写入业务数据。';
      }
    } else if (task.type === 'article_generation' || task.type === 'article_rewrite') {
      actionView = 'content_library';
      body = 'AI 写作任务已完成，稿件已写入内容库，可前往审阅与发布。';
    } else if (
      task.type === 'geo_analysis' ||
      task.type === 'geo_quick_start' ||
      task.type === 'geo_audit' ||
      task.type.startsWith('geo_')
    ) {
      actionView = 'geo_analysis';
      body = `${typeLabel}已完成，可在 GEO 分析查看报告与行动计划。`;
    } else if (
      task.type === 'geo_schema' ||
      task.type === 'geo_llmstxt' ||
      task.type === 'geo_citability'
    ) {
      actionView = 'geo_analysis';
      title = `${typeLabel}草稿已生成`;
      body = '技术资产草稿已生成，请人工确认后再部署到官网或内容中。';
    } else if (task.type === 'hermes_publish') {
      if (task.needsReview || task.status === 'partial') {
        actionView = 'publish_records';
        title = 'Hermes 发布需人工处理';
        body =
          typeof task.output?.evidence === 'string'
            ? String(task.output.evidence)
            : '部分或全部文章未能自动发布，请查看发布证据并手动完成。';
      } else {
        actionView = 'order_delivery';
        body = '内容已通过 Hermes 发布流程，请在文章结果 · 发布记录中确认状态。';
      }
    } else if (task.type === 'campaign_plan') {
      actionView = 'create_order';
      body = '投放任务包已生成，可前往发布任务确认并发单。';
    }

    await createPublisherNotification({
      brandName,
      type: 'agent_task',
      title,
      body,
      refId: task.id,
      actionView,
    });
    return;
  }

  await createPublisherNotification({
    brandName,
    type: 'agent_task',
    title: `${typeLabel}失败`,
    body:
      detail?.slice(0, 200) ??
      `「${task.title}」执行失败，可在运行日志查看详情并重试。`,
    refId: task.id,
    actionView: 'agent_tasks',
  });
}

export async function notifyPublisherOrderAccepted(input: {
  brandName: string;
  orderId: string;
  orderTitle: string;
  providerName: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'order',
    title: '接单方已接单',
    body: `「${input.orderTitle}」已由 ${input.providerName} 接单，进入执行中。`,
    refId: input.orderId,
    actionView: 'order_delivery',
  });
}

export async function notifyPublisherOrderPendingReview(input: {
  brandName: string;
  orderId: string;
  orderTitle: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'order',
    title: '订单待验收',
    body: `「${input.orderTitle}」接单方已提交交付，请前往任务交付验收。`,
    refId: input.orderId,
    actionView: 'order_delivery',
  });
}

export async function notifyPublisherArticleDraftSubmitted(input: {
  brandName: string;
  orderId: string;
  orderTitle: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'order',
    title: '文章草稿待审稿',
    body: `「${input.orderTitle}」接单方已提交文章草稿，请在审稿区处理。`,
    refId: input.orderId,
    actionView: 'order_delivery',
  });
}

export async function notifyPublisherPublishNeedReauth(input: {
  brandName: string;
  platform: string;
  recordId?: string;
  reason?: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'publish',
    title: '发布账号需重新授权',
    body:
      input.reason?.slice(0, 200) ??
      `${input.platform} 发布账号授权失效，请前往发布账号管理重新授权后再发布。`,
    refId: input.recordId,
    actionView: 'account_binding',
  });
}
