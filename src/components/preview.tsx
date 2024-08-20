import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import Image from 'next/image'
import { useMemo } from 'react'
import type { Content, ImageContent } from '@/types/type'
import { cn } from '@/lib/utils'

function ImageWrapper({ file, className }: { file: File, className?: string }) {
  const src = useMemo(() => URL.createObjectURL(file), [file])

  // if (file && file.type.startsWith('image/')) {
  //   const reader = new FileReader()
  //   reader.onload = (e) => {
  //     if (e.target) {
  //       src = e.target.result as string
  //     }
  //   }
  //   reader.readAsDataURL(file)
  // }

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

function ImageItem({ content }: { content: Content }) {
  if (content.images && content.images.length === 1) {
    return (
      <div>
        <ImageWrapper file={content.images[0].raw as File} className="object-cover w-full" />
      </div>
    )
  }

  return (
    content?.images?.map((image, imgIndex) => {
      return (
        <div key={imgIndex} className="w-full pb-[75%] relative">
          <ImageWrapper file={image.raw as File} className="object-cover object-center absolute top-0 left-0 w-full h-full" />
        </div>
      )
    })
  )
}

function getImageLayout(images: ImageContent[]) {
  const count = images.length
  if (count === 1) {
    return 'grid-cols-1'
  }
  if (count === 2) {
    return 'grid-cols-2'
  }
  if (count === 3) {
    return 'grid-cols-3'
  }
  if (count === 4) {
    return 'grid-cols-2 grid-rows-2'
  }
  if (count === 5 || count === 6) {
    return 'grid-cols-3 grid-rows-2'
  }
  return 'grid-cols-3 grid-rows-3'
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
            {content.images && content.images.length > 0 && (
              <div className={cn('one-images grid gap-2 mt-4', getImageLayout(content.images))}>
                <ImageItem content={content} />
                {/* {content.images.map((image, imgIndex) => (
                  <div key={imgIndex} className="w-full pb-[56.25%] relative">
                    <ImageWrapper file={image.raw as File} className="object-contain object-center absolute top-0 left-0 w-full h-full" />
                  </div>
                ))} */}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
