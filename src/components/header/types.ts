import type { ImageFile } from '@/types'

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
  type?: 'theme_content' | 'normal_content'
  uploadFiles?: ImageFile[];
}

export interface ExportJSON {
  type: 'oneimg';
  version: number;
  source: string;
  theme: string;
  themeColor: string;
  data: ExportContent[];
}
