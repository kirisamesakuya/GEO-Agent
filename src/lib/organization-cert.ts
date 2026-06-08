export type OrgCertStatus = 'uncertified' | 'pending' | 'approved' | 'rejected';

export interface OrganizationCert {
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

export const ORG_CERT_STATUS_LABEL: Record<OrgCertStatus, string> = {
  uncertified: '未认证',
  pending: '审核中',
  approved: '已认证',
  rejected: '未通过',
};

export const ORG_CERT_STATUS_CLASS: Record<OrgCertStatus, string> = {
  uncertified: 'bg-orange-50 text-orange-700 border-orange-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-teal-700 border-teal-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export type AccountType = 'personal' | 'enterprise';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  personal: '个人用户',
  enterprise: '企业用户',
};

export const ACCOUNT_TYPE_CLASS: Record<AccountType, string> = {
  personal: 'bg-slate-50 text-slate-600 border-slate-200',
  enterprise: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};
