import { GEO_REPORT_FIELD_LABELS, GEO_REPORT_SECTION_ORDER } from '../../lib/geo-report-fields';
import { SCORE_LABELS, type GeoAuditFinding } from '../../lib/geo-audit-client';
import { PUBLISHER_APP_NAME } from '../../lib/app-branding';
import type { GeoReportWatermarkSettings } from '../../lib/geo-report-watermark';

export interface GeoReportPrintData {
  title: string;
  brandName: string;
  createdAt: string;
  mentionRate?: number | null;
  rank?: number | null;
  gapsFound?: number | null;
  totalScore?: number | null;
  sections: Record<string, string>;
  prospectMode?: boolean;
  scores?: Record<string, string | number> | null;
  findings?: GeoAuditFinding[];
  actionPlan?: Array<{ id: string; horizon: string; title: string; detail: string }>;
  deliveryStatus?: string | null;
  qualityGate?: {
    verdict?: string;
    score?: number;
    evidenceCoverage?: number;
    measuredShare?: number;
    blockers?: string[];
  } | null;
  executiveSummary?: {
    conclusion?: string;
    keyFindings?: string[];
    priorityActions?: string[];
  } | null;
  nextBestAction?: { action?: string; owner?: string; acceptance?: string } | null;
}

interface Props {
  data: GeoReportPrintData;
  watermark?: GeoReportWatermarkSettings | null;
  /** 用于屏幕预览 */
  preview?: boolean;
}

const FINDING_LEVEL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#fef2f2', color: '#b91c1c', label: '严重' },
  high: { bg: '#fff1f2', color: '#e11d48', label: '高' },
  medium: { bg: '#fff7ed', color: '#c2410c', label: '中' },
  low: { bg: '#f8fafc', color: '#475569', label: '低' },
};

function renderParagraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, i) => (
      <p
        key={i}
        style={{
          fontSize: 11,
          lineHeight: 1.75,
          margin: i === 0 ? 0 : '10px 0 0',
          color: '#334155',
        }}
      >
        {chunk.split('\n').map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    ));
}

