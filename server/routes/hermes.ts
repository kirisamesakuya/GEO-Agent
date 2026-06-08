import type { Express } from 'express';
import { requireBrandName, requirePublisherUser } from '../middleware/require-publisher.js';
import { resolveExecutorKind, resolveExecutorKindForTask } from '../agent/executors/index.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';
import { getGeoCapabilities } from '../lib/geo-capabilities.js';
import {
  createHermesBindToken,
  getHermesExtendedHealth,
  getHermesSkillsManifest,
} from '../services/hermes-binding.service.js';
import { getHermesDownloadInfo, getOnboardingStatus } from '../services/onboarding.service.js';
import { getTokenCapacityState } from '../services/hermes-local.service.js';
import {
  getGeoApprovalPolicy,
  setGeoApprovalPolicy,
} from '../services/hermes-approval.service.js';
import {
  getHermesSyncStatus,
  mockConfirmHermesLoginSync,
} from '../services/hermes-sync.service.js';
import {
  getHermesCapacitySnapshot,
  getHermesConcurrencySettings,
  updateHermesConcurrencySettings,
  type HermesConcurrencyMode,
} from '../services/hermes-concurrency.service.js';

export function registerHermesRoutes(app: Express) {
  app.get('/api/hermes/download-info', async (_req, res) => {
    res.json(await getHermesDownloadInfo());
  });

  app.get('/api/hermes/onboarding-status', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json(await getOnboardingStatus(brandName));
  });

  /**
   * DEMO_ONLY:
   * Hermes 健康与能力探测接口，供商家端/Hermes 连调展示。
   *
   * PRODUCTION_TODO:
   * 生产环境应限制为已登录商家或已绑定设备，并避免泄露本机路径等敏感信息。
   */
  app.get('/api/hermes/health', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    const health = await getHermesExtendedHealth();
    const tokenCapacity = await getTokenCapacityState();
    const capacity = await getHermesCapacitySnapshot();
    const concurrencySettings = await getHermesConcurrencySettings();
    res.json({
      ...health,
      tokenCapacity,
      capacity,
      concurrencySettings,
      executorDefault: resolveExecutorKind(),
      executorForPublish: await resolveExecutorKindForTask('hermes_publish'),
      executorForGeoAudit: await resolveExecutorKindForTask('geo_audit'),
      commit: process.env.HERMES_AGENT_COMMIT ?? null,
    });
  });

  app.put('/api/hermes/concurrency-settings', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    try {
      const { mode, desktopProtectionEnabled, publishSerialEnabled } = req.body ?? {};
      const validModes = new Set<HermesConcurrencyMode>([
        'conservative',
        'balanced',
        'accelerated',
        'do_not_disturb',
      ]);
      const capacity = await updateHermesConcurrencySettings({
        mode:
          typeof mode === 'string' && validModes.has(mode as HermesConcurrencyMode)
            ? (mode as HermesConcurrencyMode)
            : undefined,
        desktopProtectionEnabled:
          typeof desktopProtectionEnabled === 'boolean'
            ? desktopProtectionEnabled
            : undefined,
        publishSerialEnabled:
          typeof publishSerialEnabled === 'boolean' ? publishSerialEnabled : undefined,
      });
      res.json({ capacity });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存失败' });
    }
  });

  app.get('/api/hermes/skills', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    res.json(await getHermesSkillsManifest());
  });

  app.get('/api/hermes/geo-capabilities', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    const health = await checkHermesHealth();
    res.json(await getGeoCapabilities(health));
  });

  app.post('/api/hermes/bind-token', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    res.json(await createHermesBindToken());
  });

  /** PRODUCTION_TODO: 替换为 Hermes 客户端登录后的真实 sync-session 回调/轮询 */
  app.get('/api/hermes/sync-status', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    res.json(await getHermesSyncStatus());
  });

  app.post('/api/hermes/sync/confirm-login', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    try {
      const deviceName = typeof req.body?.deviceName === 'string' ? req.body.deviceName : undefined;
      res.json(await mockConfirmHermesLoginSync({ deviceName }));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '同步失败' });
    }
  });

  app.get('/api/hermes/approval-policy', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    res.json(await getGeoApprovalPolicy());
  });

  app.put('/api/hermes/approval-policy', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    const skipApprovalForGeo = Boolean(req.body?.skipApprovalForGeo);
    res.json(await setGeoApprovalPolicy({ skipApprovalForGeo }));
  });
}
