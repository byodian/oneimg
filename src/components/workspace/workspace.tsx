import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { ThemeForm } from '@/components/workspace/theme-form'
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

  return (
    <div className="w-[800px] flex flex-col p-8">
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
          <EditorForm
            onSubmit={onContentSubmit}
            className={editorStatus === 'add' ? '' : 'hidden'}
            hideEditor={() => setEditorStatus('close')}
          />
          <Button className={cn('w-full', editorStatus === 'add' ? 'hidden' : '')} onClick={() => setEditorStatus('add')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            添加标题
          </Button>
        </>)}
        {contents.length === 0 && (
          <ThemeForm onSubmit={onThemeContentSubmit} />
        )}
    </div>
  )
}
