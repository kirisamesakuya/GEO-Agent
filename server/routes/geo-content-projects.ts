import type { Express } from 'express';
import {
  createGeoContentProject,
  getGeoContentProject,
  listGeoContentProjects,
} from '../services/geo-content-project.service.js';

export function registerGeoContentProjectRoutes(app: Express) {
  app.get('/api/geo-content-projects', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    res.json({ projects: await listGeoContentProjects(brandName) });
  });

  app.get('/api/geo-content-projects/:id', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const project = await getGeoContentProject(req.params.id, brandName);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    res.json({ project });
  });

  app.post('/api/geo-content-projects', async (req, res) => {
    const {
      brandName,
      name,
      sourceType,
      sourceRef,
      targetQuestions,
      targetKeywords,
      targetAiPlatforms,
      targetPublishPlatforms,
    } = req.body ?? {};
    if (!brandName || !name) return res.status(400).json({ error: '缺少 brandName 或 name' });
    try {
      const project = await createGeoContentProject({
        brandName,
        name,
        sourceType,
        sourceRef,
        targetQuestions,
        targetKeywords,
        targetAiPlatforms,
        targetPublishPlatforms,
      });
      res.status(201).json({ project });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '创建失败' });
    }
  });
}
