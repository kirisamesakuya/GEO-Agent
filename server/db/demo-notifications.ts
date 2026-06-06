import { prisma } from './client.js';

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const DEMO_NOTIFICATIONS = [
  {
    type: 'agent_task',
    title: '文章生成完成',
    body: 'AI 写作任务已完成，3 篇小红书种草稿已写入内容库，可前往审阅与发布。',
    read: false,
    actionView: 'content_library',
    createdAt: hoursAgo(0.5),
  },
  {
    type: 'geo_report',
    title: 'GEO 专业审计完成',
    body: '专业审计报告已生成，发现 5 项内容缺口与行动计划，建议据此生成补缺文章。',
    read: false,
    actionView: 'geo_analysis',
    createdAt: hoursAgo(2),
  },
  {
    type: 'order',
    title: '订单待验收',
    body: '「小红书种草笔记 ×3」接单方已提交交付，请前往任务交付验收。',
    read: false,
    actionView: 'order_delivery',
    createdAt: hoursAgo(6),
  },
  {
    type: 'publish',
    title: '发布账号需重新授权',
    body: '小红书发布账号授权即将过期，请前往发布账号管理重新授权，避免排程发布失败。',
    read: true,
    actionView: 'account_binding',
    createdAt: daysAgo(1),
  },
  {
    type: 'order',
    title: '接单方已接单',
    body: '「知乎问答覆盖包」已由晨光传媒接单，进入执行中。',
    read: true,
    actionView: 'order_delivery',
    createdAt: daysAgo(2),
  },
  {
    type: 'funds',
    title: '充值已到账',
    body: '您申请的投放余额充值 ¥5,000 已审核通过并入账，可继续发单。',
    read: true,
    actionView: 'account_funds',
    createdAt: daysAgo(3),
  },
] as const;

export async function ensureDemoPublisherNotifications(brandName: string) {
  const count = await prisma.publisherNotification.count({ where: { brandName } });
  if (count > 0) return;

  await prisma.publisherNotification.createMany({
    data: DEMO_NOTIFICATIONS.map((n) => ({
      brandName,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      actionView: n.actionView,
      createdAt: n.createdAt,
    })),
  });
}
