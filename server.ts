import './server/load-env.js';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { prisma } from './server/db/client.js';
import { seedDatabase } from './server/db/seed.js';
import { ensureRuntimeDefaults, ensureProviderSchemaPatches } from './server/db/bootstrap.js';
import { registerAgentTaskRoutes } from './server/routes/agent-tasks.js';
import { registerContentRoutes } from './server/routes/content.js';
import { registerBrandRoutes } from './server/routes/brand.js';
import { registerAdAccountRoutes } from './server/routes/ad-accounts.js';
import { registerAiCreditsRoutes } from './server/routes/ai-credits.js';
import { registerBudgetRoutes } from './server/routes/budget.js';
import { registerCampaignRoutes } from './server/routes/campaign.js';
import { registerOrderRoutes } from './server/routes/orders.js';
import { registerArticleDeliveryRoutes } from './server/routes/article-deliveries.js';
import { registerWebsiteRoutes } from './server/routes/website.js';
import { registerPlatformRoutes } from './server/routes/platform.js';
import { registerMediaPlatformRoutes } from './server/routes/media-platforms.js';
import { registerMonitorPlatformRoutes } from './server/routes/monitor-platforms.js';
import { registerProviderRoutes } from './server/routes/provider.js';
import { registerUploadRoutes } from './server/routes/upload.js';
import { registerPublisherRoutes } from './server/routes/publisher.js';
import { registerKeywordRoutes } from './server/routes/keywords.js';
import { registerKnowledgeRoutes } from './server/routes/knowledge.js';
import { registerIndexingRoutes } from './server/routes/indexing.js';
import { registerAiMonitorSessionRoutes } from './server/routes/ai-monitor-sessions.js';
import { registerMediaRoutes } from './server/routes/media.js';
import { registerPublishPlanRoutes } from './server/routes/publish-plans.js';
import { registerGeoContentProjectRoutes } from './server/routes/geo-content-projects.js';
import { processDuePublishJobs } from './server/services/publish-plan.service.js';
import { registerShareRoutes } from './server/routes/share.js';
import { registerDemoMockRoutes } from './server/routes/demo-mocks.js';
import { registerHermesRoutes } from './server/routes/hermes.js';
import { registerHermesLocalRoutes } from './server/routes/hermes-local.js';
import { registerOnboardingRoutes } from './server/routes/onboarding.js';
import { registerGeoAuditRoutes } from './server/routes/geo-audits.js';
import { registerArticleGenerationRoutes } from './server/routes/article-generation.js';
import { registerAuthRoutes } from './server/routes/auth.js';
import { attachRequestContext } from './server/middleware/auth.js';
import path from 'path';
import { startAgentWorker } from './server/agent/worker.js';
import { runGlobalHealthCheck } from './server/lib/health-check.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const HMR_PORT = Number(process.env.VITE_HMR_PORT ?? 24678);

app.use(express.json());
app.use('/api', attachRequestContext);

async function bootstrap() {
  await prisma.$connect();
  await ensureProviderSchemaPatches();

  if (process.env.SEED_DEMO_DATA === 'true') {
    await seedDatabase();
    const { ensureDemoUsers } = await import('./server/db/demo-users.js');
    const { ensureDemoFinance } = await import('./server/db/demo-finance.js');
    const { ensureDemoPlatformSuite } = await import('./server/db/demo-platform-suite.js');
    await ensureDemoUsers();
    await ensureDemoFinance();
    await ensureDemoPlatformSuite();
  }

  await ensureRuntimeDefaults();

  registerAuthRoutes(app);
  registerBrandRoutes(app);
  registerAdAccountRoutes(app);
  registerAiCreditsRoutes(app);
  registerBudgetRoutes(app);
  registerAgentTaskRoutes(app);
  registerArticleGenerationRoutes(app);
  registerHermesRoutes(app);
  registerHermesLocalRoutes(app);
  registerOnboardingRoutes(app);
  registerGeoAuditRoutes(app);
  registerContentRoutes(app);
  registerCampaignRoutes(app);
  registerOrderRoutes(app);
  registerArticleDeliveryRoutes(app);
  registerWebsiteRoutes(app);
  registerProviderRoutes(app);
  registerPlatformRoutes(app);
  registerMediaPlatformRoutes(app);
  registerMonitorPlatformRoutes(app);
  registerUploadRoutes(app);
  registerPublisherRoutes(app);
  registerKeywordRoutes(app);
  registerKnowledgeRoutes(app);
  registerIndexingRoutes(app);
  registerAiMonitorSessionRoutes(app);
  registerMediaRoutes(app);
  registerPublishPlanRoutes(app);
  registerGeoContentProjectRoutes(app);
  registerShareRoutes(app);
  registerDemoMockRoutes(app);
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/api/health', async (_req, res) => {
    const report = await runGlobalHealthCheck();
    res.status(report.ok ? 200 : 503).json(report);
  });

  startAgentWorker();
  setInterval(() => {
    void processDuePublishJobs().catch((err) => {
      console.warn('[publish-scheduler]', err instanceof Error ? err.message : err);
    });
  }, 30_000);

  const startupHealth = await runGlobalHealthCheck();
  if (!startupHealth.ok) {
    console.warn('[health] startup checks failed:', startupHealth.checks.filter((c) => !c.ok));
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const useFrontendDevServer = process.env.USE_FRONTEND_DEV_SERVER === 'true';

  if (process.env.NODE_ENV !== 'production' && !useFrontendDevServer) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: HMR_PORT } },
      appType: 'spa',
    });
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      return vite.middlewares(req, res, next);
    });
  } else if (process.env.NODE_ENV !== 'production' && useFrontendDevServer) {
    console.log('API-only mode — frontend dev server expected separately (npm run dev:web)');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
