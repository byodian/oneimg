export interface Content {
  id?: number;
  title: string;
  content?: string;
  uploadFiles?: ImageFile[];
  // createdAt?: string;
  // updatedAt?: string;
  parentId?: number;
  type?: 'theme_content' | 'normal_content'
}

export interface ThemeContent {
  id?: number;
  title: string;
  content?: string;
  logoFile?: ImageFile;
  bannerFile?: ImageFile;
  theme: string
}

export type EditorStatus = 'add' | 'edit' | 'close' | 'add_sub' | 'edit_sub'
export interface ContentListProps {
  editorStatus: EditorStatus;
  contents: Content[];
  editorEditStatus?: 'edit' | 'edit_sub';
  onSubmit: (content: Content) => Promise<void>;
  onContentDelete: (content: Content) => void;
  onEditorStatusChange: (status: EditorStatus) => void;
}

export type UploadFiles = UploadFile[]

export type UploadStatus = 'ready' | 'success' | 'fail' | 'uploading'

// export interface UploadFile {
//   uid: number;
//   name: string;
//   size?: number;
//   status?: UploadStatus;
//   raw?: UploadRawFile;
//   percent?: number;
// }

export interface UploadFile {
  uid: number;
  name: string;
  raw: Blob;
  compressRatio?: string;
}

export interface ImageBase {
  dataUrl: string;
  type?: string;
  name?: string;
}

export interface ImageFile {
  uid: number;
  name: string;
  dataUrl: string;
  type?: string;
}

export interface UploadRawFile extends File {
  uid: number;
}

export interface UploadRequestOptions {
  action: string;
  method: string;
  data?: Record<string, string | Blob | [Blob, string]>;
  filename: string;
  bodyType: 'json' | 'form-data' | 'file';
  file: UploadRawFile;
  headers?: Headers | Record<string, string | number | null | undefined>;
  onError: (e: Error) => void;
  onProgress: (e: UploadProgressEvent) => void;
  onSuccess: (response: any) => void;
  withCredentials?: boolean;
}

export interface UploadProgressEvent extends ProgressEvent {
  percent: number;
}

// 编辑器向父组件暴露的方法
export interface EditorMethods {
  reset: () => void;
  isEmpty: () => boolean;
  setImage: (url: string) => void;
}

// 编辑器内容更新触发类型
export type ActionType = 'SET_TITLE' | 'SET_CONTENT'

// Preview
export interface PreviewRef {
  containerRef: React.RefObject<HTMLDivElement>,
  itemRefs: React.RefObject<{ [key: string]: HTMLLIElement }>,
}

export interface PreviewItem {
  id: string;
  ref: React.RefObject<HTMLElement>;
}

export type ThemeColor = 'tech_blue' | 'vibrant_orange' | 'rose_red'
