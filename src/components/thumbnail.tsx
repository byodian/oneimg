import { useRef, useState } from 'react'
import { FileIcon } from 'lucide-react'
import Image from 'next/image'
import type { UploadRawFile } from '@/types/upload.ts'

type ImageProps = {
  file?: UploadRawFile;
  width?: number;
  className?: string;
}
export function ThumbnailWithFileReader({ file, width, className }: ImageProps) {
  const [src, setSrc] = useState<string>('')
  const thumbnailRef = useRef<HTMLImageElement>(null)

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target) {
        setSrc(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  } else {
    return <FileIcon />
  }

  return src
    ? <Image ref={thumbnailRef} src={src} alt="" width={width || 24} height={width || 24} className={className} />
    : <FileIcon />
}
