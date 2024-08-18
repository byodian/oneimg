'use client'
import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Bold from '@tiptap/extension-bold'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import { ThumbnailWithFileReader } from '@/components/thumbnail'
import type { UploadFile, UploadFiles, UploadRawFile } from '@/types/upload'
import { getUid } from '@/types/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ImageContent } from '@/types/type'
import { useToast } from '@/components/ui/use-toast'

type EditorProps = {
  onSubmit: (content: any) => Promise<void>;
}

export default function Editor({ onSubmit }: EditorProps) {
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const [uploadFiles, setUploadFiles] = useState<UploadFiles>([])
  const { toast } = useToast()
  // 标题编辑器
  const titleEditor = useEditor({
    extensions: [Document, Paragraph, Text, Placeholder.configure({
      placeholder: '请输入标题',
    })],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-full font-bold text-base',
      },
    },
    onUpdate: ({ editor }) => {
      console.log(editor.getHTML())
    },
  })

  // 正文编辑器
  const contentEditor = useEditor({
    extensions: [Document, Paragraph, Text, Bold, Underline, BulletList, OrderedList, ListItem, Placeholder.configure({
      placeholder: '请输入正文',
    })],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-full text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      console.log(editor.getHTML())
    },

  })

  function handleFiles(files: File[]) {
    if (uploadFiles.length + files.length > 8) {
      toast({
        title: '最多上传8张图片',
        description: '最多上传8张图片',
      })
      return
    }

    if (files && files.length) {
      const uploadFiles: UploadFiles = []

      for (const file of files) {
        console.log(file.name, file.type)
        const rawFile = file as UploadRawFile
        const uid = getUid()
        rawFile.uid = uid

        const uploadFile: UploadFile = {
          name: file.name,
          uid,
          status: 'ready',
          percent: 0,
          size: rawFile.size || 0,
          raw: rawFile,
        }
        uploadFiles.push(uploadFile)
      }

      setUploadFiles(prevUploadFiles => [...prevUploadFiles, ...uploadFiles])
    }
  }

  // 文件选择器改变事件
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    console.log(files)
    if (!files) {
      return
    }

    handleFiles(Array.from(files))
    // 允许前后两次选择相同文件
    // 在文件选择后，将 input 的值重置为空字符串，以便下次选择相同文件时能触发 onChange 事件
    event.target.value = ''
  }

  // 打开文件选择器
  const handleFileSelect = () => {
    if (uploadRef.current) {
      uploadRef.current.click()
    }
  }

  /**
   * 移除文件
   * @param uploadFile
   */
  const handleRemove = (uploadFile: UploadFile) => {
    console.log(uploadFile)
    const filteredUploadFiles = uploadFiles.filter(item => item.uid !== uploadFile.uid)
    setUploadFiles(filteredUploadFiles)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const images: ImageContent[] = uploadFiles.map(item => ({
      raw: item.raw,
      alt: item.name,
    }))

    const newContent = { title: titleEditor?.getHTML(), content: contentEditor?.getHTML(), images }
    try {
      await onSubmit(newContent)
      titleEditor?.commands.clearContent()
      contentEditor?.commands.clearContent()
      setUploadFiles([])
    } catch (error) {
      toast({
        title: '提交失败',
        description: '请重试',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="editor-container">
      <div className="border rounded-[6px] p-3 overflow-auto bg-white relative">
        <div className="mb-6 flex flex-col gap-1 editor-content">
          <EditorContent editor={titleEditor} />
          <EditorContent editor={contentEditor} />
        </div>

        <div className="editor-footer">
          {uploadFiles.length > 0 && <ul className="upload-preview grid grid-cols-4 gap-2 mb-6">
            { uploadFiles.map(item =>
                <li key={item.uid || item.name } className="h-[85px] group flex items-center gap-2 relative">
                  <ThumbnailWithFileReader file={item.raw} width={120} className="object-cover w-full h-full" />
                  <div className="flex items-center justify-center absolute right-1 top-1 w-4 h-4 bg-gray-700 rounded-full" onClick={() => handleRemove(item)}>
                    <X className="cursor-pointer text-white" width={12} height={12} />
                  </div>
                </li>)
            }</ul>}

          <div className="editor-footer-actions flex items-center gap-2">
            <div className="editor-footer-actions-left">
              <Input
                type="file"
                multiple
                onChange={handleChange}
                ref={uploadRef}
                className="hidden"
                accept="image/*"
              />
              <ImagePlus onClick={handleFileSelect} width={18} height={18} />
            </div>
            <div className="editor-footer-actions-right flex ml-auto gap-2">
              <Button type="button" variant="outline">取消</Button>
              <Button type="submit" disabled={titleEditor?.isEmpty}>保存</Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
