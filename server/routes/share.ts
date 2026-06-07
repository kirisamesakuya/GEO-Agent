import type { Express } from 'express';
import { prisma } from '../db/client.js';

/**
 * 公开只读接口，有意跳过登录校验。
 *
 * PRODUCTION_TODO:
 * 分享链接应增加 token / 过期时间 / 访问次数限制，避免报告被枚举访问。
 */
export function registerShareRoutes(app: Express) {
  app.get('/api/share/geo-reports/:id', async (req, res) => {
    const report = await prisma.geoReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: '报告不存在' });
    res.json({
      report: {
        id: report.id,
        brandName: report.brandName,
        mentionRate: report.mentionRate,
        rank: report.rank,
        gapsFound: report.gapsFound,
        brandMentionSummary: report.brandMentionSummary,
        competitorAnalysis: report.competitorAnalysis,
        contentGap: report.contentGap,
        optimizationSuggestions: report.optimizationSuggestions,
        createdAt: report.createdAt.toISOString(),
      },
      readOnly: true,
    });
  });

  app.get('/api/config/publish-platforms', (_req, res) => {
    res.json({
      platforms: [
        '小红书',
        '知乎',
        '公众号',
        '微信公众号',
        '大风网',
        '一点号',
        '抖音',
        'B站',
      ],
      hermesPcNote: 'Hermes/PC 客户端发布：设置 HERMES_API_URL 并启用 nous_hermes 执行器',
    });
  });
}
