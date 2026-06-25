import {
  filterUnsupportedHermesPublishPlatforms,
  isHermesAutoPublishSupported,
  partitionPublishPlatforms,
} from '../../lib/publish-platform-capability';

/** 发布前校验：不支持的平台返回列表，支持则返回空数组 */
export function getHermesAutoPublishBlockedPlatforms(platforms: string[]): string[] {
  return filterUnsupportedHermesPublishPlatforms(platforms);
}

export function canHermesAutoPublish(platforms: string[]): boolean {
  return getHermesAutoPublishBlockedPlatforms(platforms).length === 0;
}

export { isHermesAutoPublishSupported, partitionPublishPlatforms };
