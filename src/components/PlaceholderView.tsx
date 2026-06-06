import type { ViewType } from '../types';

export function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="geo-card max-w-md w-full p-8 text-center">
        <h2 className="text-lg font-bold text-[var(--color-title)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        <p className="text-xs text-[var(--color-text-placeholder)] mt-4">该模块将在后续迭代中实现</p>
      </div>
    </div>
  );
}

export const PLACEHOLDER_VIEWS: Partial<Record<ViewType, { title: string; description: string }>> = {
  create_website: {
    title: '发布网页改装',
    description: '填写网页需求、生成 AI 预览并转为网页任务。',
  },
  content_library: {
    title: '文章结果',
    description: '管理 AI 生成 GEO 文章的批次、草稿与发布准备。',
  },
  order_delivery: {
    title: '任务交付',
    description: '管理接单任务与网页任务的验收、返修与争议。',
  },
};
