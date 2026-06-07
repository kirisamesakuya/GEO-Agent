import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import PublishRecordsPanel from './PublishRecordsPanel';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
}

/** 兼容旧路由；主入口为文章结果 → 发布记录 */
export default function PublishRecordsView({ brandName, onBrandChange }: Props) {
  return (
    <div className="geo-page-content overflow-y-auto h-full space-y-4">
      <PageHeaderWithBrand
        title="发布记录"
        brandName={brandName}
        onBrandChange={onBrandChange}
      />
      <PublishRecordsPanel brandName={brandName} />
    </div>
  );
}
