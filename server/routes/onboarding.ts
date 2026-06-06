import type { Express } from 'express';
import {
  addBrandSourceMaterial,
  createBrandSourceMaterialSignedUrl,
} from '../services/brand-source-material.service.js';
import { createBrand, getBrandProfile } from '../services/brand.service.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { detectBrandClueInputType } from '../services/brand-source-material.service.js';

export function registerOnboardingRoutes(app: Express) {
  app.post('/api/brand-source-materials', async (req, res) => {
    try {
      const { brandName, name, url, mimeType, kind } = req.body ?? {};
      if (!brandName || !name || !url) {
        return res.status(400).json({ error: '缺少 brandName、name 或 url' });
      }
      const material = await addBrandSourceMaterial({
        brandName: String(brandName),
        name: String(name),
        url: String(url),
        mimeType: mimeType ? String(mimeType) : undefined,
        kind,
      });
      res.status(201).json({ material });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '上传失败' });
    }
  });

  app.post('/api/brand-source-materials/:id/signed-url', async (req, res) => {
    try {
      const { brandName, taskId, deviceIdHash } = req.body ?? {};
      if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
      const result = await createBrandSourceMaterialSignedUrl({
        brandName: String(brandName),
        materialId: req.params.id,
        taskId: taskId ? String(taskId) : undefined,
        deviceIdHash: deviceIdHash ? String(deviceIdHash) : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '签名 URL 生成失败' });
    }
  });

  /** 首启：从任意品牌线索创建品牌草稿 + 资料整理任务 */
  app.post('/api/onboarding/start', async (req, res) => {
    try {
      const {
        brandName: existingBrandName,
        text,
        inputType,
        files,
        goal,
      } = req.body ?? {};

      let brandProfile = existingBrandName
        ? await getBrandProfile(String(existingBrandName))
        : null;

      const clueText = typeof text === 'string' ? text.trim() : '';
      const detectedType = inputType ?? (clueText ? detectBrandClueInputType(clueText) : 'brand_name');

      if (!brandProfile) {
        const nameFromClue =
          detectedType === 'brand_name'
            ? clueText
            : detectedType === 'website_url'
              ? new URL(clueText).hostname.replace(/^www\./, '')
              : clueText.slice(0, 20) || '新品牌';
        brandProfile = await createBrand({
          name: nameFromClue,
          website: detectedType === 'website_url' ? clueText : '',
        });
      }

      const sourceMaterials = Array.isArray(files) ? files : [];
      const extractTask = await createAgentTask({
        type: 'brand_extract',
        title: `${brandProfile.name} · 品牌资料整理`,
        brandName: brandProfile.name,
        executor: await resolveExecutorKindForTask('brand_extract'),
        input: {
          brandName: brandProfile.name,
          inputType: detectedType,
          text: clueText,
          website: detectedType === 'website_url' ? clueText : brandProfile.website,
          description: detectedType === 'description' ? clueText : brandProfile.description,
          socialLink: detectedType === 'social_link' ? clueText : undefined,
          sourceMaterials,
          outputContract: { format: 'json', requiredFields: ['profile'] },
        },
      });

      res.status(201).json({
        brand: brandProfile,
        extractTask,
        goal: goal ?? 'geo_quick_start',
        nextStep: 'brand_confirm',
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '启动失败' });
    }
  });

  /** 确认品牌资料并创建首次检测任务 */
  app.post('/api/onboarding/confirm-brand', async (req, res) => {
    try {
      const { brandName, profile, goal } = req.body ?? {};
      if (!brandName || !profile) {
        return res.status(400).json({ error: '缺少 brandName 或 profile' });
      }

      const { updateBrandProfile } = await import('../services/brand.service.js');
      const updated = await updateBrandProfile(
        {
          name: String(profile.name ?? brandName),
          industry: String(profile.industry ?? ''),
          city: String(profile.city ?? ''),
          website: String(profile.website ?? ''),
          description: String(profile.description ?? ''),
          keywords: Array.isArray(profile.keywords) ? profile.keywords.map(String) : [],
          competitors: Array.isArray(profile.competitors) ? profile.competitors.map(String) : [],
          sourceMaterials: profile.sourceMaterials,
        },
        String(brandName)
      );

      const taskType = goal === 'geo_audit' ? 'geo_audit' : 'geo_quick_start';
      const taskTitle =
        taskType === 'geo_audit'
          ? `${updated.name} · GEO 专业审计`
          : `${updated.name} · AI 可见度快速体检`;

      const task = await createAgentTask({
        type: taskType,
        title: taskTitle,
        brandName: updated.name,
        executor: await resolveExecutorKindForTask(taskType),
        input: {
          brandName: updated.name,
          city: updated.city,
          industry: updated.industry,
          services: updated.keywords,
          competitors: updated.competitors,
          website: updated.website,
          description: updated.description,
          sourceMaterials: updated.sourceMaterials ?? [],
          platforms: ['DeepSeek', '豆包', 'Kimi'],
        },
      });

      res.json({ brand: updated, task, nextStep: 'onboarding_console' });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });
}
