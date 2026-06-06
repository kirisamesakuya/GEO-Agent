import type { Express } from 'express';
import {
  confirmHermesLocalBinding,
  recordHermesHeartbeat,
  recordTokenCapacityStatus,
  pullNextHermesTask,
  reportHermesTaskProgress,
  reportHermesTaskResult,
  reportHermesTaskArtifacts,
} from '../services/hermes-local.service.js';

export function registerHermesLocalRoutes(app: Express) {
  app.post('/api/hermes-local/bind-confirm', async (req, res) => {
    try {
      const { bindToken, deviceName, hermesVersion, geoSkillsVersion } = req.body ?? {};
      if (!bindToken || !deviceName) {
        return res.status(400).json({ error: '缺少 bindToken 或 deviceName' });
      }
      const result = await confirmHermesLocalBinding({
        bindToken: String(bindToken),
        deviceName: String(deviceName),
        hermesVersion: hermesVersion ? String(hermesVersion) : undefined,
        geoSkillsVersion: geoSkillsVersion ? String(geoSkillsVersion) : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '绑定失败' });
    }
  });

  app.post('/api/hermes-local/heartbeat', async (req, res) => {
    try {
      const { deviceIdHash, deviceName, hermesVersion, geoSkillsVersion, skills } = req.body ?? {};
      if (!deviceIdHash) return res.status(400).json({ error: '缺少 deviceIdHash' });
      const result = await recordHermesHeartbeat({
        deviceIdHash: String(deviceIdHash),
        deviceName: deviceName ? String(deviceName) : undefined,
        hermesVersion: hermesVersion ? String(hermesVersion) : undefined,
        geoSkillsVersion: geoSkillsVersion ? String(geoSkillsVersion) : undefined,
        skills: Array.isArray(skills) ? skills : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '心跳上报失败' });
    }
  });

  app.post('/api/hermes-local/token-capacity/status', async (req, res) => {
    try {
      const {
        deviceIdHash,
        tokenCapacityStatus,
        modelRuntimeStatus,
        provider,
        ciyuanLoginStatus,
        ciyuanBalance,
        ciyuanBalanceUnit,
        syncStatus,
        errorCode,
        errorMessage,
      } = req.body ?? {};
      if (!deviceIdHash || !tokenCapacityStatus || !modelRuntimeStatus) {
        return res.status(400).json({ error: '缺少必要字段' });
      }
      const result = await recordTokenCapacityStatus({
        deviceIdHash: String(deviceIdHash),
        tokenCapacityStatus: String(tokenCapacityStatus),
        modelRuntimeStatus: String(modelRuntimeStatus),
        provider: provider ? String(provider) : undefined,
        ciyuanLoginStatus: ciyuanLoginStatus ? String(ciyuanLoginStatus) : undefined,
        ciyuanBalance: ciyuanBalance != null ? Number(ciyuanBalance) : undefined,
        ciyuanBalanceUnit: ciyuanBalanceUnit ? String(ciyuanBalanceUnit) : undefined,
        syncStatus: syncStatus ? String(syncStatus) : undefined,
        errorCode: errorCode != null ? String(errorCode) : null,
        errorMessage: errorMessage != null ? String(errorMessage) : null,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '状态上报失败' });
    }
  });

  app.get('/api/hermes-local/tasks/next', async (req, res) => {
    try {
      const deviceIdHash = typeof req.query.deviceIdHash === 'string' ? req.query.deviceIdHash : '';
      if (!deviceIdHash) return res.status(400).json({ error: '缺少 deviceIdHash' });
      const result = await pullNextHermesTask(deviceIdHash);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '拉取任务失败' });
    }
  });

  app.post('/api/hermes-local/tasks/:id/progress', async (req, res) => {
    try {
      const { deviceIdHash, progress, step, logMessage } = req.body ?? {};
      if (!deviceIdHash) return res.status(400).json({ error: '缺少 deviceIdHash' });
      const result = await reportHermesTaskProgress(req.params.id, String(deviceIdHash), {
        progress: Number(progress ?? 0),
        step: step ? String(step) : undefined,
        logMessage: logMessage ? String(logMessage) : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '进度上报失败' });
    }
  });

  app.post('/api/hermes-local/tasks/:id/result', async (req, res) => {
    try {
      const { deviceIdHash, status, progress, output, errorMessage, userErrorMessage, summary } =
        req.body ?? {};
      if (!deviceIdHash || !status) {
        return res.status(400).json({ error: '缺少 deviceIdHash 或 status' });
      }
      const result = await reportHermesTaskResult(req.params.id, String(deviceIdHash), {
        status,
        progress: progress != null ? Number(progress) : undefined,
        output: output && typeof output === 'object' ? output : undefined,
        errorMessage: errorMessage ? String(errorMessage) : undefined,
        userErrorMessage: userErrorMessage ? String(userErrorMessage) : undefined,
        summary: summary ? String(summary) : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '结果回传失败' });
    }
  });

  app.post('/api/hermes-local/tasks/:id/artifacts', async (req, res) => {
    try {
      const { deviceIdHash, artifacts } = req.body ?? {};
      if (!deviceIdHash || !Array.isArray(artifacts)) {
        return res.status(400).json({ error: '缺少 deviceIdHash 或 artifacts' });
      }
      const result = await reportHermesTaskArtifacts(
        req.params.id,
        String(deviceIdHash),
        artifacts
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Artifact 回传失败' });
    }
  });
}
