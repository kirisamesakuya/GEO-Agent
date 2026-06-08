/** 投放方案 / 任务包表单文本限制 */
export const CAMPAIGN_SUPPLEMENT_NOTES_MAX = 3000;

export function normalizeSupplementNotes(notes: string) {
  return notes.slice(0, CAMPAIGN_SUPPLEMENT_NOTES_MAX);
}

export function validateSupplementNotes(notes?: string): string | null {
  if (notes !== undefined && notes.trim().length > CAMPAIGN_SUPPLEMENT_NOTES_MAX) {
    return `补充说明不能超过 ${CAMPAIGN_SUPPLEMENT_NOTES_MAX} 字`;
  }
  return null;
}
