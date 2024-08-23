import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import Image from 'next/image'
import { useMemo } from 'react'
import type { Content, UploadFiles } from '@/types/type'
import { cn, getImageLayout } from '@/lib/utils'

function ImageItem({ file, className }: { file: File, className?: string }) {
  const src = useMemo(() => URL.createObjectURL(file), [file])

  return (
    <Image
      src={src}
      alt={file.name}
      width={100}
      height={100}
      className={className}
    />
  )
}

function ImageList({ images } : { images: UploadFiles }) {
  return (
    <div className={cn('one-images grid gap-2 mt-4', getImageLayout(images.length))}>
      {images.map((image, index) => (
        <div key={index} className={cn(images.length > 1 && 'w-full pb-[75%] relative')}>
          <ImageItem
            file={image.raw as File}
            className={cn(
              'object-cover',
              images.length > 1
                ? 'absolute top-0 left-0 w-full h-full object-center'
                : 'w-full',
            )}
          />
        </div>
      ))}
    </div>
  )
}

export default function Preview({ contents, className }: { contents: Content[]; className?: string }) {
  return (
    <div className={cn('one', className)}>
      {contents.length === 0 ? (
        <p>No contents to display.</p>
      ) : (
        contents.map((content, index) => (
          <div className="one-container" key={content.id || index}>
            {content.title && <div className="one-title text-2xl font-bold">{parse(DOMPurify.sanitize(content.title))}</div>}
            {content.content && <div className="one-content mt-2">{parse(DOMPurify.sanitize(content.content))}</div>}
            {content.uploadFiles && content.uploadFiles.length > 0 && (
              <ImageList images={content.uploadFiles} />
            )}
          </div>
        ))
      )}
    </div>
  )
}
