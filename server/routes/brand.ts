import type { Express, Request, Response } from 'express';
import {
  getBrandProfile,
  updateBrandProfile,
  listBrands,
  createBrand,
  archiveBrand,
  listAccounts,
  verifyAccount,
  unbindAccount,
  bindWxAccount,
  updateAccount,
  checkBrandCompleteness,
  startAccountVerifyTask,
} from '../services/brand.service.js';
import {
  startAccountBind,
  confirmAccountBind,
  listPlatformAuthConfig,
} from '../services/account-bind.service.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { enqueueAgentTask } from '../agent/worker.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { getGateStatus } from '../services/gate.service.js';
import {
  listOrganizationMembers,
  listBrandPermissions,
  getExternalAccountLink,
  getDefaultOrganization,
} from '../services/organization.service.js';
import {
  getOrganizationCertDetail,
  submitOrganizationCertification,
} from '../services/organization-cert.service.js';

export function registerBrandRoutes(app: Express) {
  app.get('/api/organization/members', async (_req, res) => {
    res.json({ members: await listOrganizationMembers() });
  });

  app.get('/api/organization', async (_req, res) => {
    const detail = await getOrganizationCertDetail();
    if (!detail) return res.status(404).json({ error: '组织不存在' });
    res.json({ organization: detail });
  });

  app.post('/api/organization/certification/submit', async (req, res) => {
    const { legalName, uscc, contactName, contactPhone } = req.body ?? {};
    try {
      const organization = await submitOrganizationCertification({
        legalName: String(legalName ?? ''),
        uscc: String(uscc ?? ''),
        contactName: String(contactName ?? ''),
        contactPhone: String(contactPhone ?? ''),
      });
      res.json({ success: true, organization });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.get('/api/organization/brand-permissions', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json({ permissions: await listBrandPermissions(brandName) });
  });

  app.get('/api/organization/external-account', async (_req, res) => {
    res.json({ link: await getExternalAccountLink() });
  });
  app.get('/api/brands', async (_req, res) => {
    res.json({ brands: await listBrands() });
  });

  app.post('/api/brands', async (req, res) => {
    const { name, website, industry, city, ownerName } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: '请填写品牌名称' });
    try {
      const profile = await createBrand({
        name: name.trim(),
        website,
        industry,
        city,
        ownerName: typeof ownerName === 'string' ? ownerName : undefined,
      });
      res.status(201).json({ profile });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '创建失败' });
    }
  });

  app.delete('/api/brands/:id', async (req, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id) return res.status(400).json({ error: '缺少品牌 ID' });
    try {
      await archiveBrand(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.get('/api/brand-profile', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const profile = await getBrandProfile(brandName);
    if (!profile) return res.status(404).json({ error: '品牌不存在' });
    res.json(profile);
  });

  app.post('/api/brand-profile', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : req.body?.name;
    const profile = await updateBrandProfile(req.body ?? {}, brandName);
    res.json({ success: true, profile });
  });

  app.get('/api/gate/status', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const profile = await getBrandProfile(brandName);
    const name = brandName ?? profile?.name ?? '品牌';
    res.json(await getGateStatus(name));
  });

  app.get('/api/brand-profile/completeness', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const profile = await getBrandProfile(brandName);
    if (!profile) return res.json({ complete: false, missing: ['品牌资料'] });
    res.json(checkBrandCompleteness(profile));
  });

  app.post('/api/extract-brand', async (req, res) => {
    const { website, materials, brandName } = req.body ?? {};
    const hasWebsite = typeof website === 'string' && website.trim().length > 0;
    const materialList = Array.isArray(materials) ? materials : [];
    if (!hasWebsite && materialList.length === 0) {
      return res.status(400).json({ error: '请填写官网或上传参考材料' });
    }
    const label = hasWebsite
      ? String(website).trim()
      : `材料×${materialList.length}`;
    const resolvedBrandName =
      typeof brandName === 'string' && brandName.trim() ? brandName.trim() : undefined;
    const task = await createAgentTask({
      type: 'brand_extract',
      title: `品牌资料提取 · ${label}`,
      brandName: resolvedBrandName,
      input: {
        website: hasWebsite ? String(website).trim() : '',
        materials: materialList,
        sourceMaterials: materialList,
      },
      executor: await resolveExecutorKindForTask('brand_extract'),
    });
    void enqueueAgentTask(task);
    res.json({ success: true, taskId: task.id, message: '品牌提取任务已提交' });
  });

  app.get('/api/accounts', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json(await listAccounts(brandName));
  });

  /** 与 /api/accounts 同义，面向「本机发布账号」语义 */
  app.get('/api/publish-accounts', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json(await listAccounts(brandName));
  });

  const platformAuthHandler = (_req: Request, res: Response) => {
    res.json({ platforms: listPlatformAuthConfig() });
  };
  app.get('/api/platform-auth', platformAuthHandler);
  app.get('/api/accounts/platform-config', platformAuthHandler);

  app.post('/api/accounts/bind/start', async (req, res) => {
    const { platform, brandName } = req.body ?? {};
    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: '请指定平台' });
    }
    try {
      const result = await startAccountBind(platform, typeof brandName === 'string' ? brandName : undefined);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '发起授权失败' });
    }
  });

  app.post('/api/accounts/bind/confirm', async (req, res) => {
    const { accountId, bindSessionId, brandName } = req.body ?? {};
    if (!accountId || !bindSessionId) {
      return res.status(400).json({ error: '缺少 accountId 或 bindSessionId' });
    }
    try {
      const { validateAgentTaskSubmission } = await import('../services/gate.service.js');
      const name = typeof brandName === 'string' ? brandName : undefined;
      if (name) {
        const gate = await validateAgentTaskSubmission(name, 'account_verify', 5);
        if (!gate.ok) return res.status(400).json({ error: gate.error });
      }
      const result = await confirmAccountBind(
        String(accountId),
        String(bindSessionId),
        name
      );
      void enqueueAgentTask(result.task);
      res.status(201).json({ success: true, task: result.task, accounts: result.accounts });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认授权失败' });
    }
  });

  app.post('/api/accounts/verify', async (req, res) => {
    const accounts = await verifyAccount(req.body.id);
    res.json({ success: true, accounts });
  });

  app.post('/api/accounts/verify-agent', async (req, res) => {
    const { accountId, brandName } = req.body ?? {};
    if (!accountId) return res.status(400).json({ error: '缺少 accountId' });
    try {
      const { validateAgentTaskSubmission } = await import('../services/gate.service.js');
      const name = typeof brandName === 'string' ? brandName : undefined;
      if (name) {
        const gate = await validateAgentTaskSubmission(name, 'account_verify', 5);
        if (!gate.ok) return res.status(400).json({ error: gate.error });
      }
      const task = await startAccountVerifyTask(accountId, name);
      void enqueueAgentTask(task);
      res.status(201).json({ task });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '校验任务创建失败' });
    }
  });

  app.post('/api/accounts/unbind', async (req, res) => {
    const accounts = await unbindAccount(req.body.id);
    res.json({ success: true, accounts });
  });

  app.post('/api/accounts/bind-wx', async (req, res) => {
    const brandName = typeof req.body?.brandName === 'string' ? req.body.brandName : undefined;
    const accounts = await bindWxAccount(brandName);
    res.json({ success: true, accounts });
  });

  app.post('/api/accounts/update', async (req, res) => {
    const { id, ...data } = req.body ?? {};
    const accounts = await updateAccount(id, data);
    res.json({ success: true, accounts });
  });
}
