import type { Express } from 'express';
import { requireBrandName, requireBrandNameParam } from '../middleware/require-publisher.js';
import {
  getBudgetAccount,
  listBudgetLedger,
  createDepositRequest,
  listDepositRequests,
  createRechargeOrder,
  completeRechargeOrder,
  listRechargeOrders,
} from '../services/budget.service.js';

export function registerBudgetRoutes(app: Express) {
  app.get('/api/budget/:brandName', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    res.json(await getBudgetAccount(brandName));
  });

  app.get('/api/budget/:brandName/ledger', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    res.json({ ledger: await listBudgetLedger(brandName) });
  });

  app.get('/api/budget/:brandName/deposit-requests', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ requests: await listDepositRequests(brandName, status) });
  });

  app.post('/api/budget/deposit-requests', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { amount, note } = req.body ?? {};
    if (!amount) return res.status(400).json({ error: '缺少参数' });
    const request = await createDepositRequest(brandName, Number(amount), note);
    res.status(201).json({ request });
  });

  app.get('/api/budget/:brandName/recharge-orders', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    res.json({ orders: await listRechargeOrders(brandName) });
  });

  app.post('/api/budget/recharge-orders', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { amount, note } = req.body ?? {};
    if (!amount) return res.status(400).json({ error: '缺少金额' });
    const order = await createRechargeOrder(brandName, Number(amount), note);
    res.status(201).json({ order });
  });

  app.post('/api/budget/recharge-orders/:id/pay', async (req, res) => {
    try {
      const order = await completeRechargeOrder(req.params.id);
      const brandName = await requireBrandNameParam(req, res, order.brandName);
      if (!brandName) return;
      res.json({ order, account: await getBudgetAccount(brandName) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '支付失败' });
    }
  });
}
