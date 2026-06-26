import type { ProviderBrandBriefView } from '../../../../lib/provider-brand-brief';
import { providerBrandBriefHasContent } from '../../../../lib/provider-brand-brief';

interface Props {
  brief: ProviderBrandBriefView;
  className?: string;
}

export default function ProviderBrandBriefCard({ brief, className = '' }: Props) {
  if (!providerBrandBriefHasContent(brief)) return null;

  const industryCity =
    [brief.industry, brief.city].filter(Boolean).join(' · ') || '—';

  return (
    <section className={`provider-section-card space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-provider-title">品牌基础信息</h2>
        <span className="text-[10px] text-provider-muted">由发布方品牌资料提供</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-provider-body">
        <div>
          <p className="text-provider-muted">品牌</p>
          <p className="font-medium text-provider-title mt-0.5">{brief.brandName}</p>
        </div>
        <div>
          <p className="text-provider-muted">行业 / 城市</p>
          <p className="mt-0.5">{industryCity}</p>
        </div>
        {brief.description && (
          <div className="md:col-span-2">
            <p className="text-provider-muted">品牌介绍</p>
            <p className="mt-0.5 leading-relaxed">{brief.description}</p>
          </div>
        )}
        {brief.keywords?.length ? (
          <div className="md:col-span-2">
            <p className="text-provider-muted">目标关键词</p>
            <p className="mt-0.5">{brief.keywords.join('、')}</p>
          </div>
        ) : null}
        {brief.website && (
          <div className="md:col-span-2">
            <p className="text-provider-muted">官网</p>
            <a
              href={brief.website}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 text-workbench hover:underline break-all"
            >
              {brief.website}
            </a>
          </div>
        )}
        {brief.productSellingPoints && (
          <div className="md:col-span-2">
            <p className="text-provider-muted">产品卖点</p>
            <p className="mt-0.5 leading-relaxed">{brief.productSellingPoints}</p>
          </div>
        )}
        {(brief.forbiddenWords?.length || brief.complianceNotes) && (
          <div className="md:col-span-2">
            <p className="text-provider-muted">禁用词 / 合规</p>
            <p className="mt-0.5">
              {brief.forbiddenWords?.length
                ? brief.forbiddenWords.join('、')
                : brief.complianceNotes}
            </p>
          </div>
        )}
        {brief.supplementNotes && (
          <div className="md:col-span-2">
            <p className="text-provider-muted">补充说明</p>
            <p className="mt-0.5 leading-relaxed">{brief.supplementNotes}</p>
          </div>
        )}
        {brief.demandSource && (
          <div>
            <p className="text-provider-muted">需求来源</p>
            <p className="mt-0.5">{brief.demandSource}</p>
          </div>
        )}
      </div>
    </section>
  );
}
