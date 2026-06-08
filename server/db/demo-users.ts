import { prisma } from './client.js';

const DEMO_USERS_KEY = 'demo_users_v';
const DEMO_USERS_VERSION = '2';

const PLATFORM_STAFF = [
  { phone: '13800002001', displayName: '运营 A', role: 'ops' },
  { phone: '13800002002', displayName: '审核 B', role: 'reviewer' },
  { phone: '13800002003', displayName: '客服 C', role: 'support' },
  { phone: '13800002004', displayName: '平台管理员', role: 'admin' },
] as const;

/** 发布端注册演示用户 */
const PUBLISHER_USERS = [
  {
    id: 'publisher-demo',
    phone: '13800001001',
    displayName: '云杉负责人',
    accountType: 'enterprise' as const,
    status: 'active' as const,
    orgName: '云杉医疗集团',
    certStatus: 'approved' as const,
    memberRole: 'owner' as const,
    createdDaysAgo: 90,
  },
  {
    phone: '13800001003',
    displayName: '瑞美负责人',
    accountType: 'personal' as const,
    status: 'active' as const,
    orgName: '瑞美齿科集团有限公司',
    certStatus: 'pending' as const,
    memberRole: 'owner' as const,
    createdDaysAgo: 14,
  },
  {
    phone: '13800003001',
    displayName: '刘小微',
    accountType: 'personal' as const,
    status: 'active' as const,
    createdDaysAgo: 2,
    note: '新注册，尚未创建组织',
  },
  {
    phone: '13800003002',
    displayName: '赵明',
    accountType: 'personal' as const,
    status: 'active' as const,
    orgName: '橙果营销策划',
    certStatus: 'pending' as const,
    memberRole: 'owner' as const,
    createdDaysAgo: 7,
    note: '已提交企业认证，待平台审核',
  },
  {
    phone: '13800003003',
    displayName: '孙悦',
    accountType: 'personal' as const,
    status: 'frozen' as const,
    orgName: '悦读文化工作室',
    certStatus: 'rejected' as const,
    memberRole: 'owner' as const,
    createdDaysAgo: 30,
    note: '认证驳回且账号冻结',
  },
] as const;

/** 接单端注册演示用户 */
const PROVIDER_USERS = [
  {
    id: 'provider-demo',
    phone: '13800001111',
    displayName: '张晨',
    status: 'active' as const,
    providerName: '晨光传媒',
    createdDaysAgo: 60,
  },
  {
    phone: '13800002222',
    displayName: '李蓝',
    status: 'active' as const,
    providerName: '蓝海内容',
    createdDaysAgo: 45,
  },
  {
    phone: '13800003301',
    displayName: '王北辰',
    status: 'active' as const,
    providerName: '北辰工作室',
    createdDaysAgo: 10,
  },
  {
    phone: '13800003302',
    displayName: '陈浩',
    status: 'active' as const,
    providerName: '浩行传播',
    createdDaysAgo: 5,
    note: '新注册，入驻待审核',
  },
  {
    phone: '13800003303',
    displayName: '周婷',
    status: 'frozen' as const,
    providerName: '晨光传媒',
    createdDaysAgo: 20,
    note: '关联主体已入驻，账号冻结演示',
  },
] as const;

async function upsertPublisherUsers() {
  for (const spec of PUBLISHER_USERS) {
    const createdAt = new Date(Date.now() - spec.createdDaysAgo * 86400000);
    const user = await prisma.user.upsert({
      where: spec.id ? { id: spec.id } : { phone: spec.phone },
      create: {
        ...(spec.id ? { id: spec.id } : {}),
        phone: spec.phone,
        displayName: spec.displayName,
        accountType: spec.accountType,
        status: spec.status,
        createdAt,
      },
      update: {
        phone: spec.phone,
        displayName: spec.displayName,
        accountType: spec.accountType,
        status: spec.status,
      },
    });

    if ('orgName' in spec && spec.orgName) {
      let org = await prisma.organization.findFirst({ where: { name: spec.orgName } });
      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: spec.orgName,
            certStatus: spec.certStatus ?? 'uncertified',
            legalName: spec.certStatus === 'pending' || spec.certStatus === 'approved'
              ? `${spec.orgName}`
              : undefined,
            uscc: spec.certStatus === 'pending' ? '91320000MA1K8DEMO1' : undefined,
            contactName: spec.displayName,
            contactPhone: spec.phone,
            certSubmittedAt: spec.certStatus === 'pending' ? new Date(Date.now() - 2 * 86400000) : undefined,
            certReviewedAt: spec.certStatus === 'approved' ? new Date(Date.now() - 7 * 86400000) : undefined,
            certRejectReason: spec.certStatus === 'rejected' ? '主体资质材料不完整' : undefined,
          },
        });
      } else if (spec.certStatus) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            certStatus: spec.certStatus,
            contactName: spec.displayName,
            contactPhone: spec.phone,
            certSubmittedAt: spec.certStatus === 'pending' ? new Date(Date.now() - 2 * 86400000) : org.certSubmittedAt,
            certReviewedAt: spec.certStatus === 'approved' ? new Date(Date.now() - 7 * 86400000) : org.certReviewedAt,
            certRejectReason: spec.certStatus === 'rejected' ? '主体资质材料不完整' : null,
          },
        });
      }

      await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
        create: {
          organizationId: org.id,
          userId: user.id,
          displayName: spec.displayName,
          role: spec.memberRole ?? 'owner',
        },
        update: { displayName: spec.displayName, role: spec.memberRole ?? 'owner' },
      });
    }
  }
}

