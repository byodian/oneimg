export type Content = {
  id?: number;
  title: string;
  content?: string;
  images?: ImageContent[];
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

export type ImageContent = {
  raw?: File;
  alt?: string;
  uid: number;
}
