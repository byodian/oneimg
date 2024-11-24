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
import HardBreak from '@tiptap/extension-hard-break'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Blockquote from '@tiptap/extension-blockquote'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import { EditorContent, useEditor } from '@tiptap/react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { TrailingNode } from './tailing-node'
import { EditorBubbleMenu } from './editor-bubble-menu'
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
      extensions: [
        Document,
        Paragraph,
        Text,
        HardBreak,
        Placeholder.configure({
          placeholder: titlePlaceholder || '标题',
        }),
        History],
      content: initialContent?.title || '',
      editorProps: {
        attributes: {
          class: 'focus:outline-none max-w-full font-bold text-xl mb-4',
        },
      },
      immediatelyRender: true,
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
        HardBreak,
        HorizontalRule,
        Blockquote,
        Code,
        CodeBlock,
        Placeholder.configure({
          placeholder: contentPlaceholder || '正文',
        }),
        TrailingNode,
        Image.configure({
          inline: false,
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

    return (
      <div className={cn('mb-6 flex flex-col gap-1 editor-content')}>
        <EditorContent editor={titleEditor} />
        {contentEditor && <EditorBubbleMenu editor={contentEditor} />}
        <EditorContent editor={contentEditor} />
      </div>
    )
  },
)

EditorContainer.displayName = 'EditorContainer'
export { EditorContainer }
