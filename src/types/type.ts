export interface Content {
  id?: number;
  title: string;
  content?: string;
  uploadFiles?: UploadFiles;
  createdAt?: string;
  updatedAt?: string;
  parentId?: number;
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
//   uid: number,
//   name: string,
//   size?: number,
//   status?: UploadStatus,
//   raw?: UploadRawFile,
//   percent?: number,
// }

export interface UploadFile {
  uid: number,
  name: string,
  raw: Blob,
}

export interface ImageFile {
  uid: number,
  name: string,
  src: string,
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

export interface EditorMethods {
  reset: () => void;
  isEmpty: () => boolean;
}

export type ActionType = 'SET_TITLE' | 'SET_CONTENT'
