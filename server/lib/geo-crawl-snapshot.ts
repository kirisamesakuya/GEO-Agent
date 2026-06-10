/** Pre-crawl snapshot captured server-side before Hermes GEO detection runs. */

export type CrawlHtmlMeta = {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  h1: string | null;
  jsonLdCount: number;
  hasHttps: boolean;
};

export type CrawlFetchResult = {
  url: string;
  status: number | null;
  responseTimeMs: number;
  contentType: string | null;
  error: string | null;
};

export type CrawlSnapshot = {
  brandUrl: string;
  fetchAt: string;
  homepage: CrawlFetchResult;
  htmlMeta: CrawlHtmlMeta | null;
  robotsTxt: {
    url: string;
    fetched: boolean;
    status: number | null;
    content: string | null;
    blockedBots: string[];
    error: string | null;
  };
  partial: boolean;
  errors: string[];
};

export type RuleFinding = {
  id: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  category: 'technical' | 'schema' | 'crawlers' | 'content_quality';
  title: string;
  impact: string;
  suggestion: string;
  evidence: string;
  source: 'rule';
};

export type RuleScorePreview = {
  scores: Record<string, number>;
  totalScore: number;
  findings: RuleFinding[];
  scoringSource: 'rule';
};
