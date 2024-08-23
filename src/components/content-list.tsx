import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import EditorForm from './editor/editor-form'
import type { Content, ContentListProps } from '@/types/type'

export default function ContentList(props: ContentListProps) {
  const { contents, editorStatus, onSubmit, onContentDelete, onSubContentAdd, onEditorStatusChange } = props
  const [editingContentId, setEditingContentId] = useState<number | null>(null)

  const handleContentEdit = (content: Content) => {
    setEditingContentId(content.id!)
    onEditorStatusChange('edit')
  }

  return (
    <ul className="mb-2">
      {contents.map(content => (
        <li key={content.id} className="group relative p-2 text-lg cursor-pointer rounded-sm">
          {editorStatus === 'edit' && editingContentId === content.id ? (
            <EditorForm
              initialContent={content}
              onSubmit={onSubmit}
              hideEditor={() => onEditorStatusChange('close')}
            />
          ) : (
            <div className="font-bold">
              {parse(DOMPurify.sanitize(content.title))}
              <div className="hidden group-hover:flex absolute right-4 top-0 gap-4">
                <div className="h-[44px] flex items-center" onClick={() => onSubContentAdd(content.id!)}>
                  <Plus className="cursor-pointer text-black" width={18} height={18}/>
                </div>
                <div className="h-[44px] flex items-center" onClick={() => handleContentEdit(content)}>
                  <Pencil className="cursor-pointer text-black" width={18} height={18}/>
                </div>
                <div className="h-[44px] flex items-center" onClick={() => onContentDelete(content)}>
                  <Trash2 className="cursor-pointer text-black" width={18} height={18}/>
                </div>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
