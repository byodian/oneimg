import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import Image from 'next/image'
import { useMemo } from 'react'
import type { Content, ImageFile } from '@/types/type'
import { cn, getImageLayout } from '@/lib/utils'

function ImageList({ images } : { images: ImageFile[] }) {
  return (
    <div className={cn('one-images grid gap-2 mt-4', getImageLayout(images.length))}>
      {images.length === 1 && (
        <div>
          <Image
            src={images[0].dataUrl}
            alt={images[0].name}
            width={100}
            height={100}
            className="object-cover w-full"
          />
        </div>
      )}
      {images.length > 1 && images.map(image => (
        <div key={image.uid} className="w-full pb-[75%] relative">
          <div className="absolute top-0 left-0 right-0 bottom-0">
            <Image
              src={image.dataUrl}
              alt={image.name}
              width={100}
              height={100}
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewItem({ content, children } : { content: Content, children?: React.ReactNode }) {
  const uploadFiles = content.uploadFiles

  const imageFiles: ImageFile[] = useMemo(() => {
    return uploadFiles?.map(file => ({
      uid: file.uid,
      name: file.name,
      dataUrl: file.dataUrl,
    }))
  }, [uploadFiles]) || []

  return (
    <li className={cn(!content.parentId ? 'one-item' : 'one-child-item')}>
      {content.title && <div className="one-title">{parse(DOMPurify.sanitize(content.title))}</div>}
      {content.content && <div className="one-content">{parse(DOMPurify.sanitize(content.content))}</div>}
      {content.uploadFiles && content.uploadFiles.length > 0 && (
        <ImageList images={imageFiles} />
      )}
      {children}
    </li>
  )
}

export default function Preview({ contents, className }: { contents: Content[]; className?: string }) {
  // 筛选出顶级内容（没有 parentId），或者将第一个元素视为顶级内容
  const parentContents = useMemo(() => {
    const filteredContents = contents.filter(content => !content.parentId)
    return filteredContents.length > 0 ? filteredContents : contents
  }, [contents])

  const childContentsMap = useMemo(() => {
    const childContents = new Map<number, Content[]>()
    for (const content of contents) {
      if (content.parentId) {
        if (!childContents.has(content.parentId)) {
          childContents.set(content.parentId, [])
        }
        childContents.get(content.parentId)!.push(content)
      }
    }
    return childContents
  }, [contents])

  return (
    <div className={cn('one', className)}>
      {contents.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground">
          <p>无内容可预览</p>
        </div>
      ) : (
        <ul className="one-container">
          {parentContents.map(content => (
            <PreviewItem content={content} key={content.id}>
              {childContentsMap.get(content.id as number) && (
                <ul className="one-item-children">
                  {childContentsMap.get(content.id!)!.map(item => (
                    <PreviewItem content={item} key={item.id}/>
                  ))}
                </ul>
              )}
            </PreviewItem>
          ))}
        </ul>
      )}
    </div>
  )
}
