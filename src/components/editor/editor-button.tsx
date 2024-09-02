'use client'
import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'

import UPNG from '@pdf-lib/upng'
import { Button } from '@/components/ui/button'
import type { ImageBase, ImageFile } from '@/types/common'
import { blobToBase64, getUid } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

function compressImage(file: File, quality = 0.8, outFormat = 'image/jpeg'): Promise<ImageBase> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      if (file.type === 'image/png') {
        file.arrayBuffer().then(async (pngArrayBuffer) => {
          // fix RangeError: byte length of Uint32Array shoule be a multiple of 4
          // https://github.com/photopea/UPNG.js/issues/74
          const rgbaBuffers = UPNG.toRGBA8(UPNG.decode(pngArrayBuffer))
          const compressedArrayBuffer = UPNG.encode(rgbaBuffers, img.width, img.height, 50)
          const blob = new Blob([compressedArrayBuffer], { type: file.type })
          const imageBase = {
            dataUrl: await blobToBase64(blob),
            type: file.type,
          } as ImageBase

          resolve(imageBase)
        }).catch(() => {
          URL.revokeObjectURL(img.src)
          resolve({
            dataUrl: img.src,
            type: file.type,
          } as ImageBase)
        })
      } else {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = img.width
        canvas.height = img.height

        ctx?.drawImage(img, 0, 0)

        canvas?.toBlob(async (blob) => {
          URL.revokeObjectURL(img.src)
          resolve({
            dataUrl: await blobToBase64(blob!),
            type: file.type,
          } as ImageBase)
        }, outFormat, quality)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve({
        dataUrl: img.src,
        type: file.type,
      } as ImageBase)
    }
  })
}

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
  hideEditor: () => void;
  onFilesChange: (UploadFiles?: ImageFile[]) => void
}

export default function EditorButton(props: EditorFooterProps) {
  const { uploadFiles, disabled, hideEditor, onFilesChange, quality, outputFormat } = props
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

