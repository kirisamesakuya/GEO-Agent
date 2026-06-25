import type { ContentBatch } from '../types';
import type { PlatformAuthConfig } from '../types';
import { platformMatches } from './content-library-platforms';

export function buildManualPublishCopyText(input: {
  groups: Array<{ batchId: string; platform: string; itemIds: string[] }>;
  loadedBatches: Record<string, ContentBatch>;
  platforms?: string[];
}): string {
  const targetPlatforms = input.platforms ? new Set(input.platforms) : null;
  const blocks: string[] = [];

  for (const group of input.groups) {
    if (targetPlatforms && !targetPlatforms.has(group.platform)) continue;
    const batch = input.loadedBatches[group.batchId];
    if (!batch) continue;
    for (const id of group.itemIds) {
      const item = batch.items.find((row) => row.id === id);
      if (!item) continue;
      const body = item.fullContent?.trim() || item.previewText?.trim() || '';
      blocks.push(body ? `# ${item.title}\n\n${body}` : `# ${item.title}`);
    }
  }

  return blocks.join('\n\n---\n\n');
}

export function resolveCreatorCenterUrl(
  platform: string,
  configs: PlatformAuthConfig[]
): string | undefined {
  const hit = configs.find(
    (cfg) => platformMatches(platform, cfg.platform) || cfg.platform === platform
  );
  return hit?.creatorCenterUrl || hit?.loginUrl || undefined;
}
