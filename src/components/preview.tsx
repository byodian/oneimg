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

function PreviewItem({ content, children } : { content: Content, children?: React.ReactNode }) {
  return (
    <li className={cn(!content.parentId ? 'one-item' : 'one-child-item')}>
      {content.title && <div className="one-title">{parse(DOMPurify.sanitize(content.title))}</div>}
      {content.content && <div className="one-content">{parse(DOMPurify.sanitize(content.content))}</div>}
      {content.uploadFiles && content.uploadFiles.length > 0 && (
        <ImageList images={content.uploadFiles} />
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
