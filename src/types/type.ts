export type Content = {
  id?: number;
  title: string;
  content?: string;
  uploadFiles?: UploadFiles;
  createdAt?: string;
  updatedAt?: string;
  children?: Content[];
}

export type EditorStatus = 'add' | 'edit' | 'close'
export type ContentListProps = {
  editorStatus: EditorStatus;
  contents: Content[];
  onSubmit: (content: Content) => Promise<void>;
  onContentDelete: (content: Content) => void;
  onSubContentAdd: (parentId: number) => void;
  onEditorStatusChange: (status: EditorStatus) => void;
}

export type UploadFiles = UploadFile[]

export type UploadStatus = 'ready' | 'success' | 'fail' | 'uploading'

export interface UploadFile {
  uid: number,
  name: string,
  size?: number,
  status?: UploadStatus,
  raw?: UploadRawFile,
  percent?: number,
}

export interface UploadRawFile extends File {
  uid: number
}

export interface UploadRequestOptions {
  action: string,
  method: string,
  data?: Record<string, string | Blob | [Blob, string]>,
  filename: string,
  bodyType: 'json' | 'form-data' | 'file',
  file: UploadRawFile,
  headers?: Headers | Record<string, string | number | null | undefined>,
  onError: (e: Error) => void,
  onProgress: (e: UploadProgressEvent) => void,
  onSuccess: (response: any) => void,
  withCredentials?: boolean
}

export interface UploadProgressEvent extends ProgressEvent {
  percent: number
}

export type EditorMethods = {
  reset: () => void;
  isEmpty: () => boolean;
}

export type ActionType = 'SET_TITLE' | 'SET_CONTENT'
