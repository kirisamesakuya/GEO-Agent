import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import { ensureGeoReportScope } from '../lib/publisher-scope.js';
import {
  confirmGeoAuditAction,
  getGeoAudit,
  listGeoActionConfirmations,
  listGeoAuditArtifacts,
  setGeoReportBaseline,
} from '../services/geo-audit.service.js';
import { buildGeoReportSnapshot } from '../lib/geo-report-snapshot.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { maybeEnqueueAgentTask } from '../agent/worker.js';

export function registerGeoAuditRoutes(app: Express) {
  app.get('/api/geo-audits/:id', async (req, res) => {
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
    const audit = await getGeoAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: '审计报告不存在' });
    res.json({ audit });
  });

  app.get('/api/geo-audits/:id/artifacts', async (req, res) => {
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
    const data = await listGeoAuditArtifacts(req.params.id);
    if (!data) return res.status(404).json({ error: '审计报告不存在' });
    res.json(data);
  });

  app.post('/api/geo-audits/:id/confirm-action', async (req, res) => {
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
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
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
    const rows = await listGeoActionConfirmations(req.params.id);
    res.json({ confirmations: rows });
  });

  app.post('/api/geo-audits/:id/baseline', async (req, res) => {
    const report = await ensureGeoReportScope(req, res, req.params.id);
    if (!report) return;
    const audit = await getGeoAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: '审计报告不存在' });
    const row = await setGeoReportBaseline(req.params.id, audit.brandName);
    res.json({ report: row });
  });

  app.get('/api/geo-audits/:id/snapshot', async (req, res) => {
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
    const snapshot = await buildGeoReportSnapshot(req.params.id);
    if (!snapshot) return res.status(404).json({ error: '审计报告不存在' });
    res.json({ snapshot });
  });

  app.post('/api/geo-audits/compare', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { baselineReportId, currentReportId } = req.body ?? {};
    if (!baselineReportId || !currentReportId) {
      return res.status(400).json({ error: '缺少 baselineReportId 或 currentReportId' });
    }
    if (baselineReportId === currentReportId) {
      return res.status(400).json({ error: '基线报告与当前报告不能相同' });
    }

    const [baselineReport, currentReport] = await Promise.all([
      buildGeoReportSnapshot(String(baselineReportId)),
      buildGeoReportSnapshot(String(currentReportId)),
    ]);
    if (!baselineReport || !currentReport) {
      return res.status(404).json({ error: '基线或当前报告不存在' });
    }
    if (baselineReport.brandName !== currentReport.brandName) {
      return res.status(400).json({ error: '两份报告须属于同一品牌' });
    }
    if (baselineReport.brandName !== brandName) {
      return res.status(403).json({ error: '无权访问该品牌报告' });
    }

    const task = await createAgentTask({
      type: 'geo_compare',
      title: `${brandName} · GEO 月度对比`,
      brandName,
      input: {
        brandUrl: req.body?.brandUrl,
        brandName,
        baselineReportId: String(baselineReportId),
        currentReportId: String(currentReportId),
        baselineReport,
        currentReport,
        outputContract: { format: 'json', version: 'geoWebOutput.v1' },
      },
    });
    maybeEnqueueAgentTask(task);
    res.status(201).json({ task, baselineReport, currentReport });
  });
}
