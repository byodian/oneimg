import { useState } from 'react'
import { FolderPlus, PlusIcon } from 'lucide-react'
import { ThemeFormDialog } from '@/components/workspace/theme-form-dialog'
import EditorForm from '@/components/editor/editor-form'
import ContentList from '@/components/workspace/content-list'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Content, EditorStatus, ThemeContent } from '@/types/common'

interface WorkspaceProps {
  contents: Content[];
  onContentSubmit: (content: Content) => Promise<void>;
  onThemeContentSubmit: (content: ThemeContent) => Promise<void>;
  onContentDelete: (content: Content) => Promise<void>;
}

export function Workspace(props: WorkspaceProps) {
  const { contents, onContentSubmit, onContentDelete, onThemeContentSubmit } = props
  const [editorStatus, setEditorStatus] = useState<EditorStatus>('close')
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('w-[800px] flex flex-col p-8 min-h-full', contents.length === 0 && 'justify-center')}>
      {contents.length > 0 && (
        <>
          <ContentList
            editorEditStatus="edit"
            editorStatus={editorStatus}
            contents={contents}
            onEditorStatusChange={(status: EditorStatus) => setEditorStatus(status)}
            onContentDelete={onContentDelete}
            onSubmit={onContentSubmit}
          />
          {editorStatus === 'add' ? (
            <EditorForm
              multiple
              onSubmit={onContentSubmit}
              hideEditor={() => setEditorStatus('close')}
            />
          ) : (
            <Button className={cn('w-full')} onClick={() => setEditorStatus('add')}>
              <PlusIcon className="w-4 h-4 mr-2" />
              添加标题
            </Button>
          )}
        </>)}
      {contents.length === 0 && (
        <>
          <div className="flex flex-col gap-4 justify-center items-center w-full h-full max-w-sm mx-auto text-muted-foreground">
            <p>从新建主题开始</p>
            <p>您的所有数据都存储在浏览器本地。</p>
            <Button className="sm:w-[256px]" variant="outline" size="sm" onClick={() => setOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              新建主题
            </Button>
          </div>
          <ThemeFormDialog
            onOpenChange={setOpen}
            onSubmit={onThemeContentSubmit}
            open={open}
          />
        </>
      )}
    </div>
  )
}
