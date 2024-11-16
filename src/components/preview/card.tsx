import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import { forwardRef, useMemo } from 'react'
import { ImageList } from './image-list'
import type { ContentWithId, ImageFile, ModuleClassNameMap } from '@/types'
import { base64ToBlob, cn, stripEmptyParagraphs } from '@/lib/utils'

interface PreviewItemProps {
  content: ContentWithId,
  children?: React.ReactNode,
  index: number,
  childContentsMap: Map<number, ContentWithId[]>,
  templateClassNameMap: ModuleClassNameMap,
  themeClassNameMap: ModuleClassNameMap,
}

const Card = forwardRef<HTMLDivElement, PreviewItemProps>(({ content, children, index, templateClassNameMap, themeClassNameMap, childContentsMap }, ref) => {
  const uploadFiles = content.uploadFiles

  const imageFiles: ImageFile[] = useMemo(() => {
    return uploadFiles?.map(file => ({
      uid: file.uid,
      name: file.name,
      dataUrl: URL.createObjectURL(base64ToBlob(file.dataUrl, file.type!)),
      type: file.type,
    }))
  }, [uploadFiles]) || []

  const heroTemplate = templateClassNameMap.hero
  const mainTemplate = templateClassNameMap.main
  const subTemplate = templateClassNameMap.sub

  const heroTheme = themeClassNameMap.hero
  const mainTheme = themeClassNameMap.main
  const subTheme = themeClassNameMap.sub

  return (
    <div
      id={`${content.id}`}
      className={cn(
        templateClassNameMap.common.container,
        content.parentId
          ? `${subTemplate.container} ${subTheme.container}`
          : content.type === 'theme_content'
            ? `${heroTemplate.container} ${heroTheme.container}`
            : `${mainTemplate.container} ${mainTheme.container}`,
      )}
      ref={ref}
    >
      {/* card header */}
      {content.title && (
        <div
          className={
            cn(content.parentId
              ? `${subTemplate.title} ${subTheme.title}`
              : content.type === 'theme_content'
                ? `${heroTemplate.title} ${heroTheme.title}`
                : `${mainTemplate.title} ${mainTheme.title}`,
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
              cn(templateClassNameMap.common.content,
                content.parentId
                  ? `${subTemplate.content} ${subTheme.content}`
                  : content.type === 'theme_content'
                    ? `${heroTemplate.content} ${heroTheme.content}`
                    : `${mainTemplate.content} ${mainTheme.content}`,
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
                    templateClassNameMap={templateClassNameMap}
                    themeClassNameMap={themeClassNameMap}
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
