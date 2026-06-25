/**
 * Hermes 真实自动发布平台白名单。
 * 迭代接入新平台时只需扩展 HERMES_AUTO_PUBLISH_PLATFORM_IDS 与别名映射。
 */
export const HERMES_AUTO_PUBLISH_PLATFORM_IDS = new Set(['toutiao']);

const PLATFORM_ID_ALIASES: Record<string, string> = {
  toutiao: 'toutiao',
  头条: 'toutiao',
  头条号: 'toutiao',
};

/** 展示用：当前已接入真实自动发布的平台名 */
export const HERMES_AUTO_PUBLISH_PLATFORM_LABELS = ['头条号'] as const;

export function normalizePublishPlatformId(platform: string): string {
  const raw = String(platform ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  return PLATFORM_ID_ALIASES[lower] ?? PLATFORM_ID_ALIASES[raw] ?? lower;
}

export function isHermesAutoPublishSupported(platform: string): boolean {
  const id = normalizePublishPlatformId(platform);
  return Boolean(id) && HERMES_AUTO_PUBLISH_PLATFORM_IDS.has(id);
}

export function filterUnsupportedHermesPublishPlatforms(platforms: string[]): string[] {
  const seen = new Set<string>();
  const unsupported: string[] = [];
  for (const platform of platforms) {
    const label = String(platform ?? '').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    if (!isHermesAutoPublishSupported(label)) {
      unsupported.push(label);
    }
  }
  return unsupported;
}

export function partitionPublishPlatforms(platforms: string[]): {
  supported: string[];
  unsupported: string[];
} {
  const supported: string[] = [];
  const unsupported: string[] = [];
  const seen = new Set<string>();
  for (const platform of platforms) {
    const label = String(platform ?? '').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    if (isHermesAutoPublishSupported(label)) supported.push(label);
    else unsupported.push(label);
  }
  return { supported, unsupported };
}

export type PublishUnavailableDialogCopy = {
  title: string;
  hint: string;
  statusUnsupportedLabel: string;
  statusSupportedLabel: string;
  body: string;
  showCopyAction: boolean;
};

/** 根据本次选择的渠道生成弹窗文案（支持「部分自动 + 部分手动」） */
export function buildPublishUnavailableDialogCopy(input: {
  unsupported: string[];
  autoPublishedPlatforms?: string[];
}): PublishUnavailableDialogCopy {
  const unsupported = input.unsupported.filter(Boolean);
  const autoPublished = (input.autoPublishedPlatforms ?? []).filter(Boolean);
  const unsupportedLabel = unsupported.join('、');
  const autoPublishedLabel = autoPublished.join('、');
  const globalSupportedLabel = HERMES_AUTO_PUBLISH_PLATFORM_LABELS.join('、');

  if (unsupported.length === 0) {
    return {
      title: '',
      hint: '',
      statusUnsupportedLabel: '',
      statusSupportedLabel: '',
      body: '',
      showCopyAction: false,
    };
  }

  if (autoPublished.length > 0) {
    const title =
      unsupported.length === 1
        ? `${unsupported[0]}暂不支持自动发布`
        : `${unsupportedLabel}暂不支持自动发布`;
    const body =
      unsupported.length === 1
        ? `${autoPublishedLabel}已提交自动发布。请复制正文至「${unsupported[0]}」后台手动发布。`
        : `${autoPublishedLabel}已提交自动发布。请复制正文至「${unsupportedLabel}」后台手动发布。`;
    return {
      title,
      hint: '已完成自动发布的渠道无需重复操作。',
      statusUnsupportedLabel: unsupportedLabel,
      statusSupportedLabel: autoPublishedLabel,
      body,
      showCopyAction: true,
    };
  }

  if (unsupported.length === 1) {
    const platform = unsupported[0];
    return {
      title: `${platform}暂不支持自动发布`,
      hint: '请复制正文到平台后台手动发布。',
      statusUnsupportedLabel: platform,
      statusSupportedLabel: globalSupportedLabel,
      body: `目前仅「${globalSupportedLabel}」已接入 Hermes 自动发布。「${platform}」需手动粘贴发布，或等待后续版本。`,
      showCopyAction: true,
    };
  }

  return {
    title: `${unsupportedLabel}暂不支持自动发布`,
    hint: '为避免误操作，未接入真实发布的渠道不会创建 Hermes 任务。',
    statusUnsupportedLabel: unsupportedLabel,
    statusSupportedLabel: globalSupportedLabel,
    body: `目前仅「${globalSupportedLabel}」已接入 Hermes 自动发布。「${unsupportedLabel}」需手动粘贴发布，或等待后续版本。`,
    showCopyAction: true,
  };
}

export function buildHermesAutoPublishBlockedMessage(platforms: string[]): string {
  const unsupported = filterUnsupportedHermesPublishPlatforms(platforms);
  if (unsupported.length === 0) return '';
  return buildPublishUnavailableDialogCopy({ unsupported }).body;
}
