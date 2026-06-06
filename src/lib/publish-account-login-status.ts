/** 将 AccountBinding.status 映射为本机「登录状态」展示（见本机发布账号管理迭代计划） */
export type LoginStatusKey =
  | 'unknown'
  | 'logged_in'
  | 'logged_out'
  | 'expired'
  | 'check_failed'
  | 'checking';

export function bindingToLoginStatus(bindingStatus: string): {
  key: LoginStatusKey;
  label: string;
  tagClass: string;
} {
  switch (bindingStatus) {
    case '已授权':
    case '正常':
      return { key: 'logged_in', label: '可发布', tagClass: 'geo-tag-success' };
    case '授权中':
      return { key: 'checking', label: '检测中', tagClass: 'geo-tag-info' };
    case '校验失败':
      return { key: 'check_failed', label: '检测失败', tagClass: 'geo-tag-danger' };
    case '待确认':
      return { key: 'unknown', label: '待确认', tagClass: 'geo-tag-warning' };
    default:
      return { key: 'logged_out', label: '未登录', tagClass: 'geo-tag-warning' };
  }
}

export function isPublishReady(bindingStatus: string): boolean {
  return bindingStatus === '已授权' || bindingStatus === '正常';
}

const PROVIDER_LABEL: Record<string, string> = {
  brand: '品牌方',
  sub_brand: '子品牌',
  brand_group: '集团',
  service_provider: '服务商',
  organization: '内部运营',
};

export function providerLabel(ownerType?: string): string {
  if (!ownerType) return '品牌方';
  return PROVIDER_LABEL[ownerType] ?? ownerType;
}
