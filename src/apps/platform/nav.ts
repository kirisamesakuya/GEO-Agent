import {

  Bot,

  BriefcaseBusiness,

  CreditCard,

  BarChart3,

  FileText,

  Home,

  Menu,

  ShieldAlert,

  Star,

  Store,

  UserCog,

  UserPlus,

  Users,

  Wallet,

  type LucideIcon,

} from 'lucide-react';

import type { PlatformNavGroup, PlatformView } from './types';



export const PLATFORM_NAV_ICONS: Record<PlatformView, LucideIcon> = {

  dashboard: Home,

  merchants: Store,

  org_certs: ShieldAlert,

  content_governance: FileText,

  ranking_ops: BarChart3,

  agents: Bot,

  hermes: BriefcaseBusiness,

  orders: FileText,

  website: FileText,

  providers: Users,

  resource_review: Users,

  fulfillment_rating: Star,

  funds: Wallet,

  publisher_accounts: Wallet,

  publisher_deposits: CreditCard,

  provider_accounts: Wallet,

  provider_settlement: BarChart3,

  provider_withdrawals: CreditCard,

  roles: UserCog,

  platform_members: Users,

  role_permissions: UserCog,

  menu_admin: Menu,

  publisher_users: UserPlus,

  provider_users: UserPlus,

  configs: Menu,

  audit: CreditCard,

  reports: BarChart3,

};



/** 侧栏权限键：部分菜单项复用 users 权限 */

export function platformNavPermission(view: PlatformView): string {

  if (view === 'publisher_users' || view === 'provider_users') return 'users';

  if (view === 'platform_members' || view === 'role_permissions' || view === 'menu_admin' || view === 'roles') {
    return 'roles';
  }

  if (
    view === 'publisher_accounts' ||
    view === 'publisher_deposits' ||
    view === 'provider_accounts' ||
    view === 'provider_settlement' ||
    view === 'provider_withdrawals' ||
    view === 'funds'
  ) {
    return 'funds';
  }

  return view;

}



export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [

  {

    id: 'overview',

    label: '运营总览',

    items: [

      { id: 'dashboard', label: '平台驾驶舱' },

      // 本期隐藏，见 platform-feature-flags.ts（reports）
      { id: 'reports', label: '运营报表' },

    ],

  },

  {

    id: 'publisher',

    label: '发布端（商家）',

    items: [

      { id: 'publisher_users', label: '注册用户' },

      { id: 'merchants', label: '品牌与商家' },

      { id: 'org_certs', label: '企业认证审核' },

      { id: 'content_governance', label: '内容与发布' },

      { id: 'ranking_ops', label: 'GEO监控' },

    ],

  },

  {

    id: 'provider',

    label: '接单端',

    items: [

      { id: 'provider_users', label: '注册用户' },

      { id: 'providers', label: '接单方主体' },

      // 本期隐藏，见 platform-feature-flags.ts

      { id: 'resource_review', label: '可接单平台审核' },

      { id: 'fulfillment_rating', label: '履约评级' },

    ],

  },

  {

    id: 'order',

    label: '订单履约',

    items: [

      { id: 'orders', label: '订单监管' },

      { id: 'website', label: '网站需求/订单' },

    ],

  },

  {

    id: 'agent',

    label: 'Agent 中枢',

    items: [

      { id: 'agents', label: 'Agent 监控' },

      { id: 'hermes', label: 'Hermes/自动化' },

    ],

  },

  {

    id: 'finance',

    label: '资金财务',

    items: [
      { id: 'publisher_accounts', label: '发布端账户余额' },
      { id: 'publisher_deposits', label: '发布端入账审核' },
      { id: 'provider_accounts', label: '接单端账户余额' },
      { id: 'provider_settlement', label: '接单端订单结算' },
      { id: 'provider_withdrawals', label: '接单端提现管理' },
    ],

  },

  {

    id: 'system',

    label: '系统管理',

    items: [

      { id: 'platform_members', label: '平台成员' },

      { id: 'role_permissions', label: '角色与权限' },

      { id: 'menu_admin', label: '后台菜单' },

      { id: 'audit', label: '审计日志' },

    ],

  },

];



export const PLATFORM_VIEW_LABELS: Record<PlatformView, string> = Object.fromEntries(

  PLATFORM_NAV_GROUPS.flatMap((g) => g.items.map((item) => [item.id, item.label]))

) as Record<PlatformView, string>;



export const PLATFORM_PERMISSION_LABELS: Record<string, string> = {

  '*': '全部权限',

  ...PLATFORM_VIEW_LABELS,

  publisher_users: '发布端注册用户',

  provider_users: '接单端注册用户',

  reports: '运营报表与导出',

  'funds.adjust': '资金调整',

  'funds.deposit': '入账/提现审核',

  users: '用户与账户',

  'merchant.disable': '商家停用',

  'config.write': '配置写入',

  'orders.assign': '订单派单',

  'orders.reassign': '订单改派/释放',

  'settlement.write': '结算操作',

  'agent.review': 'Agent 人工审核',

  platform_members: '平台成员',

  role_permissions: '角色与权限',

  menu_admin: '后台菜单',

  configs: '系统配置（技术）',

};


