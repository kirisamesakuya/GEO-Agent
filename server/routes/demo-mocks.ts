import type { Express } from 'express';
import {
  getSkillMockCatalog,
  getSkillMockPreview,
  mockOutputForTaskType,
} from '../mocks/skill-mock-registry.js';
import { isGeoSkillMockDemoMode } from '../lib/agent-status.js';

export function registerDemoMockRoutes(app: Express) {
  /** 全量 Skill Mock 目录（入参示例 + 说明） */
  app.get('/api/demo/skill-samples', (_req, res) => {
    res.json({
      demoMode: isGeoSkillMockDemoMode(),
      mockGateHint:
        'GEO Hermes 类任务：payload 含 userConfirmedExecution:true，或设置 GEO_SKILL_MOCK_DEMO=true',
      items: getSkillMockCatalog(),
    });
  });

  /** 单个 taskType 的入参 + Mock 出参预览 */
  app.get('/api/demo/skill-samples/:taskType', (req, res) => {
    const taskType = String(req.params.taskType);
    const preview = getSkillMockPreview(taskType);
    if (!preview) {
      return res.status(404).json({ error: '未知 taskType', taskType });
    }
    res.json(preview);
  });

  /** 按需生成 Mock 输出（可覆盖入参字段） */
  app.post('/api/demo/skill-samples/:taskType/mock', (req, res) => {
    const taskType = String(req.params.taskType);
    try {
      const output = mockOutputForTaskType(taskType, req.body ?? {});
      res.json({ taskType, output });
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成 Mock 失败';
      res.status(400).json({ error: message, taskType });
    }
  });
}
