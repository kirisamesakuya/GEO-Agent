import type { Express } from 'express';
import { getPublisherDashboard } from '../services/publisher-dashboard.service.js';
import {
  countUnreadPublisherNotifications,
  listPublisherNotifications,
  markAllPublisherNotificationsRead,
  markPublisherNotificationRead,
} from '../services/notification.service.js';

export function registerPublisherRoutes(app: Express) {
  app.get('/api/publisher/dashboard', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const data = await getPublisherDashboard(brandName);
    if (!data) return res.status(404).json({ error: '品牌不存在' });
    res.json(data);
  });

  app.get('/api/notifications', async (req, res) => {
    const brandName = String(req.query.brandName ?? '').trim();
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
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
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    const brandName = String(req.body?.brandName ?? '').trim();
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
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

  app.post('/api/notifications/read-all', async (req, res) => {
    const brandName = String(req.body?.brandName ?? '').trim();
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    res.json(await markAllPublisherNotificationsRead(brandName));
  });
}
