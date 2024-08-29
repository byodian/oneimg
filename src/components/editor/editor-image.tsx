'use client'
import { X } from 'lucide-react'

import Image from 'next/image'
import type { ImageFile } from '@/types/type'

type EditorFooterProps = {
  uploadFiles?: ImageFile[];
  onFilesChange: (uploadFiles?: ImageFile[]) => void;
}

export default function EditorImage(props: EditorFooterProps) {
  const { uploadFiles, onFilesChange } = props

  /**
   * 移除文件
   * @param uploadFile
   */
  function handleRemove(uploadFile: ImageFile) {
    const filteredUploadFiles = uploadFiles?.filter(item => item.uid !== uploadFile.uid)
    onFilesChange(filteredUploadFiles)
  }

  return (
    <div className="editor-image">
      {uploadFiles && uploadFiles.length > 0 && <ul className="upload-preview grid grid-cols-4 gap-2 mb-6">
        { uploadFiles.map(item =>
            <li key={item.uid || item.name } className="h-[120px] group flex items-center gap-2 relative">
              <Image src={item.dataUrl} alt={item.name} width={120} height={120} className="object-cover w-full h-full" />
              <div className="flex items-center justify-center absolute right-1 top-1 w-4 h-4 bg-gray-700 rounded-full" onClick={() => handleRemove(item)}>
                <X className="cursor-pointer text-white" width={12} height={12} />
              </div>
            </li>)
        }</ul>}
    </div>
  )
}
