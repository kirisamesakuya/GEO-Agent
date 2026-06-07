import { prisma } from '../db/client.js';

export async function createPublisherNotification(input: {
  brandName: string;
  type: string;
  title: string;
  body: string;
  refId?: string;
  actionView?: string;
}) {
  const brandName = input.brandName.trim();
  if (!brandName) return null;
  return prisma.publisherNotification.create({
    data: {
      brandName,
      type: input.type,
      title: input.title,
      body: input.body,
      refId: input.refId ?? null,
      actionView: input.actionView ?? null,
    },
  });
}

export async function listPublisherNotifications(
  brandName: string,
  opts?: { unreadOnly?: boolean; limit?: number }
) {
  const name = brandName.trim();
  if (!name) return [];
  return prisma.publisherNotification.findMany({
    where: {
      brandName: name,
      ...(opts?.unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
  });
}

export async function countUnreadPublisherNotifications(brandName: string) {
  const name = brandName.trim();
  if (!name) return 0;
  return prisma.publisherNotification.count({
    where: { brandName: name, read: false },
  });
}

export async function markPublisherNotificationRead(id: string, brandName: string) {
  const row = await prisma.publisherNotification.findFirst({
    where: { id, brandName: brandName.trim() },
  });
  if (!row) throw new Error('通知不存在');
  return prisma.publisherNotification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllPublisherNotificationsRead(brandName: string) {
  const name = brandName.trim();
  if (!name) return { success: true };
  await prisma.publisherNotification.updateMany({
    where: { brandName: name, read: false },
    data: { read: true },
  });
  return { success: true };
}

export async function createProviderNotification(input: {
  providerId: string;
  type: string;
  title: string;
  body: string;
  refId?: string;
}) {
  return prisma.providerNotification.create({ data: input });
}

export async function listProviderNotifications(providerId: string, unreadOnly = false) {
  return prisma.providerNotification.findMany({
    where: { providerId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function countUnreadNotifications(providerId: string) {
  return prisma.providerNotification.count({
    where: { providerId, read: false },
  });
}

export async function markNotificationRead(id: string, providerId: string) {
  const row = await prisma.providerNotification.findFirst({ where: { id, providerId } });
  if (!row) throw new Error('通知不存在');
  return prisma.providerNotification.update({ where: { id }, data: { read: true } });
}

export async function markAllNotificationsRead(providerId: string) {
  await prisma.providerNotification.updateMany({
    where: { providerId, read: false },
    data: { read: true },
  });
  return { success: true };
}
