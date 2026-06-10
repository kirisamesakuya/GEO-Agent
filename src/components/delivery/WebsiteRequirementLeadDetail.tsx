import { resolveWebsiteLeadFields, type WebsiteLeadSource } from '../../../lib/website-lead-intake';
import { parseWebsiteGeoAnalysisFromNotes } from '../../lib/website-requirement-nav';

export interface WebsiteRequirementAttachment {
  name: string;
  url: string;
  mimeType?: string;
}

interface Props {
  source: WebsiteLeadSource & { attachments?: WebsiteRequirementAttachment[] };
  variant?: 'publisher' | 'platform';
}

export default function WebsiteRequirementLeadDetail({ source, variant = 'publisher' }: Props) {
  const fields = resolveWebsiteLeadFields(source);
  const analysis = parseWebsiteGeoAnalysisFromNotes(fields.notes);
  const attachments = source.attachments ?? [];

  const labelClass =
    variant === 'platform'
      ? 'text-[var(--platform-text-tertiary)]'
      : 'text-[var(--neutral-text-03)]';
  const valueClass =
    variant === 'platform' ? 'text-[var(--platform-text-title)]' : 'text-[var(--color-title)]';
  const boxClass =
    variant === 'platform'
      ? 'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg-subtle,#f8fafc)] p-3 space-y-2'
      : 'rounded-lg p-3 space-y-2 bg-[var(--neutral-bg-02)]';

  const referenceUrl = fields.referenceUrl || analysis.websiteFromNotes;

  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className={labelClass}>页面类型：</span>
        <span className={valueClass}>{fields.pageType || '—'}</span>
      </p>
      {referenceUrl && (
        <p>
          <span className={labelClass}>官网链接：</span>
          <a href={referenceUrl} target="_blank" rel="noreferrer" className="geo-link text-xs break-all">
            {referenceUrl}
          </a>
        </p>
      )}
      <p>
        <span className={labelClass}>目标关键词：</span>
        <span className={valueClass}>{fields.keywords || '—'}</span>
      </p>
      <p>
        <span className={labelClass}>联系方式：</span>
        <span className={valueClass}>{fields.contact || '—'}</span>
      </p>

      {analysis.hasAnalysis ? (
        <div className={boxClass}>
          <p className={`text-xs font-semibold ${valueClass}`}>GEO 分析方案</p>
          {analysis.reportTitle && (
            <p className="text-xs">
              <span className={labelClass}>关联报告：</span>
              {analysis.reportTitle}
            </p>
          )}
          {analysis.scope && (
            <p className="text-xs">
              <span className={labelClass}>分析范围：</span>
              {analysis.scope}
            </p>
          )}
          {analysis.summary ? (
            <div>
              <p className={`text-xs ${labelClass}`}>分析摘要</p>
              <p className="text-xs mt-1 whitespace-pre-wrap leading-relaxed">{analysis.summary}</p>
            </div>
          ) : (
            <p className={`text-xs ${labelClass}`}>（未附带分析摘要正文）</p>
          )}
        </div>
      ) : analysis.plainNotes ? (
        <div>
          <p className={`text-xs ${labelClass}`}>参考说明</p>
          <p className="text-xs mt-1 whitespace-pre-wrap leading-relaxed">{analysis.plainNotes}</p>
        </div>
      ) : null}

      {attachments.length > 0 && (
        <div>
          <p className={`text-xs ${labelClass} mb-1`}>附件</p>
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li key={a.url}>
                <a href={a.url} target="_blank" rel="noreferrer" className="geo-link text-xs">
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
