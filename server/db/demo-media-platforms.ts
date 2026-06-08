import { prisma } from './client.js';
import {
  MEDIA_PLATFORM_CATALOG_CONFIG_KEY,
  buildDefaultMediaPlatformCatalog,
} from '../../lib/media-platform-catalog.js';
import { serializeCustomPublishPlatforms } from '../../lib/custom-publish-platform.js';
import { invalidateMediaPlatformCatalogCache } from '../services/media-platform-catalog.service.js';

const DEMO_MEDIA_KEY = 'demo_media_platforms_v';
const DEMO_MEDIA_VERSION = '2';

/** 幂等补齐媒体平台字典与品牌自定义发布渠道演示数据 */
export async function ensureDemoMediaPlatforms(brandName = '云杉口腔'): Promise<void> {
  await ensureMediaPlatformCatalogSeed();
  await ensureDemoCustomPublishPlatforms(brandName);

  await prisma.systemConfig.upsert({
    where: { key: DEMO_MEDIA_KEY },
    create: { key: DEMO_MEDIA_KEY, value: DEMO_MEDIA_VERSION },
    update: { value: DEMO_MEDIA_VERSION },
  });
}

async function ensureMediaPlatformCatalogSeed() {
  const defaults = buildDefaultMediaPlatformCatalog();
  const row = await prisma.systemConfig.findUnique({
    where: { key: MEDIA_PLATFORM_CATALOG_CONFIG_KEY },
  });

  let needsWrite = !row?.value?.trim();
  if (!needsWrite) {
    try {
      const parsed = JSON.parse(row!.value) as unknown;
      needsWrite = !Array.isArray(parsed) || parsed.length < defaults.length;
    } catch {
      needsWrite = true;
    }
  }

  if (needsWrite) {
    await prisma.systemConfig.upsert({
      where: { key: MEDIA_PLATFORM_CATALOG_CONFIG_KEY },
      create: { key: MEDIA_PLATFORM_CATALOG_CONFIG_KEY, value: JSON.stringify(defaults) },
      update: { value: JSON.stringify(defaults) },
    });
    invalidateMediaPlatformCatalogCache();
  }
}

async function ensureDemoCustomPublishPlatforms(brandName: string) {
  const brand = await prisma.brand.findFirst({ where: { name: brandName } });
  if (!brand) return;

  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_MEDIA_KEY } });
  const existing = brand.customPublishPlatforms?.trim();
  const hasCustom = existing && existing !== '[]';
  if (hasCustom && marker?.value === DEMO_MEDIA_VERSION) return;

  const customPlatforms = serializeCustomPublishPlatforms([
    {
      platform: '百家号',
      abbr: '百',
      gradient: 'linear-gradient(135deg, #2932e1, #4f8cff)',
      loginUrl: 'https://baijiahao.baidu.com/',
      loginHint: '百度百家号创作者中心：使用百度账号登录',
      permissionsLabel: '内容发布 / 数据回传',
      createdAt: '2026-06-01T08:00:00.000Z',
    },
    {
      platform: '搜狐号',
      abbr: '狐',
      gradient: 'linear-gradient(135deg, #ff6600, #ffb347)',
      loginUrl: 'https://mp.sohu.com/',
      loginHint: '搜狐号自媒体平台登录后，返回本页检测账号',
      permissionsLabel: '内容发布 / 数据回传',
      createdAt: '2026-06-02T09:30:00.000Z',
    },
  ]);

  await prisma.brand.update({
    where: { id: brand.id },
    data: { customPublishPlatforms: customPlatforms },
  });

  for (const platform of ['百家号', '搜狐号']) {
    const binding = await prisma.accountBinding.findFirst({
      where: { brandId: brand.id, platform },
    });
    if (!binding) {
      await prisma.accountBinding.create({
        data: {
          brandId: brand.id,
          platform,
          accountName: '未绑定',
          status: '待授权',
          permissions: '内容发布 / 数据回传',
          lastChecked: '—',
        },
      });
    }
  }
}
