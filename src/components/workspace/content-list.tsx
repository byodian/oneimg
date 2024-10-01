import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import EditorForm from '../editor/editor-form'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Content, ContentListProps } from '@/types/common'
import { cn } from '@/lib/utils'

export default function ContentList(props: ContentListProps) {
  const { contents, editorStatus, editorEditStatus, onSubmit, onContentDelete, onEditorStatusChange } = props
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [curContent, setCurContent] = useState<Content>({} as Content)

  function handleContentEdit(content: Content) {
    setEditingContentId(content.id!)
    if (content.parentId) {
      onEditorStatusChange('edit_sub')
    } else {
      onEditorStatusChange('edit')
    }
  }

  function handleSubContentAdd(content: Content) {
    setEditingContentId(content.id!)
    onEditorStatusChange('add_sub')
  }

  function handleEditorHide() {
    // 避免父子之间的编辑冲突
    setEditingContentId(null)
    onEditorStatusChange('close')
  }

  // 筛选出顶级内容（没有 parentId），或者将第一个元素视为顶级内容
  const parentContents = useMemo(() => {
    const filteredContents = contents.filter(content => !content.parentId)
    return filteredContents.length > 0 ? filteredContents : contents
  }, [contents])

  const childContentsMap = useMemo(() => {
    const childContents = new Map()
    for (const content of contents) {
      if (content.parentId) {
        if (!childContents.has(content.parentId)) {
          childContents.set(content.parentId, [])
        }
        childContents.get(content.parentId)!.push(content)
      }
    }
    return childContents
  }, [contents])

  async function handleSubContentSubmit(content: Content) {
    onSubmit({
      ...content,
      parentId: editingContentId!,
    })
  }

  function handleDialogOpen(content: Content) {
    setIsOpen(true)
    setCurContent(content)
  }

  return (

    <TooltipProvider delayDuration={0}>
      <ul className="mb-2">
        {parentContents.map(content => (
          <li
            key={content.id}
            className={
              cn(
                !content.parentId ? 'text-lg text-primary' : 'text-base ml-4 text-secondary-foreground',
                content.type === 'theme_content' && 'text-2xl',
                'relative cursor-pointer',
              )
            }
          >
            {editorStatus === editorEditStatus && editingContentId === content.id ? (
              <div className="my-2">
                <EditorForm
                  titlePlaceholder={content.type === 'theme_content' ? '项目名称' : '标题'}
                  contentPlaceholder={content.type === 'theme_content' ? '描述' : '正文'}
                  multiple
                  initialContent={content}
                  onSubmit={onSubmit}
                  hideEditor={handleEditorHide}
                />
              </div>
            ) : (
              <a className={cn(!content.parentId ? 'group font-bold' : 'group/child ', 'block border-b border-b-border py-4')} href={`/#${content.id}`}>
                <div className="mr-28">{parse(DOMPurify.sanitize(content.title))}</div>
                <div className={cn(!content.parentId ? 'group-hover:flex' : 'group-hover/child:flex', 'hidden absolute right-4 top-0 gap-4')}>
                  {content.type === 'normal_content' && (
                    <>
                      <div className="h-[60px] flex items-center" onClick={() => handleContentEdit(content)}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Pencil className="cursor-pointer text-black" width={18} height={18} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-white bg-black">{!content.parentId ? '编辑标题' : '编辑子标题'}</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="h-60px] flex items-center" onClick={() => handleDialogOpen(content)}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Trash2 className="cursor-pointer text-black" width={18} height={18} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-white bg-black">{!content.parentId ? '删除标题' : '删除子标题'}</TooltipContent>
                        </Tooltip>
                      </div>
                      {!content.parentId && <div className="h-[60px] flex items-center" onClick={() => handleSubContentAdd(content)}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Plus className="cursor-pointer text-black" width={18} height={18} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-white bg-black">添加子标题</TooltipContent>
                        </Tooltip>
                      </div>}
                    </>
                  )}
                  {/* 主题内容只支持编辑 */}
                  {content.type === 'theme_content' && <div className="h-[60px] flex items-center" onClick={() => handleContentEdit(content)}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Pencil className="cursor-pointer text-black" width={18} height={18} />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-white bg-black">编辑主题</TooltipContent>
                    </Tooltip>
                  </div>
                  }
                </div>
              </a>
            )}

            {childContentsMap.get(content.id) && (
              <ContentList
                editorEditStatus="edit_sub"
                contents={childContentsMap.get(content.id)}
                editorStatus={editorStatus}
                onSubmit={onSubmit}
                onContentDelete={onContentDelete}
                onEditorStatusChange={onEditorStatusChange}
              />
            )}

            {editorStatus === 'add_sub' && editingContentId === content.id && !content.parentId && (
              <div className="my-2 ml-4">
                <EditorForm
                  multiple
                  titlePlaceholder="子标题"
                  onSubmit={handleSubContentSubmit}
                  hideEditor={handleEditorHide}
                />
              </div>
            )}
          </li>
        ))}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogDescription className="hidden">确定删除此标题以及子标题吗?</DialogDescription>
            </DialogHeader>
            <div className="flex">
              <span>您确定永久删除</span>
              {DOMPurify && typeof DOMPurify.sanitize === 'function' && <div className="font-bold">{parse(DOMPurify.sanitize(curContent.title))}</div>}
              <span>{`${!curContent.parentId ? '和它的子标题' : ''}？`}</span>
            </div>
            <DialogFooter>
              <div>
                <Button className="mr-4" variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                <Button variant="destructive" onClick={() => {
                  onContentDelete(curContent)
                  setIsOpen(false)
                }}>确定</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ul>

    </TooltipProvider>
  )
}
