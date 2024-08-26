'use client'
import { X } from 'lucide-react'

import Image from 'next/image'
import { useMemo } from 'react'
import type { ImageFile, UploadFiles } from '@/types/type'

type EditorFooterProps = {
  uploadFiles?: UploadFiles;
  onFilesChange: (uploadFiles?: UploadFiles) => void;
}

export default function EditorImage(props: EditorFooterProps) {
  const { uploadFiles, onFilesChange } = props

  /**
   * 移除文件
   * @param uploadFile
   */
  const handleRemove = (uploadFile: ImageFile) => {
    const filteredUploadFiles = uploadFiles?.filter(item => item.uid !== uploadFile.uid)
    onFilesChange(filteredUploadFiles)
  }

  const imageFiles: ImageFile[] | undefined = useMemo(() => {
    return uploadFiles?.map((item) => {
      const url = URL.createObjectURL(item.raw)
      return {
        uid: item.uid,
        name: item.name,
        src: url,
      } as ImageFile
    })
  }, [uploadFiles])

  return (
    <div className="editor-image">
      {imageFiles && imageFiles.length > 0 && <ul className="upload-preview grid grid-cols-4 gap-2 mb-6">
        { imageFiles?.map(item =>
            <li key={item.uid || item.name } className="h-[120px] group flex items-center gap-2 relative">
              <Image src={item.src} alt={item.name} width={120} height={120} className="object-cover w-full h-full" />
              <div className="flex items-center justify-center absolute right-1 top-1 w-4 h-4 bg-gray-700 rounded-full" onClick={() => handleRemove(item)}>
                <X className="cursor-pointer text-white" width={12} height={12} />
              </div>
            </li>)
        }</ul>}
    </div>
  )
}
