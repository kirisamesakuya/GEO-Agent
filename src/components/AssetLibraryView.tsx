import { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { ARTICLE_PUBLISH_PLATFORM_LABELS } from '../../lib/media-platforms';

interface Asset {
  id: string;
  url: string;
  name: string;
  group: string;
  tags: string[];
  platforms: string[];
  useCount: number;
}

interface Props {
  brandName: string;
  embedded?: boolean;
}

export default function AssetLibraryView({ brandName, embedded }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    fetch(`/api/media-assets?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setAssets(d.assets ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [brandName]);

  const onUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const up = await fetch('/api/uploads', { method: 'POST', body: fd }).then((r) => r.json());
    if (up.url) {
      await fetch('/api/media-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          url: up.url,
          name: file.name,
          group: 'brand',
          platforms: [...ARTICLE_PUBLISH_PLATFORM_LABELS],
        }),
      });
      load();
    }
    setUploading(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/media-assets/${id}?brandName=${encodeURIComponent(brandName)}`, {
      method: 'DELETE',
    });
    load();
  };

  return (
    <div className={`space-y-4 ${embedded ? 'p-6' : 'geo-page-content'}`}>
      <div className="flex items-center justify-between">
        <div>
          {!embedded && <h2 className="text-lg font-bold">图片素材库</h2>}
          <p className="text-xs text-[var(--neutral-text-03)]">上传品牌图片，供文章编辑插入</p>
        </div>
        <label className="geo-btn-primary text-sm gap-1 cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? '上传中…' : '上传图片'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {assets.length === 0 ? (
          <p className="col-span-full text-sm text-[var(--neutral-text-03)]">暂无素材</p>
        ) : (
          assets.map((a) => (
            <div key={a.id} className="geo-card p-2">
              <img src={a.url} alt={a.name} className="w-full h-32 object-cover rounded-lg" />
              <p className="text-xs mt-2 truncate">{a.name}</p>
              <p className="text-[10px] text-[var(--neutral-text-03)]">使用 {a.useCount} 次</p>
              <button type="button" className="text-red-500 mt-1" onClick={() => remove(a.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
