import type { AccountBinding } from '../types';
import { platformMatches } from './content-library-platforms';
import { isPublishReady } from './publish-account-login-status';
import { submitPublishDraft } from './publish-draft-client';
import { waitForHermesAgentTask } from './hermes-publish-client';
import { isHermesAutoPublishSupported } from './hermes-auto-publish-gate';
import type { AiPublishGroup } from './article-delivery-unified';

export type { AiPublishGroup };

export interface AiPublishProgress {
  progress: number;
  message: string;
  detail: string;
}

export interface AiPublishResult {
  published: number;
  errors: string[];
  links: string[];
}

export interface HermesPublishConfirmPayload {
  articleCount: number;
  platformLabels: string[];
  accountLabel: string;
}

export function resolveAccountForPlatform(
  accounts: AccountBinding[],
  platform: string,
  preferredAccountId?: string
): AccountBinding | undefined {
  const matching = accounts.filter(
    (a) => platformMatches(platform, a.platform) && isPublishReady(a.status)
  );
  if (preferredAccountId) {
    return matching.find((a) => a.id === preferredAccountId) ?? matching[0];
  }
  return matching[0];
}

export function buildHermesConfirmPayload(
  groups: AiPublishGroup[],
  accounts: AccountBinding[],
  accountByPlatform: Record<string, string> = {}
): HermesPublishConfirmPayload | null {
  if (!groups.length) return null;
  const platformLabels = [...new Set(groups.map((g) => g.platform))];
  const accountLabels = groups.map((group) => {
    const account = resolveAccountForPlatform(
      accounts,
      group.platform,
      accountByPlatform[group.platform]
    );
    return account ? `${account.accountName} · ${account.platform}` : `${group.platform}（无账号）`;
  });
  return {
    articleCount: groups.reduce((sum, g) => sum + g.itemIds.length, 0),
    platformLabels,
    accountLabel: accountLabels.join('；'),
  };
}

export function groupsMissingAccounts(
  groups: AiPublishGroup[],
  accounts: AccountBinding[],
  accountByPlatform: Record<string, string> = {}
): string[] {
  const missing: string[] = [];
  for (const group of groups) {
    if (
      !resolveAccountForPlatform(accounts, group.platform, accountByPlatform[group.platform])
    ) {
      missing.push(group.platform);
    }
  }
  return [...new Set(missing)];
}

export async function executeAiArticlePublish(
  groups: AiPublishGroup[],
  accounts: AccountBinding[],
  onProgress: (progress: AiPublishProgress) => void,
  accountByPlatform: Record<string, string> = {}
): Promise<AiPublishResult> {
  let published = 0;
  const errors: string[] = [];
  const links: string[] = [];

  onProgress({ progress: 4, message: '准备 Hermes 发布…', detail: `共 ${groups.length} 组` });

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (!isHermesAutoPublishSupported(group.platform)) {
      errors.push(`${group.platform}: 该平台暂不支持 Hermes 自动发布`);
      continue;
    }
    const account = resolveAccountForPlatform(
      accounts,
      group.platform,
      accountByPlatform[group.platform]
    );
    if (!account) {
      errors.push(`${group.platform} 无可用发布账号`);
      continue;
    }

    onProgress({
      progress: 8 + Math.round((gi / groups.length) * 15),
      message: `正在提交 ${group.platform}…`,
      detail: `${gi + 1} / ${groups.length}`,
    });

    try {
      const submit = await submitPublishDraft({
        batchId: group.batchId,
        brandName: group.brandName,
        accountBindingId: account.id,
        contentItemIds: group.itemIds,
      });

      if (submit.task?.id) {
        const task = await waitForHermesAgentTask(submit.task.id, (progress, message) => {
          onProgress({
            progress,
            message,
            detail: `${group.platform} · ${gi + 1}/${groups.length}`,
          });
        });
        if (!task) {
          errors.push(`${group.platform}: Hermes 任务超时`);
          continue;
        }
        if (task.status === 'succeeded' || task.status === 'partial') {
          published += Number(
            (task.output as { publishedCount?: number } | undefined)?.publishedCount ??
              (task.status === 'partial' ? 0 : group.itemIds.length)
          );
          const link = (task.output as { publishLink?: string } | undefined)?.publishLink;
          if (link) links.push(link);
          if (task.status === 'partial') {
            errors.push(`${group.platform}: ${task.userErrorMessage ?? '部分文章需人工发布'}`);
          }
        } else {
          errors.push(`${group.platform}: ${task.userErrorMessage ?? 'Hermes 发布失败'}`);
        }
      } else {
        published += group.itemIds.length;
      }
    } catch (err) {
      errors.push(`${group.platform}: ${err instanceof Error ? err.message : '发布失败'}`);
    }
  }

  return { published, errors, links };
}
