/** 从任务 output / 摘要中提取可展示的 Markdown，并剥离开发用 JSON 与技术说明。 */

function isDevPreambleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '---') return true;
  return (
    /^任务完成[。.]/.test(trimmed) ||
    /以下是\s*`[^`]+`/.test(trimmed) ||
    /结构化输出/.test(trimmed) ||
    /完整\s*JSON/i.test(trimmed)
  );
}

function stripLeadingDevPreamble(text: string): string {
  const lines = text.split('\n');
  let start = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (isDevPreambleLine(lines[i])) {
      start = i + 1;
      continue;
    }
    break;
  }
  return lines.slice(start).join('\n').trim();
}

function stripTrailingJsonBlock(text: string): string {
  const fence = text.match(/\n---\s*\n\s*[\[{]/);
  if (fence?.index != null && fence.index > 0) {
    return text.slice(0, fence.index).trim();
  }

  for (let i = text.length - 1; i >= 0; i -= 1) {
    const ch = text[i];
    if (ch === '{' || ch === '[') {
      const candidate = text.slice(i).trim();
      try {
        JSON.parse(candidate);
        const leading = text.slice(0, i).trimEnd();
        if (leading.length > 0) return leading;
      } catch {
        break;
      }
    }
  }
  return text;
}

/** 清理 Hermes / Mock 摘要中的技术前缀与尾部 JSON，保留 Markdown 正文。 */
export function sanitizeDeliverableMarkdown(raw: string | null | undefined): string {
  if (!raw) return '';
  let text = String(raw).replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  text = stripLeadingDevPreamble(text);
  text = stripTrailingJsonBlock(text);

  if (text.startsWith('{') || text.startsWith('[')) {
    return '';
  }

  return text.trim();
}

function articleToMarkdown(row: Record<string, unknown>): string | null {
  const body = row.fullContent ?? row.content ?? row.body ?? row.markdown ?? row.text ?? row.previewText;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  if (typeof body === 'string' && body.trim()) {
    const inner = sanitizeDeliverableMarkdown(body);
    if (title && !/^#\s/.test(inner)) return `# ${title}\n\n${inner}`.trim();
    return inner;
  }
  if (title) return `# ${title}`;
  return null;
}

export function markdownFromTaskArticles(output: Record<string, unknown>): string | undefined {
  const articles = output.articles;
  if (!Array.isArray(articles) || !articles.length) return undefined;
  const parts: string[] = [];
  for (const item of articles) {
    if (!item || typeof item !== 'object') continue;
    const md = articleToMarkdown(item as Record<string, unknown>);
    if (md) parts.push(md);
  }
  return parts.length ? parts.join('\n\n---\n\n') : undefined;
}
