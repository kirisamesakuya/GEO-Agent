interface Props {
  kind: 'task' | 'website';
  brandName: string;
}

export default function OrderDeliveryEmptyState({ kind, brandName }: Props) {
  if (kind === 'website') {
    return (
      <div className="p-6 space-y-2 text-center max-w-md mx-auto">
        <p className="text-sm font-medium text-[var(--color-title)]">暂无网页需求</p>
        <p className="text-xs text-[var(--neutral-text-03)]">
          网页改装与页面类需求提交后，处理进度将在此查看。
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-medium text-[var(--neutral-text-02)]">暂无接单任务</p>
      <p className="text-[11px] leading-relaxed text-[var(--neutral-text-03)]">
        向资源平台发布文章写作单或投放任务包后，进度与审稿将在此统一跟踪。
      </p>
      {brandName === '__all__' && (
        <p className="text-[11px] text-[var(--neutral-text-03)]">
          请选择具体品牌查看任务。
        </p>
      )}
    </div>
  );
}
