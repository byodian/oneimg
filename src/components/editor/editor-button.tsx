'use client'
import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { UploadFile, UploadFiles } from '@/types/type'
import { getUid } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

function handleFiles(files: File[]) {
  const uploadFiles: UploadFiles = []

  for (const file of files) {
    const uploadFile: UploadFile = {
      name: file.name,
      uid: getUid(),
      raw: new Blob([file], { type: file.type }),
    }
    uploadFiles.push(uploadFile)
  }

  return uploadFiles
}

type EditorFooterProps = {
  uploadFiles?: UploadFiles;
  hideEditor: () => void;
  disabled: boolean;
  onFilesChange: (UploadFiles?: UploadFiles) => void
}

export default function EditorButton(props: EditorFooterProps) {
  const { uploadFiles, disabled, hideEditor, onFilesChange } = props
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  // 文件选择器改变事件
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) {
      return
    }
    const currentFiles = uploadFiles || []
    const newFiles = Array.from(files)

    if (currentFiles.length + newFiles.length > 8) {
      toast({
        title: '最多上传8张图片',
        description: '最多上传8张图片',
      })
      return
    }

    if (uploadFiles) {
      onFilesChange([...uploadFiles, ...handleFiles(newFiles)])
    } else {
      onFilesChange(handleFiles(newFiles))
    }
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

  return (
    <div className="flex items-center gap-2">
      <div>
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
        <Button type="button" variant="outline" onClick={hideEditor}>取消</Button>
        <Button type="submit" disabled={disabled}>保存</Button>
      </div>
    </div>
  )
}

