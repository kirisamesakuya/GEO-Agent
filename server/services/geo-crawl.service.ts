import type { CrawlHtmlMeta, CrawlSnapshot } from '../lib/geo-crawl-snapshot.js';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 512_000;

const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'ClaudeBot',
  'anthropic-ai',
  'Bytespider',
  'CCBot',
];

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function originOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

async function fetchText(url: string): Promise<{
  status: number;
  text: string;
  contentType: string | null;
  responseTimeMs: number;
}> {
  const started = Date.now();
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'GEO-Agent-PreCrawl/1.0 (+https://geo-agent.local)',
      Accept: 'text/html,text/plain,*/*',
    },
    redirect: 'follow',
  });
  const buf = await res.arrayBuffer();
  const clipped = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
  const text = new TextDecoder('utf-8', { fatal: false }).decode(clipped);
  return {
    status: res.status,
    text,
    contentType: res.headers.get('content-type'),
    responseTimeMs: Date.now() - started,
  };
}

function parseHtmlMeta(html: string, pageUrl: string): CrawlHtmlMeta {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? null;

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const metaDescription = descMatch?.[1]?.trim() ?? null;

  const canonMatch =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  const canonical = canonMatch?.[1]?.trim() ?? null;

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Raw = h1Match?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const h1 = h1Raw || null;

  const jsonLdCount = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length;

  let hasHttps = false;
  try {
    hasHttps = new URL(pageUrl).protocol === 'https:';
  } catch {
    hasHttps = pageUrl.startsWith('https://');
  }

  return { title, metaDescription, canonical, h1, jsonLdCount, hasHttps };
}

function detectBlockedBots(robotsContent: string): string[] {
  const blocked: string[] = [];
  const lower = robotsContent.toLowerCase();
  for (const bot of AI_BOTS) {
    const agentIdx = lower.indexOf(`user-agent: ${bot.toLowerCase()}`);
    if (agentIdx === -1) continue;
    const slice = lower.slice(agentIdx, agentIdx + 400);
    if (/disallow:\s*\//.test(slice) || /disallow:\s*\/\s*$/m.test(slice)) {
      blocked.push(bot);
    }
  }
  return blocked;
}

export async function runGeoPreCrawl(rawUrl: string): Promise<CrawlSnapshot | null> {
  const brandUrl = normalizeUrl(rawUrl);
  if (!brandUrl) return null;

  const fetchAt = new Date().toISOString();
  const errors: string[] = [];
  let partial = false;

  let homepageStatus: number | null = null;
  let homepageError: string | null = null;
  let responseTimeMs = 0;
  let contentType: string | null = null;
  let htmlMeta: CrawlHtmlMeta | null = null;

  try {
    const home = await fetchText(brandUrl);
    homepageStatus = home.status;
    responseTimeMs = home.responseTimeMs;
    contentType = home.contentType;
    if (home.status >= 400) {
      partial = true;
      errors.push(`首页 HTTP ${home.status}`);
    } else if (home.contentType?.includes('text/html')) {
      htmlMeta = parseHtmlMeta(home.text, brandUrl);
    } else {
      partial = true;
      errors.push('首页响应非 HTML');
    }
  } catch (err) {
    partial = true;
    homepageError = err instanceof Error ? err.message : String(err);
    errors.push(`首页抓取失败：${homepageError}`);
  }

  const robotsUrl = `${originOf(brandUrl).replace(/\/$/, '')}/robots.txt`;
  let robotsFetched = false;
  let robotsStatus: number | null = null;
  let robotsContent: string | null = null;
  let robotsError: string | null = null;
  let blockedBots: string[] = [];

  try {
    const robots = await fetchText(robotsUrl);
    robotsFetched = true;
    robotsStatus = robots.status;
    if (robots.status >= 200 && robots.status < 400) {
      robotsContent = robots.text.slice(0, 32_000);
      blockedBots = detectBlockedBots(robotsContent);
    } else {
      partial = true;
      robotsError = `robots.txt HTTP ${robots.status}`;
    }
  } catch (err) {
    partial = true;
    robotsError = err instanceof Error ? err.message : String(err);
    errors.push(`robots.txt 抓取失败：${robotsError}`);
  }

  return {
    brandUrl,
    fetchAt,
    homepage: {
      url: brandUrl,
      status: homepageStatus,
      responseTimeMs,
      contentType,
      error: homepageError,
    },
    htmlMeta,
    robotsTxt: {
      url: robotsUrl,
      fetched: robotsFetched,
      status: robotsStatus,
      content: robotsContent,
      blockedBots,
      error: robotsError,
    },
    partial,
    errors,
  };
}
