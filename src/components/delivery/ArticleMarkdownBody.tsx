import { Fragment, type ReactNode, useMemo } from 'react';

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${partIndex++}`}>{text.slice(lastIndex, match.index)}</Fragment>
      );
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b-${partIndex++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c-${partIndex++}`}>{token.slice(1, -1)}</code>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t-${partIndex++}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes.length ? nodes : [text];
}

function parseMarkdownBlocks(content: string): ReactNode[] {
  const lines = content.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      nodes.push(<h1 key={key++}>{parseInline(line.slice(2), `h1-${key}`)}</h1>);
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={key++}>{parseInline(line.slice(3), `h2-${key}`)}</h2>);
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={key++}>{parseInline(line.slice(4), `h3-${key}`)}</h3>);
      i += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      nodes.push(
        <blockquote key={key++}>
          {quoteLines.map((quoteLine, index) => (
            <p key={index}>{parseInline(quoteLine, `q-${key}-${index}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i += 1;
      }
      nodes.push(
        <ul key={key++}>
          {items.map((item, index) => (
            <li key={index}>{parseInline(item, `li-${key}-${index}`)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s:|-]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const rows = tableLines
        .filter((_, index) => index !== 1)
        .map((row) =>
          row
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell, cellIndex, cells) => !(cellIndex === 0 && cell === '') && !(cellIndex === cells.length - 1 && cell === ''))
        )
        .filter((cells) => cells.some(Boolean));
      if (rows.length) {
        const [head, ...body] = rows;
        nodes.push(
          <div key={key++} className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {head.map((cell, index) => (
                    <th
                      key={index}
                      className="border px-2 py-1.5 text-left font-semibold"
                      style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-02)' }}
                    >
                      {parseInline(cell, `th-${key}-${index}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border px-2 py-1.5 align-top"
                        style={{ borderColor: 'var(--neutral-divider-02)' }}
                      >
                        {parseInline(cell, `td-${key}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('> ') &&
      !/^[-*] /.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    nodes.push(<p key={key++}>{parseInline(paraLines.join(' '), `p-${key}`)}</p>);
  }

  return nodes;
}

export default function ArticleMarkdownBody({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return <article className={`geo-article-markdown ${className}`.trim()}>{blocks}</article>;
}
