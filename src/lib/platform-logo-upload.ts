export const PLATFORM_LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
export const PLATFORM_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export async function uploadPlatformLogo(file: File): Promise<{ url: string; name: string; mimeType: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片文件（PNG / JPG / WebP / SVG）');
  }
  if (file.size > PLATFORM_LOGO_MAX_BYTES) {
    throw new Error('LOGO 图片不能超过 2MB');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, data: base64, mimeType: file.type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '上传失败');
  return { url: data.url, name: data.name, mimeType: data.mimeType };
}
