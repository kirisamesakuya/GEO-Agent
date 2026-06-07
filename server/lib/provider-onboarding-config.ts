import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_PROVIDER_ONBOARDING_OPTIONS } from '../../lib/provider-onboarding-defaults.js';

export interface ProviderOnboardingOptions {
  mediaPlatforms: string[];
  serviceRegions: string[];
}

const CONFIG_PATH = join(process.cwd(), 'config', 'provider-onboarding.json');

let cached: ProviderOnboardingOptions | null = null;

function defaultOptions(): ProviderOnboardingOptions {
  return {
    mediaPlatforms: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.mediaPlatforms],
    serviceRegions: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.serviceRegions],
  };
}

export function loadProviderOnboardingOptions(): ProviderOnboardingOptions {
  if (cached) return cached;
  if (!existsSync(CONFIG_PATH)) {
    cached = defaultOptions();
    return cached;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ProviderOnboardingOptions>;
    cached = {
      mediaPlatforms:
        parsed.mediaPlatforms?.length ? parsed.mediaPlatforms : defaultOptions().mediaPlatforms,
      serviceRegions:
        parsed.serviceRegions?.length ? parsed.serviceRegions : defaultOptions().serviceRegions,
    };
  } catch {
    cached = defaultOptions();
  }
  return cached;
}
