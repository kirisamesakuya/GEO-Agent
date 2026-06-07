import type { PlatformStatusKind } from '../types';

const KIND_CLASS: Record<PlatformStatusKind, string> = {
  success: 'platform-status-tag--success',
  warning: 'platform-status-tag--warning',
  danger: 'platform-status-tag--danger',
  pending: 'platform-status-tag--pending',
  muted: 'platform-status-tag--muted',
};

interface Props {
  label: string;
  kind?: PlatformStatusKind;
}

export default function PlatformStatusTag({ label, kind = 'muted' }: Props) {
  return <span className={`platform-status-tag ${KIND_CLASS[kind]}`}>{label}</span>;
}
