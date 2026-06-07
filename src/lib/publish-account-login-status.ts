/** 将 AccountBinding.status 映射为本机「登录状态」展示（非平台 API 授权） */
export type LoginStatusKey =
  | 'unknown'
  | 'logged_in'
  | 'logged_out'
  | 'expired'
  | 'check_failed'
  | 'checking';

export const PUBLISH_ACCOUNT_SECTION_TITLE = '本机发布登录确认';

export const PUBLISH_ACCOUNT_SECTION_DESC =
  '仅用于自动发布到官方平台与数据回传。请在本机浏览器登录平台后台后手动确认，由 Hermes 检查登录态；与 Hermes 设备绑定无关。';

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
      return { key: 'check_failed', label: '登录已失效', tagClass: 'geo-tag-danger' };
    case '待确认':
      return { key: 'unknown', label: '待确认', tagClass: 'geo-tag-warning' };
    case '待授权':
    default:
      return { key: 'logged_out', label: '未确认', tagClass: 'geo-tag-warning' };
  }
}

export function publishAccountStatusLabel(bindingStatus: string): string {
  return bindingToLoginStatus(bindingStatus).label;
}

export function publishAccountActionLabels(bindingStatus: string): {
  openLogin: string;
  confirmLogin: string;
  recheck: string;
  retry: string;
} {
  const { key } = bindingToLoginStatus(bindingStatus);
  if (key === 'logged_in') {
    return {
      openLogin: '打开平台登录页',
      confirmLogin: '让 Hermes 检查登录状态',
      recheck: '让 Hermes 检查登录状态',
      retry: '重新确认登录',
    };
  }
  if (key === 'check_failed') {
    return {
      openLogin: '打开平台登录页',
      confirmLogin: '我已在本机浏览器登录',
      recheck: '让 Hermes 检查登录状态',
      retry: '重新确认登录',
    };
  }
  return {
    openLogin: '打开平台登录页',
    confirmLogin: '我已在本机浏览器登录',
    recheck: '让 Hermes 检查登录状态',
    retry: '重新确认登录',
  };
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
