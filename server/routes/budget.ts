import type { Express } from 'express';
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
    res.json(await getBudgetAccount(req.params.brandName));
  });

  app.get('/api/budget/:brandName/ledger', async (req, res) => {
    res.json({ ledger: await listBudgetLedger(req.params.brandName) });
  });

  app.get('/api/budget/:brandName/deposit-requests', async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ requests: await listDepositRequests(req.params.brandName, status) });
  });

  app.post('/api/budget/deposit-requests', async (req, res) => {
    const { brandName, amount, note } = req.body ?? {};
    if (!brandName || !amount) return res.status(400).json({ error: '缺少参数' });
    const request = await createDepositRequest(brandName, Number(amount), note);
    res.status(201).json({ request });
  });

  app.get('/api/budget/:brandName/recharge-orders', async (req, res) => {
    res.json({ orders: await listRechargeOrders(req.params.brandName) });
  });

  app.post('/api/budget/recharge-orders', async (req, res) => {
    const { brandName, amount, note } = req.body ?? {};
    if (!brandName || !amount) return res.status(400).json({ error: '缺少品牌或金额' });
    const order = await createRechargeOrder(brandName, Number(amount), note);
    res.status(201).json({ order });
  });

  app.post('/api/budget/recharge-orders/:id/pay', async (req, res) => {
    try {
      const order = await completeRechargeOrder(req.params.id);
      res.json({ order, account: await getBudgetAccount(order.brandName) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '支付失败' });
    }
  });
}
