import { useEffect, useState } from 'react';

interface Report {
  brandName: string;
  title?: string;
  mentionRate?: number;
  rank?: number;
  gapsFound?: number;
  brandMentionSummary: string;
  competitorAnalysis: string;
  contentGap: string;
  optimizationSuggestions: string;
  createdAt: string;
}

interface Props {
  reportId: string;
}

export default function ShareGeoReportView({ reportId }: Props) {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/share/geo-reports/${reportId}`)
      .then((r) => r.json())
      .then((d) => setReport(d.report ?? null))
      .catch(() => {});
  }, [reportId]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--neutral-text-03)]">
        加载报告…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-8 max-w-3xl mx-auto">
      <p className="text-xs text-[var(--neutral-text-03)] mb-2">GEO 分析报告 · 只读分享</p>
      <h1 className="text-xl font-bold mb-1 leading-snug">
        {report.title?.trim() || `${report.brandName} · GEO 分析报告`}
      </h1>
      <p className="text-xs text-[var(--neutral-text-03)] mb-4">{report.brandName}</p>
      <p className="text-xs text-[var(--neutral-text-03)] mb-6">{report.createdAt.slice(0, 10)}</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="geo-card p-3 text-center">
          <p className="text-xs text-[var(--neutral-text-03)]">提及率</p>
          <p className="text-lg font-bold">{report.mentionRate ?? '—'}%</p>
        </div>
        <div className="geo-card p-3 text-center">
          <p className="text-xs text-[var(--neutral-text-03)]">排名</p>
          <p className="text-lg font-bold">{report.rank ?? '—'}</p>
        </div>
        <div className="geo-card p-3 text-center">
          <p className="text-xs text-[var(--neutral-text-03)]">缺口</p>
          <p className="text-lg font-bold">{report.gapsFound ?? '—'}</p>
        </div>
      </div>
      {[
        ['提及概览', report.brandMentionSummary],
        ['竞品对比', report.competitorAnalysis],
        ['内容缺口', report.contentGap],
        ['优化建议', report.optimizationSuggestions],
      ].map(([title, body]) => (
        <section key={title} className="geo-card p-4 mb-4">
          <h2 className="text-sm font-semibold mb-2">{title}</h2>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--neutral-text-02)' }}>
            {body}
          </p>
        </section>
      ))}
    </div>
  );
}
