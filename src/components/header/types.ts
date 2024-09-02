import type { ImageFile } from '@/types/common'

export interface ExportOption {
  scale: number;
  embedText?: string;
  mimeType?: string;
}

export interface ExportImage {
  id: string;
  data: Blob
}

export interface ExportContent {
  id: number;
  title: string;
  content?: string;
  parentId?: number;
  uploadFiles?: ImageFile[];
}

export interface ExportJSON {
  type: 'oneimg';
  version: number;
  source: string;
  data: ExportContent[];
}
