import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import { forwardRef, useMemo } from 'react'
import Image from 'next/image'
import { ImageList } from './image-list'
import type { Content, ImageFile } from '@/types/common'
import { base64ToBlob, cleanHtml, cn } from '@/lib/utils'

const PreviewItem = forwardRef<HTMLLIElement, { content: Content, children?: React.ReactNode, index: number }>(({ content, children, index }, ref) => {
  const uploadFiles = content.uploadFiles

  const imageFiles: ImageFile[] = useMemo(() => {
    return uploadFiles?.map(file => ({
      uid: file.uid,
      name: file.name,
      dataUrl: URL.createObjectURL(base64ToBlob(file.dataUrl, file.type!)),
      type: file.type,
    }))
  }, [uploadFiles]) || []

  return (
    <li
      id={`${content.id}`}
      className={cn(content.parentId ? 'one-child-item' : content.type === 'theme_content' ? 'one-theme' : 'one-item')}
      ref={ref}>
      {content.type === 'theme_content' && (
        <div className="one-theme__bg"></div>
      )}
      {content.title && (
        <div
          className={
            cn(content.parentId ? 'one-child-item__title' : content.type === 'theme_content' ? 'one-theme__title' : 'one-item__title')
          }
          data-index={index}
        >
          {parse(DOMPurify.sanitize(content.title))}
        </div>
      )}
      {
        ((cleanHtml(content.content)) || (imageFiles.length > 0) || children) && (
        <div className={cn(content.parentId ? 'one-child-item__content' : content.type === 'theme_content' ? 'one-theme__content' : 'one-item__content')}>
            {content.content && <>{parse(DOMPurify.sanitize(content.content))}</>}
            {content.type === 'normal_content' && imageFiles.length > 0 && (
              <ImageList images={imageFiles} />
            )}
            {children}
          </div>)
      }
      {content.type === 'theme_content' && imageFiles.length > 0 && (
        <div className="one-theme__logo">
          <Image src={imageFiles[0].dataUrl} alt={imageFiles[0].name} width={100} height={100} />
        </div>
      )}
    </li >
  )
})
PreviewItem.displayName = 'PreviewItem'

export { PreviewItem }