async function upsertProviderUsers() {
  const appStatusByProvider: Record<string, string> = {
    晨光传媒: 'approved',
    蓝海内容: 'submitted',
    北辰工作室: 'draft',
    浩行传播: 'submitted',
  };

  for (const spec of PROVIDER_USERS) {
    const createdAt = new Date(Date.now() - spec.createdDaysAgo * 86400000);
    const user = await prisma.user.upsert({
      where: spec.id ? { id: spec.id } : { phone: spec.phone },
      create: {
        ...(spec.id ? { id: spec.id } : {}),
        phone: spec.phone,
        displayName: spec.displayName,
        accountType: 'personal',
        status: spec.status,
        createdAt,
      },
      update: {
        phone: spec.phone,
        displayName: spec.displayName,
        status: spec.status,
      },
    });

    let provider = await prisma.provider.findFirst({ where: { name: spec.providerName } });
    if (!provider && spec.providerName === '浩行传播') {
      provider = await prisma.provider.create({
        data: {
          name: '浩行传播',
          type: '内容写手',
          capabilities: JSON.stringify(['公众号', '知乎']),
          status: 'active',
          applicationStatus: 'submitted',
          contactName: spec.displayName,
          phone: spec.phone,
          serviceTypes: JSON.stringify(['软文', '问答']),
          platforms: JSON.stringify(['公众号', '知乎']),
        },
      });
    }
    if (provider) {
      const targetStatus = appStatusByProvider[spec.providerName];
      if (targetStatus && provider.applicationStatus !== targetStatus) {
        await prisma.provider.update({
          where: { id: provider.id },
          data: { applicationStatus: targetStatus, contactName: spec.displayName, phone: spec.phone },
        });
      }
      await prisma.providerUser.upsert({
        where: { providerId_userId: { providerId: provider.id, userId: user.id } },
        create: { providerId: provider.id, userId: user.id, role: 'owner' },
        update: {},
      });
    }
  }
}

async function seedLoginLogs() {
  const targets = await prisma.user.findMany({
    where: {
      phone: { in: [...PUBLISHER_USERS.map((u) => u.phone), ...PROVIDER_USERS.map((u) => u.phone)] },
    },
  });
  for (const user of targets) {
    const phone = user.phone!;
    const existingLogs = await prisma.loginLog.count({ where: { userId: user.id } });
    if (existingLogs >= 2) continue;
    const base = user.createdAt.getTime();
    await prisma.loginLog.createMany({
      data: [
        { userId: user.id, phone, result: 'success', ip: '117.136.0.1', createdAt: new Date(base + 3600000) },
        {
          userId: user.id,
          phone,
          result: 'failed',
          reason: '验证码错误',
          ip: '117.136.0.1',
          createdAt: new Date(base + 7200000),
        },
        {
          userId: user.id,
          phone,
          result: 'success',
          ip: '192.168.1.22',
          createdAt: new Date(Date.now() - 86400000),
        },
      ],
    });
  }
}

export async function ensureDemoUsers(): Promise<void> {
  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_USERS_KEY } });
  if (marker?.value === DEMO_USERS_VERSION) return;

  const yunshanOrg = await prisma.organization.findFirst({ where: { name: '云杉医疗集团' } });
  if (yunshanOrg) {
    await prisma.organization.update({
      where: { id: yunshanOrg.id },
      data: {
        certStatus: 'approved',
        legalName: '云杉医疗科技（南京）有限公司',
        uscc: '91320100MA1K8YUNSH',
        contactName: '云杉负责人',
        contactPhone: '13800001001',
        certReviewedAt: new Date(Date.now() - 7 * 86400000),
      },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: yunshanOrg.id, userId: { not: 'publisher-demo' } },
    });
    await prisma.brandMemberPermission.deleteMany({
      where: { brand: { organizationId: yunshanOrg.id } },
    });
  }

  await upsertPublisherUsers();
  await upsertProviderUsers();

  for (const staff of PLATFORM_STAFF) {
    const user = await prisma.user.upsert({
      where: { phone: staff.phone },
      create: { phone: staff.phone, displayName: staff.displayName, status: 'active' },
      update: { displayName: staff.displayName, status: 'active' },
    });
    await prisma.platformUserRole.upsert({
      where: { userId_role: { userId: user.id, role: staff.role } },
      create: { userId: user.id, role: staff.role },
      update: {},
    });
  }

  await prisma.user.upsert({
    where: { id: 'platform-demo' },
    create: {
      id: 'platform-demo',
      phone: '13800002999',
      displayName: 'Demo 平台用户',
      status: 'active',
    },
    update: { displayName: 'Demo 平台用户', status: 'active' },
  });
  await prisma.platformUserRole.upsert({
    where: { userId_role: { userId: 'platform-demo', role: 'admin' } },
    create: { userId: 'platform-demo', role: 'admin' },
    update: {},
  });

  await seedLoginLogs();

  await prisma.systemConfig.upsert({
    where: { key: DEMO_USERS_KEY },
    create: { key: DEMO_USERS_KEY, value: DEMO_USERS_VERSION },
    update: { value: DEMO_USERS_VERSION },
  });
}
