import type { Express } from 'express';
import { resolveExecutorKind, resolveExecutorKindForTask } from '../agent/executors/index.js';
import {
  createHermesBindToken,
  getHermesExtendedHealth,
  getHermesSkillsManifest,
  mockConfirmHermesBinding,
} from '../services/hermes-binding.service.js';

export function registerHermesRoutes(app: Express) {
  app.get('/api/hermes/health', async (_req, res) => {
    const health = await getHermesExtendedHealth();
    res.json({
      ...health,
      executorDefault: resolveExecutorKind(),
      executorForPublish: await resolveExecutorKindForTask('hermes_publish'),
      executorForGeoAudit: await resolveExecutorKindForTask('geo_audit'),
      commit: process.env.HERMES_AGENT_COMMIT ?? null,
    });
  });

  app.get('/api/hermes/skills', async (_req, res) => {
    res.json(await getHermesSkillsManifest());
  });

  app.post('/api/hermes/bind-token', async (_req, res) => {
    res.json(await createHermesBindToken());
  });

  /** 连调前演示：模拟客户端完成绑定 */
  app.post('/api/hermes/bind-confirm', async (req, res) => {
    const deviceName = typeof req.body?.deviceName === 'string' ? req.body.deviceName : 'Windows-PC';
    res.json({ binding: await mockConfirmHermesBinding(deviceName) });
  });
}
