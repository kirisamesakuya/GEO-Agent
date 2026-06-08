/** 将 AI 文章正文归一化为 Markdown 字符串（避免直接展示 JSON 结构）。 */

function articleObjectToMarkdown(obj: Record<string, unknown>): string | null {
  const body =
    obj.fullContent ?? obj.content ?? obj.body ?? obj.markdown ?? obj.text ?? obj.previewText;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';

  if (typeof body === 'string' && body.trim()) {
    const inner = normalizeArticleContentToMarkdown(body);
    if (title && !/^#\s/.test(inner.trim())) {
      return `# ${title}\n\n${inner}`.trim();
    }
    return inner;
  }

  if (title) return `# ${title}`;
  return null;
}

export function normalizeArticleContentToMarkdown(
  raw: string | null | undefined,
  fallbackTitle?: string
): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return fallbackTitle ? `# ${fallbackTitle}\n\n（无正文）` : '（无正文）';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const parts = parsed
          .map((row) =>
            row && typeof row === 'object'
              ? articleObjectToMarkdown(row as Record<string, unknown>)
              : null
          )
          .filter((s): s is string => Boolean(s?.trim()));
        if (parts.length) return parts.join('\n\n---\n\n');
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record.articles)) {
          const parts = record.articles
            .map((row) =>
              row && typeof row === 'object'
                ? articleObjectToMarkdown(row as Record<string, unknown>)
                : null
            )
            .filter((s): s is string => Boolean(s?.trim()));
          if (parts.length) return parts.join('\n\n---\n\n');
        }
        const single = articleObjectToMarkdown(record);
        if (single) return single;
      }
    } catch {
      // 非 JSON，按 Markdown 原文展示
    }
  }

  return trimmed;
}

export function isLikelyJsonArticleContent(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? '').trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
