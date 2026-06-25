import {
  grossFromProviderNetCents,
  splitFromProviderNetCents,
  splitFromGrossCentsForAudit,
  MIN_PROVIDER_NET_CENTS,
} from '../lib/platform-fee.js';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const s1 = splitFromProviderNetCents(70000);
assert(s1.publisherPayAmountCents === 100000, 'P0=70000 -> G=100000');
assert(s1.platformServiceFeeCents === 30000, 'P0=70000 -> F=30000');
assert(s1.providerIncomeCents === 70000, 'P0=70000 -> P=70000');

const s2 = splitFromProviderNetCents(100000);
assert(s2.publisherPayAmountCents === 142858, 'P0=100000 -> G=142858');
assert(s2.platformServiceFeeCents === 42858, 'P0=100000 -> F=42858');

const s3 = splitFromProviderNetCents(210000);
assert(s3.publisherPayAmountCents === 300000, 'P0=210000 -> G=300000');

const audit = splitFromGrossCentsForAudit(100000);
assert(audit.platformServiceFeeCents === 30000, 'audit G=100000 -> F=30000');
assert(audit.providerIncomeCents === 70000, 'audit G=100000 -> P=70000');

assert(grossFromProviderNetCents(MIN_PROVIDER_NET_CENTS) >= MIN_PROVIDER_NET_CENTS, 'min net');

console.log('\nAll platform-fee tests passed.');
