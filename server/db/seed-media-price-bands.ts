/** 价目带种子（P1 运营维护，P0 仅预留表结构） */
export const MEDIA_PRICE_BAND_SEEDS = [
  { mediaType: 'official_media', contentDirection: '品牌介绍稿', publishPlatform: '网站', suggestedMinCents: 80000, suggestedMaxCents: 300000 },
  { mediaType: 'vertical_media', contentDirection: '科普测评', publishPlatform: '网站', suggestedMinCents: 50000, suggestedMaxCents: 200000 },
  { mediaType: 'qa', contentDirection: '医生口碑问答', publishPlatform: '知乎', suggestedMinCents: 30000, suggestedMaxCents: 150000 },
  { mediaType: 'xiaohongshu', contentDirection: '种草', publishPlatform: '小红书', suggestedMinCents: 20000, suggestedMaxCents: 100000 },
];

export async function seedMediaPriceBands(prisma: { platformMediaPriceBand: { count: () => Promise<number>; createMany: (args: { data: typeof MEDIA_PRICE_BAND_SEEDS }) => Promise<{ count: number }> } }) {
  const count = await prisma.platformMediaPriceBand.count();
  if (count > 0) return;
  await prisma.platformMediaPriceBand.createMany({ data: MEDIA_PRICE_BAND_SEEDS });
}
