import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import PlatformBadge from './PlatformBadge';
import type { MediaPlatformCatalogEntry } from '../../lib/media-platform-catalog';
import { uploadPlatformLogo, PLATFORM_LOGO_ACCEPT } from '../../lib/platform-logo-upload';

interface Props {
  label: string;
  logoUrl: string;
  onChange: (logoUrl: string) => void;
  disabled?: boolean;
  /** 无上传图时用于 PlatformBadge 回退展示 */
  catalogEntry?: MediaPlatformCatalogEntry;
  size?: 'sm' | 'md';
}

export default function PlatformLogoUpload({
  label,
  logoUrl,
  onChange,
  disabled = false,
  catalogEntry,
  size = 'md',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const previewCatalog: MediaPlatformCatalogEntry[] = catalogEntry
    ? [{ ...catalogEntry, logoUrl: logoUrl || catalogEntry.logoUrl }]
    : logoUrl
      ? [
          {
            id: 'preview',
            label: label || '预览',
            category: 'content_publish',
            sortOrder: 0,
            enabled: true,
            abbr: label.slice(0, 1) || '·',
            gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
            logoUrl,
          },
        ]
      : [];

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadPlatformLogo(file);
      onChange(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className={size === 'md' ? 'w-10 h-10 rounded object-cover shrink-0 border border-[var(--neutral-divider-02)]' : 'w-8 h-8 rounded object-cover shrink-0 border border-[var(--neutral-divider-02)]'}
          />
        ) : (
          <PlatformBadge label={label || '预览'} catalog={previewCatalog} size={size} showLabel={false} />
        )}
        <div className="flex-1 space-y-2 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={PLATFORM_LOGO_ACCEPT}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {uploading ? '上传中…' : logoUrl ? '更换 LOGO' : '上传 LOGO'}
            </button>
            {logoUrl && !disabled && (
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1"
                onClick={() => onChange('')}
              >
                <X className="w-3.5 h-3.5" />
                移除
              </button>
            )}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
            支持 PNG / JPG / WebP / SVG，不超过 2MB。未上传时将使用名称首字徽标。
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
