import fs from 'fs';
import path from 'path';

export const MINIMAX_CONFIG_PATH = path.join(process.cwd(), 'config', 'minimax.local.json');

export interface MinimaxConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export function loadMinimaxConfig(): MinimaxConfig | null {
  if (!fs.existsSync(MINIMAX_CONFIG_PATH)) return null;
  const raw = JSON.parse(fs.readFileSync(MINIMAX_CONFIG_PATH, 'utf-8')) as Partial<MinimaxConfig>;
  const apiKey = String(raw.apiKey ?? '').trim();
  if (!apiKey) return null;
  return {
    baseUrl: String(raw.baseUrl ?? 'https://api.minimaxi.com/v1').replace(/\/$/, ''),
    model: String(raw.model ?? 'MiniMax-M3'),
    apiKey,
  };
}

export function getMinimaxChatCompletionsUrl(config: MinimaxConfig): string {
  return `${config.baseUrl}/chat/completions`;
}

/** 去掉 MiniMax-M3 等模型附带的思考块（含未闭合标签） */
export function stripThinkingBlocks(text: string): string {
  let t = text.trim();
  t = t.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '');
  t = t.replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '');
  t = t.replace(/<think[^>]*>[\s\S]*/gi, '');
  t = t.replace(/<think>[\s\S]*/gi, '');
  return t.trim();
}

/** 从首个 { 起做括号平衡，截取完整 JSON 对象 */
export function extractBalancedJsonObject(text: string): string | null {
  const cleaned = stripThinkingBlocks(text);
  const start = cleaned.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJsonText(content: string): string {
  const stripped = stripThinkingBlocks(content);
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const balanced = extractBalancedJsonObject(stripped);
  if (balanced) return balanced;

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start >= 0 && end > start) return stripped.slice(start, end + 1);

  return stripped;
}

export function parseModelJsonContent<T>(content: string): T {
  const attempts = [
    () => JSON.parse(extractJsonText(content)),
    () => {
      const b = extractBalancedJsonObject(content);
      if (!b) throw new Error('no balanced json');
      return JSON.parse(b);
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return attempt() as T;
    } catch (e) {
      lastError = e;
    }
  }

  const preview = stripThinkingBlocks(content).slice(0, 160).replace(/\s+/g, ' ');
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`模型返回无法解析为 JSON：${detail}；片段：${preview}`);
}

export async function generateJson<T>(prompt: string): Promise<T> {
  const config = loadMinimaxConfig();
  if (!config) {
    throw new Error(
      'MiniMax 未配置：请在 config/minimax.local.json 中填入 apiKey（该文件不会提交到 git）',
    );
  }

  const response = await fetch(getMinimaxChatCompletionsUrl(config), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            '你是 JSON 生成器。只输出一个合法 JSON 对象，禁止输出思考过程、markdown、代码块或任何 JSON 以外的文字。',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  const body = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    const detail = body.error?.message ?? response.statusText;
    throw new Error(`MiniMax API error (${response.status}): ${detail}`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('MiniMax API returned empty content');
  }

  return parseModelJsonContent<T>(content);
}

/** 连通性自检（供脚本或运维调用） */
export async function checkMinimaxConnection(): Promise<{
  ok: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
}> {
  const config = loadMinimaxConfig();
  if (!config) {
    return { ok: false, error: '未配置 config/minimax.local.json 或 apiKey 为空' };
  }
  const started = Date.now();
  try {
    await generateJson<{ ok: boolean }>('返回 JSON: {"ok":true}');
    return { ok: true, model: config.model, latencyMs: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      model: config.model,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
