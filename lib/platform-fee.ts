export const PLATFORM_FEE_RATE_BPS = 3000;
export const PROVIDER_NET_RATE_BPS = 7000;
export const FEE_CHARGE_SIDE = 'provider' as const;
export const MIN_PROVIDER_NET_CENTS = 1000;

export function grossFromProviderNetCents(netCents: number): number {
  return Math.ceil((netCents * 10000) / PROVIDER_NET_RATE_BPS);
}

export function platformFeeFromGrossCents(grossCents: number): number {
  return Math.round((grossCents * PLATFORM_FEE_RATE_BPS) / 10000);
}

/** 报价/accept 主路径：保证 P === netCents */
export function splitFromProviderNetCents(netCents: number) {
  const publisherPayAmountCents = grossFromProviderNetCents(netCents);
  const platformServiceFeeCents = publisherPayAmountCents - netCents;
  return {
    publisherPayAmountCents,
    platformServiceFeeCents,
    providerIncomeCents: netCents,
    serviceFeeRateBps: PLATFORM_FEE_RATE_BPS,
    feeChargeSide: FEE_CHARGE_SIDE,
  };
}

/** 仅对账校验，不用于改写快照单结算 */
export function splitFromGrossCentsForAudit(grossCents: number) {
  const platformServiceFeeCents = platformFeeFromGrossCents(grossCents);
  return {
    publisherPayAmountCents: grossCents,
    platformServiceFeeCents,
    providerIncomeCents: grossCents - platformServiceFeeCents,
  };
}

export function centsToYuanDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}
