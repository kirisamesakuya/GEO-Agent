import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import { getPublisherDashboard } from '../services/publisher-dashboard.service.js';
import {
  countUnreadPublisherNotifications,
  listPublisherNotifications,
  markAllPublisherNotificationsRead,
  markPublisherNotificationRead,
} from '../services/notification.service.js';

async function listPublisherNotificationsHandler(
  req: import('express').Request,
  res: import('express').Response
) {
  const brandName = await requireBrandName(req, res);
  if (!brandName) return;
  const unreadOnly = req.query.unreadOnly === 'true';
  const [notifications, unreadCount] = await Promise.all([
    listPublisherNotifications(brandName, { unreadOnly }),
    countUnreadPublisherNotifications(brandName),
  ]);
  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      brandName: n.brandName,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      refId: n.refId,
      actionView: n.actionView,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

export function registerPublisherRoutes(app: Express) {
  app.get('/api/publisher/dashboard', async (req, res) => {
    try {
      const brandName = await requireBrandName(req, res);
      if (!brandName) return;
      const data = await getPublisherDashboard(brandName);
      if (!data) return res.status(404).json({ error: '品牌不存在' });
      res.json(data);
    } catch (err) {
      console.error('[publisher/dashboard]', err);
      res.status(500).json({ error: '工作台数据加载失败' });
    }
  });

  app.get('/api/publisher/notifications', listPublisherNotificationsHandler);
  app.get('/api/notifications', listPublisherNotificationsHandler);

  app.post('/api/publisher/notifications/:id/read', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    try {
      const row = await markPublisherNotificationRead(req.params.id, brandName);
      res.json({
        notification: {
          ...row,
          createdAt: row.createdAt.toISOString(),
        },
      });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : '标记失败' });
    }
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    try {
      const row = await markPublisherNotificationRead(req.params.id, brandName);
      res.json({
        notification: {
          ...row,
          createdAt: row.createdAt.toISOString(),
        },
      });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : '标记失败' });
    }
  });

  app.post('/api/publisher/notifications/read-all', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json(await markAllPublisherNotificationsRead(brandName));
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json(await markAllPublisherNotificationsRead(brandName));
  });
}
