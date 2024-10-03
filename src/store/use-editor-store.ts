import { create } from 'zustand'
import type { EditorType } from '@/types/common'
interface EditorStore {
  editorType: EditorType;
  editingContentId: number | null;
  parentContentId: number | null,
  setParentContentId: (editingContentId: number | null) => void;
  setEditorType: (editorType: EditorType) => void;
  setEditingContentId: (editingContentId: number | null) => void;
}

export const useEditorStore = create<EditorStore>(set => ({
  editorType: 'close',
  editingContentId: null,
  parentContentId: null,
  setEditorType: editorType => set({ editorType }),
  setEditingContentId: editingContentId => set({ editingContentId }),
  setParentContentId: parentContentId => set({ parentContentId }),
}))
