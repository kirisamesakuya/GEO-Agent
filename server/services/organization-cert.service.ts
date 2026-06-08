import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';

export type OrgCertStatus = 'uncertified' | 'pending' | 'approved' | 'rejected';

export interface OrganizationCertDto {
  id: string;
  name: string;
  certStatus: OrgCertStatus;
  legalName: string | null;
  uscc: string | null;
  contactName: string | null;
  contactPhone: string | null;
  certSubmittedAt: string | null;
  certReviewedAt: string | null;
  certRejectReason: string | null;
}

function mapOrg(row: {
  id: string;
  name: string;
  certStatus: string;
  legalName: string | null;
  uscc: string | null;
  contactName: string | null;
  contactPhone: string | null;
  certSubmittedAt: Date | null;
  certReviewedAt: Date | null;
  certRejectReason: string | null;
}): OrganizationCertDto {
  return {
    id: row.id,
    name: row.name,
    certStatus: row.certStatus as OrgCertStatus,
    legalName: row.legalName,
    uscc: row.uscc,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    certSubmittedAt: row.certSubmittedAt?.toISOString() ?? null,
    certReviewedAt: row.certReviewedAt?.toISOString() ?? null,
    certRejectReason: row.certRejectReason,
  };
}

async function findOrganizationForUser(userId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  });
  return member?.organization ?? null;
}

export async function getOrganizationCertDetail(userId: string): Promise<OrganizationCertDto | null> {
  const org = await findOrganizationForUser(userId);
  if (!org) return null;
  return mapOrg(org);
}

export async function getOrganizationCertContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true },
  });
  const organization = await getOrganizationCertDetail(userId);
  return {
    accountType: user?.accountType ?? 'personal',
    organization,
  };
}

export async function submitOrganizationCertification(
  userId: string,
  input: {
    legalName: string;
    uscc?: string;
    contactName?: string;
    contactPhone?: string;
  }
) {
  let org = await findOrganizationForUser(userId);

  if (!org) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    org = await prisma.organization.create({
      data: {
        name: input.legalName.trim(),
        certStatus: 'uncertified',
      },
    });
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId,
        displayName: user?.displayName ?? input.contactName.trim(),
        role: 'owner',
      },
    });
  }

  const current = await prisma.organization.findUnique({ where: { id: org.id } });
  if (!current) throw new Error('组织不存在');

  if (current.certStatus === 'pending') {
    throw new Error('认证审核中，请等待平台处理');
  }
  if (current.certStatus === 'approved') {
    throw new Error('组织已完成认证，无需重复提交');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, phone: true },
  });

  const legalName = input.legalName.trim();
  const usccRaw = input.uscc?.trim().toUpperCase() ?? '';
  const uscc = usccRaw ? usccRaw : null;
  const contactName = (input.contactName?.trim() || user?.displayName || '').trim();
  const contactPhone = (input.contactPhone?.trim() || user?.phone || '').trim();

  if (!legalName) throw new Error('请填写企业/主体名称');
  if (uscc && !/^[0-9A-Z]{18}$/.test(uscc)) throw new Error('统一社会信用代码格式不正确');

  const updated = await prisma.organization.update({
    where: { id: current.id },
    data: {
      name: legalName,
      legalName,
      uscc,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      certStatus: 'pending',
      certSubmittedAt: new Date(),
      certRejectReason: null,
      certReviewedAt: null,
    },
  });

  await appendAuditLog({
    action: 'org_cert_submit',
    entity: 'Organization',
    entityId: current.id,
    detail: legalName,
  });

  return mapOrg(updated);
}

export async function listOrganizationCertificationsForPlatform(status = 'pending') {
  return prisma.organization.findMany({
    where: { certStatus: status },
    orderBy: { certSubmittedAt: 'asc' },
  });
}

export async function reviewOrganizationCertification(
  organizationId: string,
  action: 'approve' | 'reject',
  note?: string
) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error('组织不存在');
  if (org.certStatus !== 'pending') {
    throw new Error('该组织不在待审核状态');
  }

  const certStatus = action === 'approve' ? 'approved' : 'rejected';
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      certStatus,
      certReviewedAt: new Date(),
      certRejectReason: action === 'reject' ? (note?.trim() || '未通过平台审核') : null,
    },
  });

  if (action === 'approve') {
    const owner = await prisma.organizationMember.findFirst({
      where: { organizationId, role: 'owner' },
    });
    if (owner) {
      await prisma.user.updateMany({
        where: { id: owner.userId },
        data: { accountType: 'enterprise' },
      });
    }
  }

  await appendAuditLog({
    action: `org_cert_${action}`,
    entity: 'Organization',
    entityId: organizationId,
    detail: note,
  });

  return mapOrg(updated);
}
