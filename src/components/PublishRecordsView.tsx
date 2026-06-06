import BrandScopeBar from './common/BrandScopeBar';
import PublishRecordsPanel from './PublishRecordsPanel';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
}

/** 兼容旧路由；主入口为文章结果 → 发布记录 */
export default function PublishRecordsView({ brandName, onBrandChange }: Props) {
  return (
    <div className="geo-page-content overflow-y-auto h-full space-y-4">
      <BrandScopeBar
        label="哪个品牌的发布记录"
        brandName={brandName}
        onBrandChange={onBrandChange}
      />
      <p className="text-xs text-[var(--neutral-text-03)]">
        发布记录已归入「生成 GEO 文章 → 文章结果 → 发布记录」。
      </p>
      <PublishRecordsPanel brandName={brandName} />
    </div>
  );
}
