import type { Express } from 'express';
import { requireBrandName, requireBrandNameParam } from '../middleware/require-publisher.js';
import { listPlatformAuthConfig } from '../services/account-bind.service.js';
import {
  confirmAccountBind,
  startAccountBind,
} from '../services/account-bind.service.js';
import { startAccountVerifyTask, unbindAccount } from '../services/brand.service.js';
import { enqueueAgentTask } from '../agent/worker.js';
import {
  createAdAccount,
  createAdAccountAssignment,
  deleteAdAccountAssignment,
  disableAdAccount,
  getAdAccountAuthBindingId,
  listAdAccountAssignments,
  listAdAccountUsageLogs,
  listAdAccounts,
  listAvailableAdAccountsForBrand,
  updateAdAccount,
  updateAdAccountAssignment,
} from '../services/ad-account.service.js';
import { prisma } from '../db/client.js';

export function registerAdAccountRoutes(app: Express) {
  app.get('/api/ad-accounts', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const authStatus = typeof req.query.authStatus === 'string' ? req.query.authStatus : undefined;
    const ownerType = typeof req.query.ownerType === 'string' ? req.query.ownerType : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json(await listAdAccounts({ brandName, platform, authStatus, ownerType, q }));
  });

  app.post('/api/ad-accounts', async (req, res) => {
    try {
      const body = req.body ?? {};
      const brandName = await requireBrandName(req, res);
      if (!brandName) return;
      const { findBrandRow } = await import('../services/brand.service.js');
      const brand = brandName ? await findBrandRow(brandName) : null;
      const account = await createAdAccount({
        platform: String(body.platform ?? ''),
        accountName: String(body.accountName ?? ''),
        ownerType: String(body.ownerType ?? 'brand'),
        ownerId: String(body.ownerId ?? brand?.id ?? ''),
        ownerName: String(body.ownerName ?? brand?.name ?? ''),
        authMethod: body.authMethod ? String(body.authMethod) : undefined,
        brandNameForAssignment: brandName,
      });
      res.status(201).json(account);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '创建失败' });
    }
  });

  app.patch('/api/ad-accounts/:id', async (req, res) => {
    try {
      const account = await updateAdAccount(req.params.id, req.body ?? {});
      res.json(account);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.post('/api/ad-accounts/:id/disable', async (req, res) => {
    try {
      res.json(await disableAdAccount(req.params.id));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '停用失败' });
    }
  });

  app.get('/api/ad-accounts/usage-logs', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    res.json(await listAdAccountUsageLogs({ brandName, accountId, limit: 100 }));
  });

  app.get('/api/ad-accounts/:id/logs', async (req, res) => {
    res.json(await listAdAccountUsageLogs({ accountId: req.params.id, limit: 50 }));
  });

  app.get('/api/ad-accounts/platform-config', (_req, res) => {
    res.json({ platforms: listPlatformAuthConfig() });
  });

  app.post('/api/ad-accounts/:id/auth/start', async (req, res) => {
    try {
      const bindingId = await getAdAccountAuthBindingId(req.params.id);
      const ad = await prisma.adAccount.findUnique({ where: { id: req.params.id } });
      const brandName = typeof req.body?.brandName === 'string' ? req.body.brandName : ad?.ownerName;
      const result = await startAccountBind(ad!.platform, brandName);
      res.json({ success: true, ...result, adAccountId: req.params.id });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '发起登录确认失败' });
    }
  });

  app.post('/api/ad-accounts/:id/auth/confirm', async (req, res) => {
    const { bindSessionId, brandName } = req.body ?? {};
    if (!bindSessionId) return res.status(400).json({ error: '缺少 bindSessionId' });
    try {
      const bindingId = await getAdAccountAuthBindingId(req.params.id);
      const name = typeof brandName === 'string' ? brandName : undefined;
      const result = await confirmAccountBind(String(bindingId), String(bindSessionId), name);
      res.json({ success: true, accounts: result.accounts });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认本机登录失败' });
    }
  });

  app.post('/api/ad-accounts/:id/auth/verify', async (req, res) => {
    try {
      const bindingId = await getAdAccountAuthBindingId(req.params.id);
      const brandName = typeof req.body?.brandName === 'string' ? req.body.brandName : undefined;
      if (brandName) {
        const { validateAgentTaskSubmission } = await import('../services/gate.service.js');
        const gate = await validateAgentTaskSubmission(brandName, 'account_verify', 5);
        if (!gate.ok) return res.status(400).json({ error: gate.error });
      }
      const task = await startAccountVerifyTask(bindingId, brandName);
      void enqueueAgentTask(task);
      res.status(201).json({ task });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '校验任务创建失败' });
    }
  });

  app.post('/api/ad-accounts/:id/auth/revoke', async (req, res) => {
    try {
      const bindingId = await getAdAccountAuthBindingId(req.params.id);
      const accounts = await unbindAccount(bindingId);
      const { syncAdAccountAfterBindingVerify } = await import('../services/ad-account.service.js');
      await syncAdAccountAfterBindingVerify(bindingId);
      res.json({ success: true, accounts });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '解绑失败' });
    }
  });

  app.get('/api/ad-account-assignments', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    res.json(await listAdAccountAssignments({ brandName, accountId }));
  });

  app.post('/api/ad-account-assignments', async (req, res) => {
    try {
      const body = req.body ?? {};
      const row = await createAdAccountAssignment({
        accountId: String(body.accountId),
        targetType: String(body.targetType ?? 'brand'),
        targetId: String(body.targetId),
        targetName: body.targetName ? String(body.targetName) : undefined,
        role: body.role ? String(body.role) : undefined,
        isDefault: Boolean(body.isDefault),
      });
      res.status(201).json(row);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '分配失败' });
    }
  });

  app.patch('/api/ad-account-assignments/:id', async (req, res) => {
    try {
      await updateAdAccountAssignment(req.params.id, req.body ?? {});
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.delete('/api/ad-account-assignments/:id', async (req, res) => {
    try {
      await deleteAdAccountAssignment(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.get('/api/brands/:brandId/available-ad-accounts', async (req, res) => {
    const brandId = req.params.brandId;
    const brandNameQuery = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    let brandName = brandNameQuery;
    if (!brandName) {
      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      brandName = brand?.name;
    }
    if (!brandName) return res.status(404).json({ error: '品牌不存在' });
    res.json(await listAvailableAdAccountsForBrand(brandName));
  });

  app.get('/api/brands/by-name/:brandName/available-ad-accounts', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    res.json(await listAvailableAdAccountsForBrand(brandName));
  });

  app.get('/api/brands/by-name/:brandName/available-publish-accounts', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    res.json(await listAvailableAdAccountsForBrand(brandName));
  });
}
