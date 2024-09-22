'use client'
import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ImageFile } from '@/types/common'
import { compressImage, getUid } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'

async function handleFiles(files: File[], quality?: number, outFormat?: string): Promise<ImageFile[]> {
  quality = quality ?? 0.5
  outFormat = outFormat ?? 'image/jpeg'

  const uploadFiles: ImageFile[] = []

  for (const file of files) {
    const compressedBlob = await compressImage(file, quality, outFormat)

    const uploadFile: ImageFile = {
      name: file.name,
      uid: getUid(),
      dataUrl: compressedBlob.dataUrl,
      type: file.type,
    }
    uploadFiles.push(uploadFile)
  }

  return uploadFiles
}

type EditorFooterProps = {
  uploadFiles?: ImageFile[];
  disabled: boolean;
  quality?: number;
  outputFormat?: string;
  multiple: boolean;
  hideEditor: () => void;
  onFilesChange: (UploadFiles?: ImageFile[]) => void
  setImage: ((url: string) => void) | undefined;
}

export default function EditorButton(props: EditorFooterProps) {
  const { uploadFiles, disabled, hideEditor, onFilesChange, quality, outputFormat, multiple } = props
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  // 文件选择器改变事件
  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files) {
      return
    }
    const currentFiles = uploadFiles || []
    const newFiles = Array.from(files)

    // 多张照片
    if (multiple) {
      if (currentFiles.length + newFiles.length > 8) {
        toast({
          title: '最多上传8张图片',
          description: '最多上传8张图片',
        })
        return
      }

      const compressedFiles = await handleFiles(newFiles, quality, outputFormat)
      if (uploadFiles) {
        onFilesChange([...uploadFiles, ...compressedFiles])
      } else {
        onFilesChange(compressedFiles)
      }

      // for (const file of compressedFiles) {
      //   if (setImage) {
      //     setImage(file.dataUrl)
      //   }
      // }
    } else {
      // 单张图片
      const compressedFile = await handleFiles(newFiles, quality, outputFormat)
      onFilesChange(compressedFile)
    }
    // 允许前后两次选择相同文件
    // 在文件选择后，将 input 的值重置为空字符串，以便下次选择相同文件时能触发 onChange 事件
    event.target.value = ''
  }

  // 打开文件选择器
  function handleFileSelect() {
    if (uploadRef.current) {
      uploadRef.current.click()
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-2">
        <div>
          <Input
            type="file"
            multiple={multiple}
            onChange={handleChange}
            ref={uploadRef}
            className="hidden"
            accept="image/*"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <ImagePlus onClick={handleFileSelect} width={18} height={18} />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="text-white bg-black">
              {multiple ? '添加正文图片' : '添加 logo'}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="editor-footer-actions-right flex ml-auto gap-2">
          <Button type="button" variant="outline" onClick={hideEditor}>取消</Button>
          <Button type="submit" disabled={disabled}>保存</Button>
        </div>
      </div>
    </TooltipProvider>
  )
}

