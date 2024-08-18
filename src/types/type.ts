export type Content = {
  id: string | number;
  title: string;
  content?: string;
  images?: ImageContent[];
  createdAt?: string;
  updatedAt?: string;
  children?: Content[];
}

export type ContentListProps = {
  contents: Content[];
  handleContentEdit: handleContentEdit;
  handleContentDelete: handleContentDelete;
}

export type ImageContent = {
  raw?: File;
  alt?: string;
}

export type handleContentEdit = (content: Content) => void;
export type handleContentDelete = (content: Content) => void;
export type handleContentAdd = (content: Content) => void;
export type handleSubContentAdd = (content: Content) => void;
export type handleContentPreview = (content: Content) => void;
export type handleContentSave = (content: Content) => void;
export type handleContentCancel = (content: Content) => void;