import { useEffect, useState } from 'react';
import type { MediaPlatformCatalogEntry } from '../lib/media-platform-catalog';

const cache = new Map<string, MediaPlatformCatalogEntry[]>();
const inflight = new Map<string, Promise<MediaPlatformCatalogEntry[]>>();

async function fetchCatalog(scope?: string): Promise<MediaPlatformCatalogEntry[]> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  const res = await fetch(`/api/media-platforms${query}`);
  const data = await res.json();
  return (data.platforms ?? []) as MediaPlatformCatalogEntry[];
}

export function useMediaPlatformCatalog(scope?: string) {
  const cacheKey = scope ?? 'all';
  const [platforms, setPlatforms] = useState<MediaPlatformCatalogEntry[]>(cache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(!cache.has(cacheKey));

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!inflight.has(cacheKey)) {
        inflight.set(
          cacheKey,
          fetchCatalog(scope).finally(() => {
            inflight.delete(cacheKey);
          })
        );
      }
      try {
        const list = await inflight.get(cacheKey)!;
        if (!active) return;
        cache.set(cacheKey, list);
        setPlatforms(list);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [cacheKey, scope]);

  return { platforms, loading };
}

export function invalidateMediaPlatformCatalogCache() {
  cache.clear();
}
