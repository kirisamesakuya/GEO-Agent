import { useEffect, useMemo, useState } from 'react';
import type { GeoAuditArtifact } from '../../lib/geo-audit-client';
import type { PreCrawlSnapshotView } from './GeoPreCrawlPanel';

export type DeployCheckItemId =
  | 'website_url'
  | 'schema_generated'
  | 'llms_generated'
  | 'robots_patch'
  | 'manual_deployed';

export type DeployCheckItem = {
  id: DeployCheckItemId;
  label: string;
  hint: string;
  autoDone: boolean;
  manualKey?: string;
};

function storageKey(brandName: string, reportId?: string) {
  return `geo_deploy_check_${brandName}_${reportId ?? 'brand'}`;
}

function loadManualChecks(brandName: string, reportId?: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey(brandName, reportId));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveManualChecks(brandName: string, reportId: string | undefined, data: Record<string, boolean>) {
  try {
    localStorage.setItem(storageKey(brandName, reportId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function buildDeployCheckItems(input: {
  websiteUrl?: string | null;
  artifacts?: GeoAuditArtifact[];
  preCrawl?: PreCrawlSnapshotView | null;
}): DeployCheckItem[] {
  const arts = input.artifacts ?? [];
  const hasSchema =
    arts.some((a) => a.type === 'schema_jsonld' || a.type === 'json' || /schema/i.test(a.name ?? '')) ||
    (input.preCrawl?.htmlMeta?.jsonLdCount ?? 0) > 0;
  const hasLlms = arts.some((a) => a.type === 'llms_txt' || /llms/i.test(a.name ?? ''));
  const hasRobots =
    arts.some((a) => a.type === 'robots_patch' || /robots/i.test(a.name ?? '')) ||
    Boolean(input.preCrawl?.robotsTxt && (input.preCrawl.robotsTxt.blockedBots?.length ?? 0) === 0);

  return [
    {
      id: 'website_url',
      label: '官网 URL 已填写',
      hint: '品牌资料或检测表单中提供可访问官网',
      autoDone: Boolean(input.websiteUrl?.trim()),
    },
    {
      id: 'schema_generated',
      label: 'Schema JSON-LD 已生成',
      hint: '在网站 GEO 资产生成或深度分析中获得代码片段',
      autoDone: hasSchema,
    },
    {
      id: 'llms_generated',
      label: 'llms.txt 已生成',
      hint: '生成后上传到网站根目录',
      autoDone: hasLlms,
    },
    {
      id: 'robots_patch',
      label: 'robots 补丁已就绪',
      hint: '确认 AI 爬虫未被误拦，必要时应用补丁',
      autoDone: hasRobots,
    },
    {
      id: 'manual_deployed',
      label: '人工确认已部署到官网',
      hint: '粘贴代码 / 上传文件后勾选',
      autoDone: false,
      manualKey: 'deployed',
    },
  ];
}

interface Props {
  brandName: string;
  reportId?: string;
  websiteUrl?: string | null;
  artifacts?: GeoAuditArtifact[];
  preCrawl?: PreCrawlSnapshotView | null;
  compact?: boolean;
  onOpenAssets?: () => void;
}

export default function GeoWebsiteDeployChecklist({
  brandName,
  reportId,
  websiteUrl,
  artifacts,
  preCrawl,
  compact = false,
  onOpenAssets,
}: Props) {
  const items = useMemo(
    () => buildDeployCheckItems({ websiteUrl, artifacts, preCrawl }),
    [websiteUrl, artifacts, preCrawl]
  );
  const [manual, setManual] = useState<Record<string, boolean>>(() =>
    loadManualChecks(brandName, reportId)
  );

  useEffect(() => {
    setManual(loadManualChecks(brandName, reportId));
  }, [brandName, reportId]);

  const doneCount = items.filter((i) => i.autoDone || (i.manualKey && manual[i.manualKey])).length;

  return (
    <section className={`geo-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-title)]">网站 GEO 部署清单</h3>
          {!compact && (
            <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5">
              跟踪 Schema / llms.txt / robots 从生成到上线（{doneCount}/{items.length}）
            </p>
          )}
        </div>
        {onOpenAssets && (
          <button type="button" className="geo-link text-[10px] shrink-0" onClick={onOpenAssets}>
            去资产生成
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = item.autoDone || (item.manualKey ? Boolean(manual[item.manualKey]) : false);
          return (
            <li key={item.id} className="flex items-start gap-2 text-[10px]">
              {item.manualKey ? (
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  onChange={(e) => {
                    const next = { ...manual, [item.manualKey!]: e.target.checked };
                    setManual(next);
                    saveManualChecks(brandName, reportId, next);
                  }}
                />
              ) : (
                <span className={checked ? 'text-emerald-600' : 'text-[var(--neutral-text-04)]'}>
                  {checked ? '✓' : '○'}
                </span>
              )}
              <div>
                <div className={checked ? 'text-[var(--color-title)]' : 'text-[var(--neutral-text-02)]'}>
                  {item.label}
                </div>
                {!compact && (
                  <div className="text-[var(--neutral-text-03)] mt-0.5">{item.hint}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const DEPLOY_BRIEF_BY_ARTIFACT_TYPE: Record<string, string> = {
  schema_jsonld:
    '将 JSON-LD 片段嵌入官网每个关键页面的 <head> 内；部署后可用 Rich Results 测试工具验证。',
  json: '将结构化数据 JSON 嵌入 <head> 或按页面类型分别部署。',
  llms_txt: '将 llms.txt 上传到网站根目录（https://域名/llms.txt），并确保可公开访问。',
  robots_patch: '将 robots.txt 补丁合并到现有 /robots.txt，解除对 AI 爬虫的误拦。',
  text: '按说明将文本文件部署到指定路径。',
};
