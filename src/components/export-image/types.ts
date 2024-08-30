export interface ExportOption {
  scale: number;
  embedText?: string;
  mimeType?: string;
}

export interface ExportImage {
  id: string;
  data: Blob
}
