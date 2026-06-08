import { useCallback, useEffect, useState } from 'react';
import {
  fetchHermesHealth,
  fetchHermesSkills,
  type HermesHealth,
  type HermesSkill,
} from '../lib/hermes-client';
import { fetchGeoApprovalPolicy, type GeoApprovalPolicy } from '../lib/hermes-approval';

type SkillsPayload = {
  version: string;
  skills: HermesSkill[];
  installed?: boolean;
  note?: string;
};

interface Options {
  pollMs?: number;
  includeSkills?: boolean;
  includeApprovalPolicy?: boolean;
}

export function useHermesHealth(options: Options = {}) {
  const { pollMs, includeSkills = false, includeApprovalPolicy = false } = options;
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [skills, setSkills] = useState<SkillsPayload | null>(null);
  const [approvalPolicy, setApprovalPolicy] = useState<GeoApprovalPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tasks: Promise<unknown>[] = [fetchHermesHealth()];
      if (includeSkills) {
        tasks.push(
          fetchHermesSkills().catch(() => ({
            installed: false,
            version: '—',
            skills: [] as HermesSkill[],
            note: '技能清单暂不可用，请稍后刷新',
          }))
        );
      }
      if (includeApprovalPolicy) {
        tasks.push(fetchGeoApprovalPolicy().catch(() => ({ skipApprovalForGeo: false })));
      }

      const results = await Promise.all(tasks);
      setHealth(results[0] as HermesHealth);
      let idx = 1;
      if (includeSkills) {
        setSkills(results[idx] as SkillsPayload);
        idx += 1;
      }
      if (includeApprovalPolicy) {
        setApprovalPolicy(results[idx] as GeoApprovalPolicy);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hermes 状态检测失败');
    } finally {
      setLoading(false);
    }
  }, [includeApprovalPolicy, includeSkills]);

  useEffect(() => {
    void refresh();
    if (!pollMs) return;
    const timer = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, refresh]);

  const patchCapacity = useCallback((capacity: NonNullable<HermesHealth['capacity']>) => {
    setHealth((prev) => (prev ? { ...prev, capacity } : prev));
  }, []);

  return {
    health,
    skills,
    approvalPolicy,
    setApprovalPolicy,
    loading,
    error,
    refresh,
    patchCapacity,
  };
}
