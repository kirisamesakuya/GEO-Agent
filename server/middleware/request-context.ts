import type { PlatformRole } from '../lib/platform-auth.js';

export type AuthMode = 'demo' | 'session';
export type UserType = 'publisher' | 'provider' | 'platform';

export type RequestContext = {
  userId: string;
  userType: UserType;
  authMode: AuthMode;
  organizationId?: string;
  brandIds?: string[];
  brandName?: string;
  providerId?: string;
  platformRole?: PlatformRole;
};

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === 'session' ? 'session' : 'demo';
}
