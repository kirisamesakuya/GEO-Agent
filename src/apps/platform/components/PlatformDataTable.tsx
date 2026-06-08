import type { ReactNode } from 'react';

export interface PlatformTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: PlatformTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderActions?: (row: T) => ReactNode;
  selectedKey?: string;
  emptyText?: string;
  clickHint?: string;
}

export default function PlatformDataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  renderActions,
  selectedKey,
  emptyText = '暂无数据',
  clickHint,
}: Props<T>) {
  const hint = clickHint ?? (renderActions ? '点击「详情」查看完整信息；也可点击行快速打开' : undefined);
  const allColumns: PlatformTableColumn<T>[] = renderActions
    ? [
        ...columns,
        {
          key: '_actions',
          header: '操作',
          className: 'platform-table-col-actions',
          render: renderActions,
        },
      ]
    : columns;
  if (rows.length === 0) {
    return (
      <div className="platform-card px-5 py-10 text-center text-sm text-[var(--platform-text-tertiary)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="platform-card overflow-hidden">
      <table className="platform-table">
        <thead>
          <tr>
            {allColumns.map((col) => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isSelected = selectedKey != null && selectedKey === key;
            return (
              <tr
                key={key}
                className={[
                  onRowClick ? 'cursor-pointer' : '',
                  isSelected ? 'platform-table-row--selected' : '',
                ].filter(Boolean).join(' ') || undefined}
                onClick={() => onRowClick?.(row)}
              >
                {allColumns.map((col) => (
                  <td key={col.key} className={col.className}>{col.render(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {hint && rows.length > 0 && (
        <p className="platform-table-hint">{hint}</p>
      )}
    </div>
  );
}
