import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import { forwardRef, useContext, useMemo } from 'react'
import { ImageList } from './image-list'
import { baseTemplate } from './styles'
import type { ContentWithId, ImageFile } from '@/types'
import { base64ToBlob, cn, createStyleClassMap, stripEmptyParagraphs } from '@/lib'
import { CustomThemeContext } from '@/contexts/custom-theme-context'
import { useThemeStore } from '@/store/use-theme-store'

interface PreviewItemProps {
  content: ContentWithId,
  // children?: React.ReactNode,
  index: number,
  childContentsMap: Map<number, ContentWithId[]>,
}

const Card = forwardRef<HTMLDivElement, PreviewItemProps>(({ content, index, childContentsMap }, ref) => {
  const theme = useContext(CustomThemeContext)
  const uploadFiles = content.uploadFiles
  const imageFiles: ImageFile[] = useMemo(() => {
    return uploadFiles?.map(file => ({
      uid: file.uid,
      name: file.name,
      dataUrl: URL.createObjectURL(base64ToBlob(file.dataUrl, file.type!)),
      type: file.type,
    }))
  }, [uploadFiles]) || []

  const templateClassNameMap = createStyleClassMap(theme.template, 'template', baseTemplate)

  // template
  const heroTemplate = templateClassNameMap.hero
  const mainTemplate = templateClassNameMap.main
  const subTemplate = templateClassNameMap.sub
  const { size } = useThemeStore()
  const height = typeof size.height === 'number' ? `${size.height / 3}px` : size.height

  return (
    <div
      id={`${content.id}`}
      style={{ height: content.parentId ? 'auto' : height }}
      className={cn(templateClassNameMap.common.container,
        content.parentId
          ? `${subTemplate.container}`
          : content.type === 'theme_content'
            ? `${heroTemplate.container}`
            : `${mainTemplate.container}`,
      )}
      ref={ref}
    >
      {/* card header */}
      {content.title && (
        <div
          className={
            cn(content.parentId
              ? `${subTemplate.title}`
              : content.type === 'theme_content'
                ? `${heroTemplate.title}`
                : `${mainTemplate.title}`,
            )
          }
          data-index={index}
        >
          {parse(DOMPurify.sanitize(content.title))}
        </div>
      )}
      {/* card content */}
      {
        ((stripEmptyParagraphs(content.content)) || (imageFiles.length > 0) || childContentsMap.get(content.id)) && (
          <div
            className={
              cn(templateClassNameMap.common.content,
                content.parentId
                  ? `${subTemplate.content}`
                  : content.type === 'theme_content'
                    ? `${heroTemplate.content}`
                    : `${mainTemplate.content}`,
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
                    childContentsMap={childContentsMap}
                  />
                ))}
              </>
            )}
        </div>)}
    </div>
  )
})
Card.displayName = 'Card'

export { Card }
