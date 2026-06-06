import type { Express } from 'express';
import {
  confirmGeoAuditAction,
  getGeoAudit,
  listGeoActionConfirmations,
  listGeoAuditArtifacts,
  setGeoReportBaseline,
} from '../services/geo-audit.service.js';

export function registerGeoAuditRoutes(app: Express) {
  app.get('/api/geo-audits/:id', async (req, res) => {
    const audit = await getGeoAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: '审计报告不存在' });
    res.json({ audit });
  });

  app.get('/api/geo-audits/:id/artifacts', async (req, res) => {
    const data = await listGeoAuditArtifacts(req.params.id);
    if (!data) return res.status(404).json({ error: '审计报告不存在' });
    res.json(data);
  });

  app.post('/api/geo-audits/:id/confirm-action', async (req, res) => {
    const { actionType, riskLevel, payload, confirmedBy } = req.body ?? {};
    if (!actionType || !riskLevel) {
      return res.status(400).json({ error: '缺少 actionType 或 riskLevel' });
    }
    try {
      const confirmation = await confirmGeoAuditAction(req.params.id, {
        actionType,
        riskLevel,
        payload,
        confirmedBy,
      });
      res.json({ confirmation });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  app.get('/api/geo-audits/:id/confirmations', async (req, res) => {
    const rows = await listGeoActionConfirmations(req.params.id);
    res.json({ confirmations: rows });
  });

  app.post('/api/geo-audits/:id/baseline', async (req, res) => {
    const audit = await getGeoAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: '审计报告不存在' });
    const row = await setGeoReportBaseline(req.params.id, audit.brandName);
    res.json({ report: row });
  });
}
