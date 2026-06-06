import type { Express } from 'express';
import {
  addBrandSourceMaterial,
  createBrandSourceMaterialSignedUrl,
} from '../services/brand-source-material.service.js';
import { createBrand, getBrandProfile, updateBrandProfile } from '../services/brand.service.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { maybeEnqueueAgentTask } from '../agent/worker.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { detectBrandClueInputType } from '../services/brand-source-material.service.js';
import { normalizeGeoSkillInput } from '../lib/hermes-geo-input.js';

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
        brandUrl: bodyBrandUrl,
        website: bodyWebsite,
        websiteUrl: bodyWebsiteUrl,
        socialLink: bodySocialLink,
        description: bodyDescription,
        files,
        goal,
      } = req.body ?? {};

      const brandUrl = String(bodyBrandUrl ?? bodyWebsite ?? bodyWebsiteUrl ?? '').trim();
      const socialLink = String(bodySocialLink ?? '').trim();
      const description = String(bodyDescription ?? '').trim();
      const clueText = typeof text === 'string' ? text.trim() : '';
      const detectedType =
        inputType ??
        (brandUrl
          ? 'website_url'
          : socialLink
            ? 'social_link'
            : description
              ? 'description'
              : clueText
                ? detectBrandClueInputType(clueText)
                : 'brand_name');

      let brandProfile = existingBrandName
        ? await getBrandProfile(String(existingBrandName))
        : null;

      if (!brandProfile) {
        const nameFromClue =
          detectedType === 'brand_name'
            ? clueText
            : brandUrl
              ? new URL(brandUrl).hostname.replace(/^www\./, '')
              : clueText.slice(0, 20) || '新品牌';
        brandProfile = await createBrand({
          name: nameFromClue,
          website: brandUrl,
        });
        if (description) {
          brandProfile = await updateBrandProfile(
            { name: brandProfile.name, description },
            brandProfile.name
          );
        }
      } else if (brandUrl || socialLink || description) {
        brandProfile = await updateBrandProfile(
          {
            name: brandProfile.name,
            industry: brandProfile.industry,
            city: brandProfile.city,
            website: brandUrl || brandProfile.website,
            description: description || brandProfile.description,
            keywords: brandProfile.keywords,
            competitors: brandProfile.competitors,
            forbiddenWords: brandProfile.forbiddenWords,
            sourceMaterials: brandProfile.sourceMaterials,
          },
          brandProfile.name
        );
      }

      const sourceMaterials = Array.isArray(files) ? files : [];
      const clue = {
        brandUrl: brandUrl || undefined,
        website: brandUrl || undefined,
        websiteUrl: brandUrl || undefined,
        socialLink: socialLink || undefined,
        description: description || undefined,
      };

      const extractTask = await createAgentTask({
        type: 'brand_extract',
        title: `${brandProfile.name} · 品牌资料整理`,
        brandName: brandProfile.name,
        executor: await resolveExecutorKindForTask('brand_extract'),
        input: normalizeGeoSkillInput(
          'brand_extract',
          {
            brandName: brandProfile.name,
            inputType: detectedType,
            text: clueText || brandUrl || socialLink || description,
            brandUrl: brandUrl || undefined,
            brandDesc: description || brandProfile.description,
            socialLink: socialLink || undefined,
            sourceMaterials,
            outputContract: { format: 'json', requiredFields: ['profile'] },
          },
          brandProfile.name
        ),
      });
      maybeEnqueueAgentTask(extractTask);

      res.status(201).json({
        brand: brandProfile,
        extractTask,
        goal: goal ?? 'geo_quick_start',
        clue,
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

      const socialLink =
        typeof profile.socialLink === 'string' ? String(profile.socialLink).trim() : '';

      const task = await createAgentTask({
        type: taskType,
        title: taskTitle,
        brandName: updated.name,
        executor: await resolveExecutorKindForTask(taskType),
        input: normalizeGeoSkillInput(
          taskType,
          {
            brandName: updated.name,
            brandCity: updated.city,
            industry: updated.industry,
            productNames: updated.keywords,
            competitors: updated.competitors,
            brandUrl: updated.website,
            socialLink: socialLink || undefined,
            brandDesc: updated.description,
            sourceMaterials: [
              ...(updated.website
                ? [{ kind: 'link', name: '官网 URL', value: updated.website }]
                : []),
              ...(updated.sourceMaterials ?? []),
            ],
            platforms: ['DeepSeek', '豆包', 'Kimi'],
          },
          updated.name
        ),
      });
      maybeEnqueueAgentTask(task);

      res.json({ brand: updated, task, nextStep: 'onboarding_console' });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });
}
