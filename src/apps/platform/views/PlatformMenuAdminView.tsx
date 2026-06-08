import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { PLATFORM_NAV_GROUPS } from '../nav';
import { isPlatformViewEnabled } from '../platform-feature-flags';
import type { PlatformView } from '../types';

interface MenuRow {
  id: string;
  group: string;
  view: PlatformView;
  label: string;
  enabled: boolean;
}

const rows: MenuRow[] = PLATFORM_NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    id: `${g.id}-${item.id}`,
    group: g.label,
    view: item.id,
    label: item.label,
    enabled: isPlatformViewEnabled(item.id),
  }))
);

export default function PlatformMenuAdminView() {
  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">后台菜单</h2>
        <p className="mt-1 text-xs text-[var(--platform-text-tertiary)]">
          展示平台端左侧导航结构。v1 菜单由代码配置（非可视化编辑）；评审时可对照各模块是否应对运营开放。
        </p>
      </div>

      <PlatformStatSummary
        items={[
          { label: '菜单项', value: rows.length },
          { label: '已开放', value: enabledCount },
          { label: '已隐藏', value: rows.length - enabledCount },
          { label: '分组', value: PLATFORM_NAV_GROUPS.length },
        ]}
      />

      <PlatformCard title="v1 说明">
        <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--platform-text-secondary)]">
          <li>「已隐藏」项代码保留，可在 feature-flags 或权限矩阵中后续开放。</li>
          <li>「系统配置」不在平台后台展示，技术参数由部署环境或研发维护。</li>
          <li>正式版可在此支持拖拽排序、按角色配置可见菜单（待产品确认）。</li>
        </ul>
      </PlatformCard>

      <PlatformDataTable<MenuRow>
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { key: 'group', header: '分组', render: (r) => r.group },
          { key: 'label', header: '菜单名称', render: (r) => <span className="font-medium">{r.label}</span> },
          { key: 'view', header: '标识', render: (r) => <code className="text-xs">{r.view}</code> },
          {
            key: 'status',
            header: '状态',
            render: (r) => (
              <PlatformStatusTag label={r.enabled ? '已开放' : '已隐藏'} kind={r.enabled ? 'success' : 'muted'} />
            ),
          },
        ]}
      />
    </div>
  );
}