export default function GeoReportPrintLayout({ data, watermark, preview = false }: Props) {
  const wm = watermark?.enabled && watermark.text.trim() ? watermark : null;

  const metrics = [
    ...(data.totalScore != null ? [{ label: '综合得分', value: `${data.totalScore}` }] : []),
    { label: '提及率', value: data.mentionRate != null ? `${data.mentionRate}%` : '—' },
    { label: '排名', value: data.rank != null ? `#${data.rank}` : '—' },
    { label: '内容缺口', value: data.gapsFound != null ? `${data.gapsFound} 项` : '—' },
  ];

  return (
    <article
      className={preview ? 'geo-report-print geo-report-print--preview' : 'geo-report-print'}
      style={{
        position: 'relative',
        width: preview ? '100%' : '794px',
        minHeight: preview ? undefined : '1123px',
        background: '#fff',
        color: '#1a1a1a',
        fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
        padding: preview ? '32px 36px' : '48px 52px',
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
        <header style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', letterSpacing: '0.04em' }}>
            GEO 分析报告
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.35, color: '#0f172a' }}>
            {data.title}
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
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
        </header>

        {(data.executiveSummary?.conclusion || data.qualityGate) && (
          <section
            style={{
              marginBottom: 24,
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
            }}
          >
            <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>管理层摘要</p>
            {data.executiveSummary?.conclusion && (
              <p style={{ margin: '6px 0 10px', fontSize: 14, lineHeight: 1.6, fontWeight: 700, color: '#0f172a' }}>
                {data.executiveSummary.conclusion}
              </p>
            )}
            {data.qualityGate && (
              <p style={{ margin: 0, fontSize: 11, color: '#334155' }}>
                交付门禁：{data.qualityGate.verdict ?? '—'}
                {data.qualityGate.evidenceCoverage != null ? ` · 证据覆盖 ${Math.round(data.qualityGate.evidenceCoverage * (data.qualityGate.evidenceCoverage <= 1 ? 100 : 1))}%` : ''}
                {data.qualityGate.measuredShare != null ? ` · 实测占比 ${Math.round(data.qualityGate.measuredShare * (data.qualityGate.measuredShare <= 1 ? 100 : 1))}%` : ''}
              </p>
            )}
          </section>
        )}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`,
            gap: 12,
            marginBottom: 28,
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 10px',
                textAlign: 'center',
                background: '#f8fafc',
              }}
            >
              <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{m.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, margin: '6px 0 0', color: '#0f172a' }}>{m.value}</p>
            </div>
          ))}
        </section>

        {data.scores && Object.keys(data.scores).length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: '0 0 12px',
                color: '#1e3a8a',
              }}
            >
              分项评分
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                {Object.entries(data.scores).map(([key, value]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 0', color: '#64748b' }}>{SCORE_LABELS[key] ?? key}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {typeof value === 'object' ? JSON.stringify(value) : value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {GEO_REPORT_SECTION_ORDER.map((key) => {
          const body = data.sections[key];
          if (!body?.trim() || body.trim() === '—') return null;
          return (
            <section key={key} style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  margin: '0 0 10px',
                  paddingBottom: 8,
                  borderBottom: '2px solid #1d4ed8',
                  color: '#1e3a8a',
                }}
              >
                {GEO_REPORT_FIELD_LABELS[key] ?? key}
              </h2>
              <div>{renderParagraphs(body)}</div>
            </section>
          );
        })}

        {(data.findings?.length ?? 0) > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: '0 0 12px',
                color: '#1e3a8a',
              }}
            >
              关键问题
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {data.findings!.map((f) => {
                const level = FINDING_LEVEL_STYLE[f.level] ?? FINDING_LEVEL_STYLE.low;
                return (
                  <div
                    key={f.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      background: level.bg,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          marginRight: 8,
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: level.color,
                          background: '#fff',
                        }}
                      >
                        {level.label}
                      </span>
                      {f.title}
                    </p>
                    {f.impact && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                        影响：{f.impact}
                      </p>
                    )}
                    {f.suggestion && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
                        建议：{f.suggestion}
                      </p>
                    )}
                    {f.evidence && (
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', lineHeight: 1.5, fontFamily: 'monospace' }}>
                        证据：{f.evidence}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(data.actionPlan?.length ?? 0) > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: '0 0 12px',
                color: '#1e3a8a',
              }}
            >
              行动计划
            </h2>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#334155' }}>
              {data.actionPlan!.map((a) => (
                <li key={a.id} style={{ marginBottom: 10, lineHeight: 1.65 }}>
                  <strong style={{ color: '#0f172a' }}>
                    [{a.horizon}] {a.title}
                  </strong>
                  {a.detail ? ` — ${a.detail}` : ''}
                </li>
              ))}
            </ol>
          </section>
        )}

        {data.nextBestAction?.action && (
          <section style={{ marginBottom: 24, borderLeft: '4px solid #2563eb', padding: '10px 14px', background: '#f8fafc' }}>
            <h2 style={{ fontSize: 13, margin: '0 0 6px', color: '#1e3a8a' }}>建议下一步</h2>
            <p style={{ margin: 0, fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
              {data.nextBestAction.action}
              {data.nextBestAction.owner ? ` · 负责人：${data.nextBestAction.owner}` : ''}
              {data.nextBestAction.acceptance ? ` · 验收：${data.nextBestAction.acceptance}` : ''}
            </p>
          </section>
        )}

        <footer
          style={{
            fontSize: 9,
            color: '#94a3b8',
            marginTop: 36,
            paddingTop: 16,
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          本报告由 {PUBLISHER_APP_NAME} 生成 · 数据为 AI 平台采样分析结果，仅供参考
        </footer>
      </div>
    </article>
  );
}

export function pickGeoReportHtmlArtifact(
  artifacts?: Array<{
    type?: string;
    name?: string;
    preview?: string;
    content?: string;
    mimeType?: string;
  }>
): string | null {
  if (!artifacts?.length) return null;
  const htmlArt = artifacts.find((a) => {
    const type = String(a.type ?? '').toLowerCase();
    const name = String(a.name ?? '').toLowerCase();
    const mime = String(a.mimeType ?? '').toLowerCase();
    return type === 'html' || mime.includes('html') || name.endsWith('.html');
  });
  const content = String(htmlArt?.preview ?? htmlArt?.content ?? '').trim();
  return content || null;
}
