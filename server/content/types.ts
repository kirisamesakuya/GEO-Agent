export interface ContentItem {
  id: string;
  batchId: string;
  projectId?: string;
  title: string;
  platform: string;
  targetQuestionsJson?: string;
  publishStatus?: string;
  previewText: string;
  fullContent: string;
  structure: string;
  generationMetaJson?: string;
  qualityChecksJson?: string;
  effectBaselineJson?: string;
  effectVerificationJson?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBatch {
  id: string;
  brandName: string;
  platform: string;
  projectId?: string;
  taskId?: string;
  articleCount: number;
  status: 'generating' | 'ready' | 'partial' | 'failed';
  items: ContentItem[];
  createdAt: string;
  updatedAt: string;
}
