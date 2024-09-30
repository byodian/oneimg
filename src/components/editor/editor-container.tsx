'use client'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Image from '@tiptap/extension-image'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import History from '@tiptap/extension-history'
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, UnderlineIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ActionType, Content, EditorMethods } from '@/types/common'
import { cn } from '@/lib/utils'

type EditorProps = {
  initialContent?: Content;
  onContentUpdate: (content: Content, actionType: ActionType) => void;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
}

const EditorContainer = forwardRef<EditorMethods, EditorProps>(
  ({ initialContent, onContentUpdate, titlePlaceholder, contentPlaceholder }: EditorProps, ref) => {
    // 标题编辑器
    const titleEditor = useEditor({
      extensions: [Document, Paragraph, Text, Placeholder.configure({
        placeholder: titlePlaceholder || '标题',
      }), History],
      content: initialContent?.title || '',
      editorProps: {
        attributes: {
          class: 'focus:outline-none max-w-full font-bold text-xl mb-3',
        },
      },
      immediatelyRender: false,
    })

    // 正文编辑器
    const contentEditor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Italic,
        Bold,
        Underline,
        BulletList,
        OrderedList,
        ListItem,
        Placeholder.configure({
          placeholder: contentPlaceholder || '正文',
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        History,
      ],

      content: initialContent?.content || '',
      editorProps: {
        attributes: {
          class: 'focus:outline-none max-w-full text-sm',
        },
      },
      immediatelyRender: false,
    })

    // 使用 useImperativeHandle 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      reset() {
        titleEditor?.commands.clearContent()
        contentEditor?.commands.clearContent()
      },
      isEmpty() {
        return !titleEditor || titleEditor.isEmpty
      },
      setImage(url: string) {
        if (contentEditor) {
          contentEditor.chain().focus().setImage({ src: url }).run()
        }
      },
    }))

    // 当编辑器内容变化，触发编辑器 update 事件
    useEffect(() => {
      if (titleEditor && contentEditor) {
        titleEditor.on('update', () => {
          onContentUpdate({
            title: titleEditor.getHTML(),
            content: contentEditor.getHTML(),
          }, 'SET_TITLE')
        })

        contentEditor.on('update', () => {
          onContentUpdate({
            title: titleEditor.getHTML(),
            content: contentEditor.getHTML(),
          }, 'SET_CONTENT')
        })
      }
    }, [titleEditor, contentEditor, onContentUpdate])

    const buttonVariants = (tag: string, options = {}) => {
      const isActive = contentEditor?.isActive(tag, options) ? 'bg-[#666]' : ''

      return cn(isActive, 'hover:text-white hover:bg-[#3d3d3d] bg-none text-white w-6 h-6')
    }

    return (
      <div className={cn('mb-6 flex flex-col gap-1 editor-content')}>
        <EditorContent editor={titleEditor} />
        {contentEditor && <BubbleMenu editor={contentEditor} tippyOptions={{ duration: 0 }}>
          <div className="bg-black flex gap-x-1 border border-gray-50 px-2 py-1.5 rounded-md">
            <Button
              type="button"
              onClick={() => contentEditor.chain().focus().toggleBold().run()}
              variant="ghost"
              size="icon"
              disabled={
                !contentEditor.can()
                  .chain()
                  .focus()
                  .toggleBold()
                  .run()
              }
              className={buttonVariants('bold')}
            >
              <BoldIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => contentEditor.chain().focus().toggleItalic().run()}
              disabled={
                !contentEditor.can()
                  .chain()
                  .focus()
                  .toggleItalic()
                  .run()
              }
              className={buttonVariants('italic')}
            >
              <ItalicIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => contentEditor.chain().focus().toggleUnderline().run()}
              variant="ghost"
              size="icon"
              disabled={
                !contentEditor.can()
                  .chain()
                  .focus()
                  .toggleUnderline()
                  .run()
              }
              className={buttonVariants('underline')}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 bg-[#666]" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => contentEditor.chain().focus().toggleBulletList().run()}
              className={buttonVariants('bulletList')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => contentEditor.chain().focus().toggleOrderedList().run()}
              className={buttonVariants('orderedList')}
            >
              {/* ListChecks */}
              {/* ListTodo */}
              <ListOrderedIcon className="h-4 w-4" />
            </Button>
            {/* <Button */}
            {/*   variant="ghost" */}
            {/*   size="icon" */}
            {/*   onClick={() => editor.chain().focus().undo().run()} */}
            {/*   disabled={ */}
            {/*     !editor.can() */}
            {/*       .chain() */}
            {/*       .focus() */}
            {/*       .undo() */}
            {/*       .run() */}
            {/*   } */}
            {/* > */}
            {/*   <Undo className="h-4 w-4" /> */}
            {/* </Button> */}
            {/* <Button */}
            {/*   variant="ghost" */}
            {/*   size="icon" */}
            {/*   onClick={() => editor.chain().focus().redo().run()} */}
            {/*   disabled={ */}
            {/*     !editor.can() */}
            {/*       .chain() */}
            {/*       .focus() */}
            {/*       .redo() */}
            {/*       .run() */}
            {/*   } */}
            {/* > */}
            {/*   <Redo className="h-4 w-4" /> */}
            {/* </Button> */}
            {/* <Button */}
            {/*   variant="ghost" */}
            {/*   size="icon" */}
            {/*   onClick={() => editor.chain().focus().toggleHighlight().run()} */}
            {/*   className={buttonVariants('highlight')} */}
            {/*   disabled={ */}
            {/*     !editor.can() */}
            {/*       .chain() */}
            {/*       .focus() */}
            {/*       .toggleLink({ href: textLink }) */}
            {/*       .run() */}
            {/*   } */}
            {/* > */}
            {/*   <Highlighter className="h-4 w-4" /> */}
            {/* </Button> */}
          </div>
        </BubbleMenu>}
        <EditorContent editor={contentEditor} />
      </div>
    )
  },
)

EditorContainer.displayName = 'EditorContainer'
export { EditorContainer }
