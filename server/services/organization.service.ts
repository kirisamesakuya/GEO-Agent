import { prisma } from '../db/client.js';

export async function getDefaultOrganization() {
  return prisma.organization.findFirst({ include: { externalLinks: true } });
}

export async function listOrganizationMembers() {
  const org = await getDefaultOrganization();
  if (!org) return [];
  return prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listBrandPermissions(brandName?: string) {
  if (!brandName) {
    return prisma.brandMemberPermission.findMany({
      include: { brand: { select: { name: true } } },
      take: 50,
    });
  }
  const brand = await prisma.brand.findFirst({ where: { name: brandName } });
  if (!brand) return [];
  return prisma.brandMemberPermission.findMany({
    where: { brandId: brand.id },
    include: { brand: { select: { name: true } } },
  });
}

export async function getExternalAccountLink() {
  const org = await getDefaultOrganization();
  if (!org) return null;
  return prisma.externalAccountLink.findFirst({
    where: { organizationId: org.id },
    orderBy: { linkedAt: 'desc' },
  });
}

export function isAllBrandsScope(brandName: string) {
  return brandName === '__all__';
}
