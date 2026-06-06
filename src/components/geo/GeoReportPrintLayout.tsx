import { GEO_REPORT_FIELD_LABELS, GEO_REPORT_SECTION_ORDER } from '../../lib/geo-report-fields';
import { PUBLISHER_APP_NAME } from '../../lib/app-branding';
import type { GeoReportWatermarkSettings } from '../../lib/geo-report-watermark';

export interface GeoReportPrintData {
  title: string;
  brandName: string;
  createdAt: string;
  mentionRate?: number | null;
  rank?: number | null;
  gapsFound?: number | null;
  sections: Record<string, string>;
  prospectMode?: boolean;
}

interface Props {
  data: GeoReportPrintData;
  watermark?: GeoReportWatermarkSettings | null;
  /** 用于屏幕预览 */
  preview?: boolean;
}

export default function GeoReportPrintLayout({ data, watermark, preview = false }: Props) {
  const wm = watermark?.enabled && watermark.text.trim() ? watermark : null;

  return (
    <div
      className={preview ? 'geo-report-print geo-report-print--preview' : 'geo-report-print'}
      style={{
        position: 'relative',
        width: preview ? '100%' : '794px',
        minHeight: preview ? undefined : '1123px',
        background: '#fff',
        color: '#1a1a1a',
        fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
        padding: preview ? '24px' : '48px 52px',
        boxSizing: 'border-box',
      }}
    >
      {wm && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '-20%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(4, 1fr)',
              gap: '12%',
              transform: 'rotate(-24deg)',
              opacity: wm.opacity,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: wm.fontSize,
                  fontWeight: 600,
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                }}
              >
                {wm.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 2 }}>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>GEO 分析报告</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.35 }}>
          {data.title}
        </h1>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>
          品牌：{data.brandName}
          {data.prospectMode ? ' · 售前探店' : ''} · 生成于{' '}
          {new Date(data.createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: '提及率', value: data.mentionRate != null ? `${data.mentionRate}%` : '—' },
            { label: '排名', value: data.rank != null ? `#${data.rank}` : '—' },
            { label: '内容缺口', value: data.gapsFound != null ? `${data.gapsFound} 项` : '—' },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 8px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{m.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0' }}>{m.value}</p>
            </div>
          ))}
        </div>

        {GEO_REPORT_SECTION_ORDER.map((key) => {
          const body = data.sections[key];
          if (!body?.trim()) return null;
          return (
            <section key={key} style={{ marginBottom: 18 }}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: '0 0 8px',
                  paddingBottom: 6,
                  borderBottom: '2px solid #1d4ed8',
                  color: '#1e3a8a',
                }}
              >
                {GEO_REPORT_FIELD_LABELS[key] ?? key}
              </h2>
              <p
                style={{
                  fontSize: 11,
                  lineHeight: 1.65,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  color: '#334155',
                }}
              >
                {body}
              </p>
            </section>
          );
        })}

        <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 32, textAlign: 'center' }}>
          本报告由 {PUBLISHER_APP_NAME} 生成 · 数据为 AI 平台采样分析结果，仅供参考
        </p>
      </div>
    </div>
  );
}
