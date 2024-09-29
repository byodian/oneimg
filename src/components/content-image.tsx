'use client'
import { X } from 'lucide-react'

import Image from 'next/image'
import { useMemo } from 'react'
import type { ImageFile } from '@/types/common'
import { base64ToBlob, cn } from '@/lib/utils'

type ContentFooterProps = {
  className?: string;
  uploadFiles?: ImageFile[];
  showCloseIcon?: boolean;
  onFilesChange?: (uploadFiles?: ImageFile[]) => void;
}

export default function ContentImage(props: ContentFooterProps) {
  const { uploadFiles, className, showCloseIcon, onFilesChange } = props

  /**
   * 移除文件
   * @param uploadFile
   */
  function handleRemove(uploadFile: ImageFile) {
    const filteredUploadFiles = uploadFiles?.filter(item => item.uid !== uploadFile.uid)
    onFilesChange && onFilesChange(filteredUploadFiles)
  }

  const imageFiles: ImageFile[] = useMemo(() => {
    return uploadFiles?.map(file => ({
      uid: file.uid,
      name: file.name,
      dataUrl: URL.createObjectURL(base64ToBlob(file.dataUrl, file.type!)),
      type: file.type,
    }))
  }, [uploadFiles]) || []

  return (
    <div className={cn('editor-image mb-6', className)}>
      {imageFiles.length > 0 && <ul className="upload-preview grid grid-cols-4 gap-2">
        {imageFiles.map(item =>
          <li key={item.uid || item.name} className="h-[120px] group flex items-center gap-2 relative">
            <Image src={item.dataUrl} alt={item.name} width={120} height={120} className="object-cover w-full h-full" />
            <div className={cn('flex items-center justify-center absolute right-1 top-1 w-4 h-4 bg-gray-700 rounded-full', !showCloseIcon && 'hidden') } onClick={() => handleRemove(item)}>
              <X className="cursor-pointer text-white" width={12} height={12} />
            </div>
          </li>)
        }</ul>}
    </div>
  )
}
