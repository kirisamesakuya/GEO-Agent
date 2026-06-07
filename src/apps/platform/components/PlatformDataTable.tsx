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
  emptyText?: string;
}

export default function PlatformDataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = '暂无数据',
}: Props<T>) {
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
            {columns.map((col) => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'cursor-pointer' : undefined}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
