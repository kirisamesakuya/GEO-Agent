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

/** 与 server/db/demo-provider-finance-fixtures 对齐的接单端本地 Mock（API 未落库时兜底） */
const DEMO_PAYOUT_BY_PROVIDER_NAME: Record<string, MockProviderPayoutStore> = {
  晨光传媒: {
    identity: {
      verified: true,
      realName: '张晨',
      idNumberMask: '320***********1234',
    },
    payout: {
      payoutChannel: 'alipay',
      payoutAccountName: '张晨',
      payoutAccountDetail: '13812348888',
      payoutAccountLabel: '13812348888',
    },
  },
  蓝海内容: {
    identity: {
      verified: true,
      realName: '李蓝',
      idNumberMask: '310***********5678',
    },
    payout: {
      payoutChannel: 'alipay',
      payoutAccountName: '李蓝',
      payoutAccountDetail: 'lanhai_content@qq.com',
      payoutAccountLabel: 'lanhai_content@qq.com',
    },
  },
  北辰工作室: {
    identity: {
      verified: true,
      realName: '王北辰',
      idNumberMask: '110***********9012',
    },
  },
};

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

/** 演示接单方：若本地无 Mock 且服务端未落库，写入预设实名/提现账户 */
export function ensureDemoProviderMockStore(providerId: string, providerName?: string | null) {
  if (!providerName) return;
  const preset = DEMO_PAYOUT_BY_PROVIDER_NAME[providerName];
  if (!preset) return;
  const current = readStore(providerId);
  if (current.identity?.verified && (current.payout || !preset.payout)) return;
  writeStore(providerId, {
    identity: current.identity?.verified ? current.identity : preset.identity,
    payout: current.payout ?? preset.payout,
  });
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
