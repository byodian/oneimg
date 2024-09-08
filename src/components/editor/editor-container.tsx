'use client'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import type { ActionType, Content, EditorMethods } from '@/types/common'
import { cn } from '@/lib/utils'

type EditorProps = {
  initialContent?: Content;
  onContentUpdate: (content: Content, actionType: ActionType) => void;
  titlePlaceholder?: string;
}

const EditorContainer = forwardRef<EditorMethods, EditorProps>(
  ({ initialContent, onContentUpdate, titlePlaceholder }: EditorProps, ref) => {
    // 标题编辑器
    const titleEditor = useEditor({
      extensions: [Document, Paragraph, Text, Placeholder.configure({
        placeholder: titlePlaceholder || '请输入标题',
      })],
      content: initialContent?.title || '',
      editorProps: {
        attributes: {
          class: 'focus:outline-none max-w-full font-bold text-base',
        },
      },
      immediatelyRender: false,
    })

    // 正文编辑器
    const contentEditor = useEditor({
      extensions: [Document, Paragraph, Text, Italic, Bold, Underline, BulletList, OrderedList, ListItem, Placeholder.configure({
        placeholder: '请输入正文',
      })],
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

    return (
      <div className={cn('mb-6 flex flex-col gap-1 editor-content')}>
        <EditorContent editor={titleEditor} />
        <EditorContent editor={contentEditor} />
      </div>
    )
  },
)

EditorContainer.displayName = 'EditorContainer'
export { EditorContainer }
