import {
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  BarChart3,
  Bell,
  FileText,
  Home,
  Menu,
  ShieldAlert,
  Star,
  Store,
  UserCog,
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
  applications: ClipboardList,
  website: FileText,
  risk_center: ShieldAlert,
  providers: Users,
  resource_review: Users,
  fulfillment_rating: Star,
  funds: Wallet,
  settlement: Wallet,
  roles: UserCog,
  notifications: Bell,
  configs: Menu,
  audit: CreditCard,
  reports: BarChart3,
};

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    id: 'workbench',
    label: '工作台',
    items: [
      { id: 'dashboard', label: '平台驾驶舱' },
      { id: 'reports', label: '运营报表与导出' },
    ],
  },
  {
    id: 'merchant',
    label: '商家运营',
    items: [
      { id: 'merchants', label: '商家/品牌管理' },
      { id: 'org_certs', label: '组织认证审核' },
    ],
  },
  {
    id: 'publish',
    label: '发布治理',
    items: [
      { id: 'content_governance', label: '内容与发布监管' },
      { id: 'ranking_ops', label: '排名监控运营' },
    ],
  },
  {
    id: 'agent',
    label: 'Agent 与自动化',
    items: [
      { id: 'agents', label: 'Agent 监控' },
      { id: 'hermes', label: 'Hermes/自动化' },
    ],
  },
  {
    id: 'order',
    label: '订单履约',
    items: [
      { id: 'orders', label: '订单监管' },
      { id: 'applications', label: '接单申请' },
      { id: 'website', label: '网站需求/订单' },
      { id: 'risk_center', label: '风险与争议中心' },
    ],
  },
  {
    id: 'provider',
    label: '接单方管理',
    items: [
      { id: 'providers', label: '接单方管理' },
      // 本期隐藏，见 platform-feature-flags.ts
      { id: 'resource_review', label: '可接单平台审核' },
      { id: 'fulfillment_rating', label: '履约评级中心' },
    ],
  },
  {
    id: 'funds',
    label: '资金结算',
    items: [
      { id: 'funds', label: '资金算力' },
      { id: 'settlement', label: '结算审核' },
    ],
  },
  {
    id: 'system',
    label: '系统治理',
    items: [
      { id: 'notifications', label: '消息通知中心' },
      { id: 'roles', label: '角色与成员权限' },
      { id: 'configs', label: '系统配置' },
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
  reports: '运营报表与导出',
  'funds.adjust': '资金调整',
  'funds.deposit': '入账审核',
  'merchant.disable': '商家停用',
  'config.write': '配置写入',
  'orders.assign': '订单派单',
  'orders.reassign': '订单改派',
  'settlement.write': '结算操作',
  'agent.review': 'Agent 人工审核',
};
