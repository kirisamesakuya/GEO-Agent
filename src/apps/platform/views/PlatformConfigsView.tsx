import { useCallback, useEffect, useState } from 'react';
import PlatformCard from '../components/PlatformCard';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch } from '../../../lib/platform-api';

const CONFIG_GROUPS: { id: string; label: string; keys: string[] }[] = [
  { id: 'platform', label: '平台与任务', keys: ['platforms', 'task_types', 'acceptance_methods'] },
  { id: 'budget', label: '预算规则', keys: ['budget_rules'] },
  { id: 'model', label: '模型配置', keys: ['model_config'] },
  { id: 'automation', label: '自动化 / Hermes', keys: ['automation_env', 'hermes_executor_default'] },
  { id: 'skills', label: 'Skill 路由', keys: ['skill_routes'] },
];

const CONFIG_META: Record<string, { label: string; description?: string }> = {
  platforms: { label: '投放平台', description: '任务大厅与发单可选平台' },
  task_types: { label: '任务类型', description: '订单与任务包类型枚举' },
  acceptance_methods: { label: '验收方式', description: '商家验收订单时可选项' },
  budget_rules: { label: '预算规则', description: '最低预算、冻结比例等' },
  model_config: { label: '模型配置', description: '默认模型与超时重试策略' },
  automation_env: { label: '自动化环境', description: '本机自动化执行环境信息' },
  hermes_executor_default: { label: 'Hermes 默认执行器', description: '发布类任务默认走 Hermes 或直连模型' },
  skill_routes: { label: 'Skill 路由表', description: 'Agent 任务类型到 Skill 的映射' },
};

type SkillRouteRow = { taskType: string; skillName: string; executor?: string; enabled?: boolean; priority?: number };

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ConfigTags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md border border-[var(--platform-border)] bg-[var(--platform-surface-subtle)] px-2.5 py-1 text-xs text-[var(--platform-text-primary)]">
          {item}
        </span>
      ))}
    </div>
  );
}

function ConfigKeyValue({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="text-xs text-[var(--platform-text-tertiary)]">空配置</p>;
  return (
    <div className="divide-y divide-[var(--platform-border-subtle)] rounded-lg border border-[var(--platform-border-subtle)]">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2 text-xs sm:grid-cols-[140px_1fr]">
          <span className="text-[var(--platform-text-tertiary)]">{k}</span>
          <span className="font-medium text-[var(--platform-text-primary)]">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PlatformConfigsView() {
  const { toast } = useToast();
  const { role } = usePlatformRole();
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [versionKey, setVersionKey] = useState<string | null>(null);
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(() => {
    fetch('/api/platform/configs').then((r) => r.json()).then((d) => setConfigs(d.configs ?? {}));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const skillRoutes: SkillRouteRow[] = parseJson(configs.skill_routes ?? '[]', []);

  const saveConfig = async (key: string, value: string) => {
    const res = await platformFetch(role, `/api/platform/configs/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, reason: reason || '平台配置更新', role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('配置已保存', 'success');
    setEditingKey(null);
    load();
  };

  const loadVersions = async (key: string) => {
    const res = await fetch(`/api/platform/configs/${key}/versions`);
    const data = await res.json();
    setVersions(data.versions ?? []);
    setVersionKey(key);
  };

  const patchSkillRoutes = (next: SkillRouteRow[]) => {
    const serialized = JSON.stringify(next);
    setConfigs((c) => ({ ...c, skill_routes: serialized }));
    void saveConfig('skill_routes', serialized);
  };

  const updateSkillRoute = (index: number, patch: Partial<SkillRouteRow>) => {
    patchSkillRoutes(skillRoutes.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const renderPreview = (key: string, raw: string) => {
    if (key === 'hermes_executor_default') {
      return <PlatformStatusTag label={raw} kind="pending" />;
    }
    const parsed = parseJson<unknown>(raw, null);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return <ConfigTags items={parsed as string[]} />;
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return <ConfigKeyValue data={parsed as Record<string, unknown>} />;
    }
    return <p className="text-xs text-[var(--platform-text-secondary)]">{raw}</p>;
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
      <PlatformCard title="变更说明">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="配置变更原因（预算规则、模型、Skill 路由等敏感项必填）"
          className="platform-filter-input w-full max-w-xl"
        />
      </PlatformCard>

      {CONFIG_GROUPS.map((group) => (
        <div key={group.id}>
        <PlatformCard title={group.label}>
          {group.id === 'skills' ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void loadVersions('skill_routes')}>
                  查看版本历史
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="platform-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>任务类型</th>
                      <th>Skill</th>
                      <th>执行器</th>
                      <th>优先级</th>
                      <th>启用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillRoutes.map((r, i) => (
                      <tr key={r.taskType}>
                        <td className="font-mono text-xs">{r.taskType}</td>
                        <td>
                          <input
                            className="platform-filter-input w-full text-xs"
                            value={r.skillName}
                            onChange={(e) => updateSkillRoute(i, { skillName: e.target.value })}
                          />
                        </td>
                        <td className="text-xs">{r.executor ?? '—'}</td>
                        <td>
                          <input
                            type="number"
                            className="platform-filter-input w-16 text-xs"
                            value={r.priority ?? 1}
                            onChange={(e) => updateSkillRoute(i, { priority: Number(e.target.value) })}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={r.enabled !== false}
                            onChange={(e) => updateSkillRoute(i, { enabled: e.target.checked })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {group.keys.map((key) => {
                const raw = configs[key];
                if (raw === undefined) return null;
                const meta = CONFIG_META[key] ?? { label: key };
                const isEditing = editingKey === key;
                return (
                  <div key={key} className="rounded-lg border border-[var(--platform-border-subtle)] p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--platform-text-title)]">{meta.label}</p>
                        {meta.description && (
                          <p className="mt-0.5 text-xs text-[var(--platform-text-tertiary)]">{meta.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void loadVersions(key)}>
                          版本历史
                        </button>
                        <button
                          type="button"
                          className="geo-btn-secondary geo-btn-xs"
                          onClick={() => {
                            setEditingKey(isEditing ? null : key);
                            setDraft(raw);
                          }}
                        >
                          {isEditing ? '取消' : '编辑'}
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-[var(--platform-border)] px-3 py-2 font-mono text-xs"
                        />
                        <button type="button" className="geo-btn-primary geo-btn-xs" onClick={() => void saveConfig(key, draft)}>
                          保存
                        </button>
                      </div>
                    ) : (
                      renderPreview(key, raw)
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PlatformCard>
        </div>
      ))}
      </div>

      {versionKey && (
        <PlatformDetailDrawer
          title={`${CONFIG_META[versionKey]?.label ?? versionKey} · 版本历史`}
          onClose={() => setVersionKey(null)}
        >
          <div className="space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-[var(--platform-text-tertiary)]">暂无版本记录</p>
            ) : (
              versions.slice(0, 10).map((v) => (
                <div key={String(v.id)} className="rounded-lg border border-[var(--platform-border-subtle)] px-3 py-2 text-xs">
                  <p className="font-medium">{new Date(String(v.createdAt)).toLocaleString('zh-CN')}</p>
                  <p className="mt-1 text-[var(--platform-text-tertiary)]">{String(v.reason ?? '—')}</p>
                </div>
              ))
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
