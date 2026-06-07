export const GEO_WEB_OUTPUT_VERSION = 'geoWebOutput.v1';

export const GEO_WEB_OUTPUT_REQUIRED_FIELDS = [
  'audit',
  'data',
  'metrics',
  'findings',
  'artifacts',
  'actionPlan',
] as const;

export type GeoWebOutputRequiredField = (typeof GEO_WEB_OUTPUT_REQUIRED_FIELDS)[number];

export type GeoWebAudit = {
  title?: string;
  summary?: string;
  totalScore?: number;
  scores?: Record<string, number>;
  [key: string]: unknown;
};

export type GeoWebFinding = {
  id?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  title?: string;
  evidence?: string;
  recommendation?: string;
  [key: string]: unknown;
};

export type GeoWebArtifact = {
  id?: string;
  type?:
    | 'markdown'
    | 'json'
    | 'schema_jsonld'
    | 'llms_txt'
    | 'robots_patch'
    | 'content_rewrite_patch'
    | 'pdf'
    | string;
  name?: string;
  content?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresHumanApproval?: boolean;
  preview?: string;
  url?: string;
  [key: string]: unknown;
};

export type GeoWebActionPlanItem = {
  priority?: 'P0' | 'P1' | 'P2';
  owner?: 'brand' | 'provider' | 'platform';
  task?: string;
  expectedImpact?: string;
  [key: string]: unknown;
};

export type GeoWebOutput = {
  audit: GeoWebAudit;
  data: Record<string, unknown>;
  metrics: Record<string, unknown>;
  findings: GeoWebFinding[];
  artifacts: GeoWebArtifact[];
  actionPlan: GeoWebActionPlanItem[];
  contractVersion?: string;
  contractValid?: boolean;
  [key: string]: unknown;
};

export type GeoWebOutputValidation = {
  ok: boolean;
  contractValid: boolean;
  missingFields: GeoWebOutputRequiredField[];
  normalized: GeoWebOutput;
};

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

function coerceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function coerceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildAudit(raw: Record<string, unknown>): GeoWebAudit {
  const audit = coerceRecord(raw.audit ?? raw);
  if (Object.keys(audit).length > 0) return audit;
  return {
    title: typeof raw.title === 'string' ? raw.title : undefined,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
  };
}

function buildData(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.data && typeof raw.data === 'object') return coerceRecord(raw.data);
  if (raw.summary || raw.brandMentionSummary) {
    return {
      brandMentionSummary: raw.summary ?? raw.brandMentionSummary,
      competitorAnalysis: raw.competitorAnalysis ?? '',
      contentGap: raw.contentGap ?? '',
      optimizationSuggestions: raw.optimizationSuggestions ?? '',
    };
  }
  return {};
}

/** Normalize Hermes raw output into geoWebOutput.v1 shape with compatibility fallbacks. */
export function normalizeGeoWebOutput(
  raw: Record<string, unknown>,
  runArtifacts?: GeoWebArtifact[]
): GeoWebOutput {
  return {
    ...raw,
    audit: buildAudit(raw),
    data: buildData(raw),
    metrics: coerceRecord(raw.metrics ?? raw.scores),
    findings: coerceArray<GeoWebFinding>(raw.findings),
    artifacts: coerceArray<GeoWebArtifact>(raw.artifacts ?? runArtifacts),
    actionPlan: coerceArray<GeoWebActionPlanItem>(raw.actionPlan),
  };
}

export function validateGeoWebOutput(
  raw: Record<string, unknown>,
  runArtifacts?: GeoWebArtifact[]
): GeoWebOutputValidation {
  const normalized = normalizeGeoWebOutput(raw, runArtifacts);
  const missingFields = GEO_WEB_OUTPUT_REQUIRED_FIELDS.filter(
    (field) => !isPresent(normalized[field])
  );
  const contractValid = missingFields.length === 0;

  return {
    ok: contractValid,
    contractValid,
    missingFields,
    normalized: {
      ...normalized,
      contractVersion: GEO_WEB_OUTPUT_VERSION,
      contractValid,
    },
  };
}

export const GEO_WEB_OUTPUT_CONTRACT = {
  format: 'json',
  version: GEO_WEB_OUTPUT_VERSION,
  requiredFields: [...GEO_WEB_OUTPUT_REQUIRED_FIELDS],
} as const;
