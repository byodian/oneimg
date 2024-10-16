'use client'
import { BubbleMenu } from '@tiptap/react'
import { BoldIcon, CodeIcon, ItalicIcon, ListIcon, ListOrderedIcon, Minus, TextQuote, UnderlineIcon } from 'lucide-react'
import type { Editor } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib'
import { usePlatform } from '@/hooks/use-platform'

type EditorBubbleMenuProps = {
  editor: Editor
}

const buttonVariants = (tag: string, contentEditor: Editor, options = {}) => {
  const isActive = contentEditor?.isActive(tag, options) ? 'bg-[#666]' : ''

  return cn(isActive, 'hover:text-white hover:bg-[#3d3d3d] bg-none text-white w-6 h-6')
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const platform = usePlatform()

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 0 }}>
      <TooltipProvider delayDuration={0}>
        <div className="bg-black flex gap-x-1 border border-gray-50 px-2.5 py-1.5 rounded-md relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                variant="ghost"
                size="icon"
                disabled={
                  !editor.can()
                    .chain()
                    .focus()
                    .toggleBold()
                    .run()
                }
                className={buttonVariants('bold', editor)}
              >
                <BoldIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>粗体</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">B</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">B</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={
                  !editor.can()
                    .chain()
                    .focus()
                    .toggleItalic()
                    .run()
                }
                className={buttonVariants('italic', editor)}
              >
                <ItalicIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>斜体</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">i</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">i</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                variant="ghost"
                size="icon"
                disabled={
                  !editor.can()
                    .chain()
                    .focus()
                    .toggleUnderline()
                    .run()
                }
                className={buttonVariants('underline', editor)}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>下划线</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">U</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">U</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={
                  !editor.can()
                    .chain()
                    .focus()
                    .toggleCode()
                    .run()
                }
                className={buttonVariants('code', editor)}
              >
                <CodeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>代码</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">E</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">E</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={buttonVariants('orderedList', editor)}
              >
                {/* ListChecks */}
                {/* ListTodo */}
                <ListOrderedIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>有序列表</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⇧</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">7</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⇧</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">7</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={buttonVariants('bulletList', editor)}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>无序列表</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⇧</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">8</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⇧</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">8</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={buttonVariants('blockquote', editor)}
              >
                <TextQuote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              <div className="flex items-center gap-x-0.5">
                <span>引用</span>
                {platform === 'mac' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⌘</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⇧</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">B</span>
                </>}
                {platform === 'windows' && <>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">Ctrl</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">⇧</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-500 rounded-sm">B</span>
                </>}
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className={buttonVariants('horizontalRule', editor)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-white bg-black py-1 px-2 rounded-sm text-sm">
              分割线
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider >
    </BubbleMenu>
  )
}
