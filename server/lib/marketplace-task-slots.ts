import { prisma } from '../db/client.js';

export type MarketplaceSlotInfo = {
  slotTotal: number;
  claimedCount: number;
  availableSlots: number;
};

/** 演示任务名额（按标题片段匹配，覆盖各平台多种接单情况） */
const DEMO_SLOT_OVERRIDES: Array<{ match: string; slotTotal: number; claimedCount: number }> = [
  // 小红书：新发布 / 部分 / 快满 / 满员
  { match: '待接单 · 小红书种草', slotTotal: 1, claimedCount: 0 },
  { match: '南京种植牙种草测评', slotTotal: 1, claimedCount: 0 },
  { match: '待接单 · 隐形矫正日记', slotTotal: 1, claimedCount: 0 },
  { match: '待接单 · 瑞美齿科', slotTotal: 2, claimedCount: 1 },
  { match: '待接单 · 达人种草包', slotTotal: 3, claimedCount: 2 },
  { match: '待接单 · 儿童涂氟体验', slotTotal: 1, claimedCount: 1 },
  // 知乎
  { match: '待接单 · 种植牙科普问答', slotTotal: 1, claimedCount: 0 },
  { match: '待接单 · 知乎问答矩阵', slotTotal: 4, claimedCount: 1 },
  { match: '待接单 · 正畸选购指南', slotTotal: 3, claimedCount: 3 },
  // 公众号
  { match: '待接单 · 暑期矫正活动推文', slotTotal: 1, claimedCount: 0 },
  { match: '待接单 · 会员专享推文', slotTotal: 2, claimedCount: 1 },
  { match: '待接单 · 公众号月刊', slotTotal: 2, claimedCount: 2 },
  // 大风网
  { match: '待接单 · 大风网行业观察', slotTotal: 2, claimedCount: 0 },
  { match: '待接单 · 大风网资讯稿', slotTotal: 2, claimedCount: 1 },
  // 一点号
  { match: '待接单 · 一点号科普', slotTotal: 3, claimedCount: 0 },
  { match: '待接单 · 一点号复诊指南', slotTotal: 3, claimedCount: 2 },
  // 网站
  { match: '待接单 · 网站专题页文案', slotTotal: 1, claimedCount: 0 },
  { match: '待接单 · 网站SEO落地页', slotTotal: 1, claimedCount: 1 },
  // 官媒
  { match: '待接单 · 官媒权威专访', slotTotal: 5, claimedCount: 0 },
  { match: '待接单 · 官媒通稿分发', slotTotal: 5, claimedCount: 3 },
  { match: '待接单 · 官媒发布会通稿', slotTotal: 5, claimedCount: 5 },
];

function inferSlotTotal(order: { type: string; title: string; platform: string }): number {
  if (order.platform === '官媒' || order.title.includes('官媒')) return 5;
  if (order.type.includes('达人') || order.title.includes('达人') || order.title.includes('分发包')) return 3;
  if (order.type.includes('矩阵') || order.title.includes('矩阵')) return 4;
  if (order.platform === '一点号') return 3;
  if (order.platform === '大风网') return 2;
  return 1;
}

function demoOverride(order: { title: string }): MarketplaceSlotInfo | null {
  const hit = DEMO_SLOT_OVERRIDES.find((o) => order.title.includes(o.match));
  if (!hit) return null;
  return {
    slotTotal: hit.slotTotal,
    claimedCount: hit.claimedCount,
    availableSlots: Math.max(0, hit.slotTotal - hit.claimedCount),
  };
}

function hashId(id: string): number {
  return Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
}

function fallbackSlots(order: { id: string; type: string; title: string; platform: string }): MarketplaceSlotInfo {
  const slotTotal = inferSlotTotal(order);
  const h = hashId(order.id);
  const claimedCount = Math.min(slotTotal, h % (slotTotal + 1));
  return {
    slotTotal,
    claimedCount,
    availableSlots: Math.max(0, slotTotal - claimedCount),
  };
}

export async function resolveMarketplaceSlots(order: {
  id: string;
  title: string;
  type: string;
  platform: string;
  providerId: string | null;
  status: string;
}): Promise<MarketplaceSlotInfo> {
  const demo = demoOverride(order);
  if (demo) return demo;

  const slotTotal = inferSlotTotal(order);
  if (order.status !== 'published') {
    return { slotTotal, claimedCount: slotTotal, availableSlots: 0 };
  }

  const [applicationCount, assignmentCount] = await Promise.all([
    prisma.taskOrderApplication.count({ where: { orderId: order.id } }),
    prisma.providerOrderAssignment.count({ where: { orderId: order.id, active: true } }),
  ]);

  const claimedCount = Math.min(slotTotal, applicationCount + assignmentCount + (order.providerId ? 1 : 0));
  if (claimedCount === 0 && applicationCount === 0 && assignmentCount === 0) {
    return fallbackSlots(order);
  }

  return {
    slotTotal,
    claimedCount,
    availableSlots: Math.max(0, slotTotal - claimedCount),
  };
}
