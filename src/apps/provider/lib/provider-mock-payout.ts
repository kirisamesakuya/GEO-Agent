import {
  maskIdCardNumber,
  validateProviderIdentityInput,
} from '../../../../lib/provider-identity';
import type { PayoutChannel } from './provider-ui';

export interface MockProviderIdentity {
  verified: boolean;
  realName: string;
  idNumberMask: string;
}

export interface MockProviderPayoutAccount {
  payoutChannel: PayoutChannel;
  payoutAccountName: string;
  payoutAccountDetail: string;
  payoutAccountLabel: string;
}

interface MockProviderPayoutStore {
  identity?: MockProviderIdentity;
  payout?: MockProviderPayoutAccount;
}

function storageKey(providerId: string) {
  return `provider_mock_payout_${providerId}`;
}

function readStore(providerId: string): MockProviderPayoutStore {
  try {
    const raw = localStorage.getItem(storageKey(providerId));
    if (!raw) return {};
    return JSON.parse(raw) as MockProviderPayoutStore;
  } catch {
    return {};
  }
}

function writeStore(providerId: string, store: MockProviderPayoutStore) {
  localStorage.setItem(storageKey(providerId), JSON.stringify(store));
}

export function loadMockProviderIdentity(providerId: string): MockProviderIdentity | null {
  const store = readStore(providerId);
  return store.identity?.verified ? store.identity : null;
}

export function loadMockProviderPayoutAccount(providerId: string): MockProviderPayoutAccount | null {
  const store = readStore(providerId);
  return store.payout ?? null;
}

export function applyMockProviderIdentity(
  providerId: string,
  input: { realName: string; idNumber: string }
): { ok: true; identity: MockProviderIdentity } | { ok: false; error: string } {
  const parsed = validateProviderIdentityInput(input);
  if (!parsed.ok) return parsed;

  const identity: MockProviderIdentity = {
    verified: true,
    realName: parsed.realName,
    idNumberMask: maskIdCardNumber(parsed.idNumber),
  };
  const store = readStore(providerId);
  writeStore(providerId, { ...store, identity });
  return { ok: true, identity };
}

export function applyMockProviderPayoutAccount(
  providerId: string,
  input: MockProviderPayoutAccount
): MockProviderPayoutAccount {
  const store = readStore(providerId);
  writeStore(providerId, { ...store, payout: input });
  return input;
}

export function hasMockProviderPayoutReady(providerId: string): boolean {
  const store = readStore(providerId);
  return Boolean(store.identity?.verified && store.payout?.payoutAccountLabel);
}
