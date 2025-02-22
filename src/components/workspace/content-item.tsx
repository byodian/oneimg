import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import { GripVertical } from 'lucide-react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useEffect, useState } from 'react'
import { SortableItem } from './sortable-item'
import { ContentItemButtons } from './content-item-buttons'
import EditorForm from '@/components/editor/editor-form'
import type { ContainerProps, Content, ContentWithId } from '@/types/common'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/store/use-editor-store'

export function ContentItem(props: ContainerProps) {
  const { onSubmit, handleDialogOpen, item, childItemMap } = props
  const { editorType, setEditorType, editingContentId, setEditingContentId, parentContentId, setParentContentId } = useEditorStore()
  const [disabled, setDisabled] = useState(false)

  // Disable drag and drop, when editing forms or content is topic
  useEffect(() => {
    setDisabled(
      item.type === 'theme_content' || editorType !== 'close' || editingContentId !== null,
    )
  }, [item.type, editorType, editingContentId])

  const childItems = item.id ? childItemMap.get(item.id) : []

  function handleContentEdit(content: ContentWithId) {
    setEditingContentId(content.id)
    setEditorType('close')
  }

  function handleSubContentAdd(parentContent: ContentWithId) {
    // escape editing
    setEditingContentId(null)

    setParentContentId(parentContent.id)
    setEditorType('add_sub')
  }

  function handleEditorHide() {
    // 避免父子之间的编辑冲突
    setEditingContentId(null)
    setEditorType('close')
  }

  async function handleSubContentSubmit(content: Content) {
    onSubmit({
      ...content,
      parentId: parentContentId!,
    })
  }

  return (
    <SortableItem item={item} disabled={disabled}>
      {editingContentId === item.id ? (
        <div className="my-2 ml-6">
          <EditorForm
            titlePlaceholder={item.type === 'theme_content' ? '项目名称' : item.parentId ? '子标题' : '标题'}
            contentPlaceholder={item.type === 'theme_content' ? '描述' : '正文'}
            multiple
            initialContent={item}
            onSubmit={onSubmit}
            hideEditor={handleEditorHide}
          />
        </div>
      ) : (
        <div className={cn(
          !item.parentId ? 'group font-bold' : 'group/child ',
          item.type === 'theme_content' ? 'cursor-default' : 'cursor-pointer',
          'px-6 relative w-full',
        )}>
          {/* drag handle and theme content doesn't diaplay */}
          <div className={cn(
            disabled && '!hidden',
            !item.parentId ? 'group-hover:block' : 'group-hover/child:block',
            'hidden absolute left-0 top-1/2 -translate-y-1/2 cursor-move',
          )}>
            <GripVertical className="w-4 h-4" />
          </div>

          {/* 桌面端展示 */}
          <a href={`/#${item.id}`} className="min-h-[61px] relative border-b border-b-border py-4 hidden sm:block">
            <div className="mr-28">{parse(DOMPurify.sanitize(item.title))}</div>
            <ContentItemButtons
              item={item}
              onContentEdit={handleContentEdit}
              onDialogOpen={handleDialogOpen}
              onSubContentAdd={handleSubContentAdd}
            />
          </a>

          {/* 移动端展示 */}
          <div className="min-h-[61px] relative border-b border-b-border py-4 sm:hidden" onClick={e => e.preventDefault()}>
            <div className="mr-28 select-none">{parse(DOMPurify.sanitize(item.title))}</div>
            <ContentItemButtons
              item={item}
              onContentEdit={handleContentEdit}
              onDialogOpen={handleDialogOpen}
              onSubContentAdd={handleSubContentAdd}
            />
          </div>
        </div>
      )}

      {childItems && childItems.length > 0 && (
        <SortableContext items={childItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
          {childItems.map(childItem => (
            <ContentItem
              key={childItem.id}
              item={childItem}
              childItemMap={childItemMap}
              onSubmit={onSubmit}
              handleDialogOpen={handleDialogOpen}
            />
          ))}

        </SortableContext>
      )}

      {/* Only the root node can have sub-content */}
      {editorType === 'add_sub' && parentContentId === item.id && !item.parentId && (
        <div className="my-2 ml-10">
          <EditorForm
            multiple
            titlePlaceholder="子标题"
            onSubmit={handleSubContentSubmit}
            hideEditor={handleEditorHide}
          />
        </div>
      )}
    </SortableItem>
  )
}
