import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import { forwardRef, useMemo } from 'react'
import { ImageList } from './image-list'
import type { ClassesMap } from './type'
import type { ContentWithId, ImageFile } from '@/types/common'
import { base64ToBlob, cn, stripEmptyParagraphs } from '@/lib/utils'

interface PreviewItemProps {
  content: ContentWithId,
  children?: React.ReactNode,
  index: number,
  theme: string,
  childContentsMap: Map<number, ContentWithId[]>,
  classesMap: ClassesMap,
}

const Card = forwardRef<HTMLDivElement, PreviewItemProps>(({ content, children, index, theme, classesMap, childContentsMap }, ref) => {
  const uploadFiles = content.uploadFiles

  const imageFiles: ImageFile[] = useMemo(() => {
    return uploadFiles?.map(file => ({
      uid: file.uid,
      name: file.name,
      dataUrl: URL.createObjectURL(base64ToBlob(file.dataUrl, file.type!)),
      type: file.type,
    }))
  }, [uploadFiles]) || []

  const primary = classesMap.primary
  const secondary = classesMap.secondary
  const thirdary = classesMap.thirdary

  return (
    <div
      id={`${content.id}`}
      className={cn(
        classesMap.common.container,
        content.parentId
          ? thirdary.container
          : content.type === 'theme_content'
            ? primary.container
            : secondary.container,
      )}
      ref={ref}
    >
      {content.type === 'theme_content' && (
        <div data-class="oneimg-theme__bg"></div>
      )}
      {/* card header */}
      {content.title && (
        <div
          className={
            cn(content.parentId
              ? thirdary.title
              : content.type === 'theme_content'
                ? primary.title
                : secondary.title,
            )
          }
          data-index={index}
        >
          {parse(DOMPurify.sanitize(content.title))}
        </div>
      )}
      {/* card content */}
      {
        ((stripEmptyParagraphs(content.content)) || (imageFiles.length > 0) || children) && (
          <div
            className={
              cn(classesMap.common.content,
                content.parentId
                  ? thirdary.content
                  : content.type === 'theme_content'
                    ? primary.content
                    : secondary.content,
              )
            }
          >
            {content.content && <>{parse(DOMPurify.sanitize(content.content))}</>}
            {imageFiles.length > 0 && (
              <ImageList images={imageFiles} />
            )}

            {/* thirdary content */}
            {childContentsMap.get(content.id) && (
              <>
                {childContentsMap.get(content.id)!.map((item, index) => (
                  <Card
                    content={item}
                    key={item.id}
                    index={index}
                    theme={theme}
                    classesMap={classesMap}
                    childContentsMap={childContentsMap}
                  />
                ))}
              </>
            )}
          </div>
        )
      }
    </div>
  )
})
Card.displayName = 'Card'

export { Card }
