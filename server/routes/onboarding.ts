import type { Express } from 'express';
import {
  requireBrandName,
  requireBrandAccess,
  requirePublisherUser,
} from '../middleware/require-publisher.js';
import {
  addBrandSourceMaterial,
  createBrandSourceMaterialSignedUrl,
} from '../services/brand-source-material.service.js';
import { createBrand, getBrandProfile, updateBrandProfile } from '../services/brand.service.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { maybeEnqueueAgentTask } from '../agent/worker.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { getTaskQueueHint } from '../services/hermes-concurrency.service.js';
import { detectBrandClueInputType } from '../services/brand-source-material.service.js';
import { normalizeGeoSkillInput } from '../lib/hermes-geo-input.js';
import { ensureAgentTaskScope } from '../lib/publisher-scope.js';
import { submitFirstGeoAudit } from '../services/onboarding-first-audit.service.js';

export function registerOnboardingRoutes(app: Express) {
  app.post('/api/brand-source-materials', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    try {
      const brandName = await requireBrandName(req, res);
      if (!brandName) return;
      const { name, url, mimeType, kind } = req.body ?? {};
      if (!name || !url) {
        return res.status(400).json({ error: '缺少 name 或 url' });
      }
      const material = await addBrandSourceMaterial({
        brandName,
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
    if (!requirePublisherUser(req, res)) return;
    try {
      const brandName = await requireBrandName(req, res);
      if (!brandName) return;
      const { taskId, deviceIdHash } = req.body ?? {};
      const result = await createBrandSourceMaterialSignedUrl({
        brandName,
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
    if (!requirePublisherUser(req, res)) return;
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

      if (existingBrandName) {
        const scoped = await requireBrandAccess(req, res, String(existingBrandName));
        if (!scoped) return;
      }

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
      const queueHint = await getTaskQueueHint(extractTask);

      res.status(201).json({
        brand: brandProfile,
        extractTask,
        queueHint,
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
    if (!requirePublisherUser(req, res)) return;
    try {
      const { brandName: rawBrandName, profile, goal } = req.body ?? {};
      if (!rawBrandName || !profile) {
        return res.status(400).json({ error: '缺少 brandName 或 profile' });
      }
      const brandName = await requireBrandAccess(req, res, String(rawBrandName));
      if (!brandName) return;

      const result = await submitFirstGeoAudit({
        draftBrandName: brandName,
        profile: {
          name: String(profile.name ?? brandName),
          industry: String(profile.industry ?? ''),
          city: String(profile.city ?? ''),
          website: String(profile.website ?? ''),
          description: String(profile.description ?? ''),
          keywords: Array.isArray(profile.keywords) ? profile.keywords.map(String) : [],
          competitors: Array.isArray(profile.competitors) ? profile.competitors.map(String) : [],
          socialLink:
            typeof profile.socialLink === 'string' ? String(profile.socialLink).trim() : undefined,
          sourceMaterials: profile.sourceMaterials,
        },
        goal: goal === 'geo_audit' ? 'geo_audit' : 'geo_quick_start',
      });

      res.json({
        brand: result.brand,
        task: result.geoTask,
        queueHint: result.queueHint,
        nextStep: result.nextStep,
        workspaceBrand: result.workspaceBrand,
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  /**
   * 原子首检：创建/更新品牌 + 发起 GEO 检测（可选 brand_extract）。
   * 向导确认页首选此接口，响应含 workspaceBrand 供前端切换工作区。
   */
  app.post('/api/onboarding/first-audit', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    try {
      const { draftBrandName, profile, clue, goal, runExtract } = req.body ?? {};
      if (!profile?.name) {
        return res.status(400).json({ error: '缺少 profile.name' });
      }

      const draftKey = String(draftBrandName ?? profile.name ?? '').trim();
      if (draftKey) {
        const existing = await getBrandProfile(draftKey);
        if (existing) {
          const scoped = await requireBrandAccess(req, res, draftKey);
          if (!scoped) return;
        }
      }

      const result = await submitFirstGeoAudit({
        draftBrandName: draftKey || undefined,
        profile: {
          name: String(profile.name),
          industry: profile.industry != null ? String(profile.industry) : undefined,
          city: profile.city != null ? String(profile.city) : undefined,
          website: profile.website != null ? String(profile.website) : undefined,
          description: profile.description != null ? String(profile.description) : undefined,
          keywords: Array.isArray(profile.keywords) ? profile.keywords.map(String) : undefined,
          competitors: Array.isArray(profile.competitors)
            ? profile.competitors.map(String)
            : undefined,
          socialLink:
            typeof profile.socialLink === 'string' ? String(profile.socialLink).trim() : undefined,
          sourceMaterials: profile.sourceMaterials,
        },
        clue: clue ?? undefined,
        goal: goal === 'geo_audit' ? 'geo_audit' : 'geo_quick_start',
        runExtract: Boolean(runExtract),
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '首检发起失败' });
    }
  });

  app.get('/api/onboarding/tasks/:id', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    const task = await ensureAgentTaskScope(req, res, req.params.id);
    if (!task) return;
    res.json({ task });
  });
}
