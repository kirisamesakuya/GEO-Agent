import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { getDefaultOrganization } from './organization.service.js';

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

export async function getOrganizationCertDetail(): Promise<OrganizationCertDto | null> {
  const org = await getDefaultOrganization();
  if (!org) return null;
  const row = await prisma.organization.findUnique({ where: { id: org.id } });
  if (!row) return null;
  return mapOrg(row);
}

export async function submitOrganizationCertification(input: {
  legalName: string;
  uscc: string;
  contactName: string;
  contactPhone: string;
}) {
  const org = await getDefaultOrganization();
  if (!org) throw new Error('组织不存在');

  const current = await prisma.organization.findUnique({ where: { id: org.id } });
  if (!current) throw new Error('组织不存在');

  if (current.certStatus === 'pending') {
    throw new Error('认证审核中，请等待平台处理');
  }
  if (current.certStatus === 'approved') {
    throw new Error('组织已完成认证，无需重复提交');
  }

  const legalName = input.legalName.trim();
  const uscc = input.uscc.trim().toUpperCase();
  const contactName = input.contactName.trim();
  const contactPhone = input.contactPhone.trim();

  if (!legalName) throw new Error('请填写企业/主体名称');
  if (!/^[0-9A-Z]{18}$/.test(uscc)) throw new Error('请填写 18 位统一社会信用代码');
  if (!contactName) throw new Error('请填写联系人');
  if (!/^1\d{10}$/.test(contactPhone)) throw new Error('请填写有效联系人手机号');

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      name: legalName,
      legalName,
      uscc,
      contactName,
      contactPhone,
      certStatus: 'pending',
      certSubmittedAt: new Date(),
      certRejectReason: null,
      certReviewedAt: null,
    },
  });

  await appendAuditLog({
    action: 'org_cert_submit',
    entity: 'Organization',
    entityId: org.id,
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

  await appendAuditLog({
    action: `org_cert_${action}`,
    entity: 'Organization',
    entityId: organizationId,
    detail: note,
  });

  return mapOrg(updated);
}
