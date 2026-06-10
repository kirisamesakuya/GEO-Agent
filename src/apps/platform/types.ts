export type PlatformView =
  | 'dashboard'
  | 'merchants'
  | 'org_certs'
  | 'content_governance'
  | 'ranking_ops'
  | 'agents'
  | 'hermes'
  | 'orders'
  | 'website'
  | 'providers'
  | 'provider_identity'
  | 'resource_review'
  | 'fulfillment_rating'
  | 'funds'
  | 'publisher_accounts'
  | 'publisher_deposits'
  | 'provider_accounts'
  | 'provider_settlement'
  | 'provider_withdrawals'
  | 'roles'
  | 'platform_members'
  | 'role_permissions'
  | 'menu_admin'
  | 'media_platforms'
  | 'monitor_platforms'
  | 'custom_publish_platforms'
  | 'publisher_users'
  | 'provider_users'
  | 'configs'
  | 'audit'
  | 'reports';

export type PlatformStatusKind = 'success' | 'warning' | 'danger' | 'pending' | 'muted';

export interface PlatformNavItem {
  id: PlatformView;
  label: string;
}

export interface PlatformNavGroup {
  id: string;
  label: string;
  items: PlatformNavItem[];
}
