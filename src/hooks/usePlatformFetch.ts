import { useCallback } from 'react';
import { platformFetch } from '../lib/platform-api';
import { usePlatformRole } from './usePlatformRole';

/** 平台端 API 请求，自动附带 X-Platform-Role */
export function usePlatformFetch() {
  const { role } = usePlatformRole();
  return useCallback(
    (input: RequestInfo, init?: RequestInit) => platformFetch(role, input, init),
    [role]
  );
}
