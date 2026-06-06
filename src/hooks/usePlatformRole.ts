import { useState, useEffect, useCallback } from 'react';

export type PlatformRole = 'admin' | 'ops' | 'reviewer' | 'support';

const STORAGE_KEY = 'geo_platform_role';

export function usePlatformRole() {
  const [role, setRoleState] = useState<PlatformRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ops' || saved === 'reviewer' || saved === 'support' || saved === 'admin') {
      return saved;
    }
    return 'admin';
  });
  const [permissions, setPermissions] = useState<Record<PlatformRole, string[]> | null>(null);

  useEffect(() => {
    fetch('/api/platform/role-permissions')
      .then((r) => r.json())
      .then((d) => setPermissions(d.permissions ?? null))
      .catch(() => {});
  }, []);

  const setRole = useCallback((next: PlatformRole) => {
    const previous = role;
    setRoleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    if (previous !== next) {
      void fetch('/api/platform/role-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next, previousRole: previous }),
      });
    }
  }, [role]);

  const can = useCallback(
    (permission: string) => {
      const perms = permissions?.[role] ?? ['*'];
      if (perms.includes('*')) return true;
      return perms.includes(permission);
    },
    [permissions, role]
  );

  return { role, setRole, can };
}
