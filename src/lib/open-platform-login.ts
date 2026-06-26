/** 按平台复用同一浏览器标签，避免重复点击弹出多个登录页 */
export function openPlatformLogin(url: string, platform?: string): boolean {
  const target = platform ? `geo_platform_login_${platform}` : 'geo_platform_login';
  const opened = window.open(url, target, 'noopener,noreferrer');
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // cross-origin
    }
    opened.focus();
    return true;
  }
  return false;
}
