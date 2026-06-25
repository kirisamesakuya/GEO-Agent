export type PublishUnavailableDialogState = {
  unsupported: string[];
  autoPublished?: string[];
  copyText?: string;
};

export function isPublishUnavailableDialogOpen(
  state: PublishUnavailableDialogState | null
): state is PublishUnavailableDialogState {
  return Boolean(state?.unsupported.length);
}
