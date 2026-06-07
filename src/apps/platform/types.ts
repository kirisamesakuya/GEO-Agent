export type PlatformView =
  | 'dashboard'
  | 'merchants'
  | 'org_certs'
  | 'content_governance'
  | 'ranking_ops'
  | 'agents'
  | 'hermes'
  | 'orders'
  | 'applications'
  | 'website'
  | 'risk_center'
  | 'providers'
  | 'resource_review'
  | 'fulfillment_rating'
  | 'funds'
  | 'settlement'
  | 'roles'
  | 'notifications'
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
