import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import PlatformBadge from '../../../components/common/PlatformBadge';
import { useToast } from '../../../context/ToastContext';
import { platformApiFetch } from '../../../lib/platform-api';
import {
  DEFAULT_CUSTOM_PLATFORM_GRADIENT,
  defaultCustomPlatformAbbr,
} from '../../../../lib/custom-publish-platform';
import type { MediaPlatformCatalogEntry } from '../../../lib/media-platform-catalog';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';

interface CustomRow {
  brandId: string;
  brandName: string;
  platform: string;
  logoUrl?: string;
  abbr?: string;
  gradient?: string;
  loginUrl?: string;
  loginHint?: string;
  permissionsLabel?: string;
  createdAt: string;
}

function rowCatalog(row: CustomRow): MediaPlatformCatalogEntry[] {
  return [
    {
      id: row.platform,
      label: row.platform,
      category: 'content_publish',
      sortOrder: 0,
      enabled: true,
      abbr: row.abbr ?? defaultCustomPlatformAbbr(row.platform),
      gradient: row.gradient ?? DEFAULT_CUSTOM_PLATFORM_GRADIENT,
      logoUrl: row.logoUrl,
    },
  ];
}

export default function PlatformCustomPublishPlatformsView() {
  const { toast } = useToast();
  const [items, setItems] = useState<CustomRow[]>([]);
  const [brandName, setBrandName] = useState('');
  const [platform, setPlatform] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (brandName.trim()) params.set('brandName', brandName.trim());
    if (platform.trim()) params.set('platform', platform.trim());
    const query = params.toString();
    platformApiFetch(`/api/platform/custom-publish-platforms${query ? `?${query}` : ''}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? '加载失败');
        setItems((d.items ?? []) as CustomRow[]);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败', 'error'));
  }, [brandName, platform, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const brands = new Set(items.map((item) => item.brandName));
    return { total: items.length, brands: brands.size };
  }, [items]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          品牌自定义渠道
        </h2>
        <p className="text-sm text-[var(--platform-text-secondary)] mt-1">
          只读汇总：数据由发布端「发布账号管理 → 新增发布平台」写入，按品牌隔离；本页供运营查看各品牌扩展了哪些渠道。
        </p>
      </div>

      <PlatformStatSummary
        items={[
          { label: '自定义渠道', value: String(stats.total) },
          { label: '涉及品牌', value: String(stats.brands) },
        ]}
      />

      <PlatformFilterBar onReset={() => { setBrandName(''); setPlatform(''); }}>
        <PlatformFilterField label="品牌">
          <input
            className="platform-filter-input text-sm"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="品牌名称"
          />
        </PlatformFilterField>
        <PlatformFilterField label="平台">
          <input
            className="platform-filter-input text-sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="平台名称"
          />
        </PlatformFilterField>
      </PlatformFilterBar>

      <PlatformDataTable
        rows={items}
        rowKey={(row) => `${row.brandId}-${row.platform}`}
        emptyText="暂无品牌自定义渠道（请在发布端为品牌添加）"
        columns={[
          {
            key: 'platform',
            header: '平台',
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                <PlatformBadge label={row.platform} catalog={rowCatalog(row)} size="sm" showLabel={false} />
                <span className="font-medium">{row.platform}</span>
              </span>
            ),
          },
          { key: 'brand', header: '所属品牌', render: (row) => row.brandName },
          {
            key: 'loginUrl',
            header: '登录地址',
            render: (row) =>
              row.loginUrl ? (
                <a
                  href={row.loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--platform-primary)] truncate max-w-[200px] inline-block"
                >
                  {row.loginUrl}
                </a>
              ) : (
                '—'
              ),
          },
          {
            key: 'createdAt',
            header: '添加时间',
            render: (row) => new Date(row.createdAt).toLocaleString('zh-CN'),
          },
        ]}
      />
    </div>
  );
}
