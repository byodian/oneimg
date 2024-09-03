import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import { forwardRef, useMemo } from 'react'
import { ImageList } from './image-list'
import type { Content, ImageFile } from '@/types/common'
import { base64ToBlob, cn } from '@/lib/utils'

const PreviewItem = forwardRef<HTMLLIElement, { content: Content, children?: React.ReactNode }>(({ content, children }, ref) => {
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
    <li className={cn(!content.parentId ? 'one-item' : 'one-item__child', content.type === 'theme_content' && 'one-item__theme')} ref={ref}>
      {content.title && <div className="one-title">{parse(DOMPurify.sanitize(content.title))}</div>}
      {content.content && <div className="one-content">{parse(DOMPurify.sanitize(content.content))}</div>}
      {content.uploadFiles && content.uploadFiles.length > 0 && (
        <ImageList images={imageFiles} />
      )}
      {children}
    </li>
  )
})
PreviewItem.displayName = 'PreviewItem'

export { PreviewItem }
