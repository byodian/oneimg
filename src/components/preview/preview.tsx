import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Card } from './card'
import { baseStyles, createStyle, wechatPostTemplate } from './template'
import type { ClassesMap } from './type'
import type { ContentWithId, PreviewRef } from '@/types/common'
import { cn } from '@/lib/utils'

const Preview = forwardRef<PreviewRef, { contents: ContentWithId[]; className?: string, theme: string }>(({ contents, className, theme }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<{ [key: string | number]: HTMLDivElement }>({})

  // 将 ref 暴露给父组件
  useImperativeHandle(ref, () => ({
    containerRef,
    itemRefs,
  }))

  // 筛选出顶级内容（没有 parentId），或者将第一个元素视为顶级内容
  const parentContents = useMemo(() => {
    const filteredContents = contents.filter(content => !content.parentId)
    return filteredContents.length > 0 ? filteredContents : contents
  }, [contents])

  const childContentsMap = useMemo(() => {
    const childContents = new Map<number, ContentWithId[]>()
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

  const { classes: containerClasses } = createStyle('primary')({
    defaultTheme: baseStyles.primary,
    theme: wechatPostTemplate.primary,
  })

  const { classes: titleClasses } = createStyle('secondary')({
    defaultTheme: baseStyles.secondary,
    theme: wechatPostTemplate.secondary,
  })

  const { classes: contentClasses } = createStyle('thirdary')({
    defaultTheme: baseStyles.thirdary,
    theme: wechatPostTemplate.thirdary,
  })

  const { classes: defaultClasses } = createStyle('common')({
    defaultTheme: baseStyles.common,
    theme: wechatPostTemplate.common,
  })

  const classesMap: ClassesMap = {
    common: defaultClasses,
    primary: containerClasses,
    secondary: titleClasses,
    thirdary: contentClasses,
  }

  return (
    <div className={cn(contents.length === 0 && 'h-full', 'one-container', className)} ref={containerRef}>
      {contents.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground">
          <p>无内容可预览</p>
        </div>
      ) : (
        <div className="one-list">
          {parentContents.map((content, parentIndex) => (
            <Card
              theme={theme}
              index={parentIndex}
              content={content}
              key={content.id}
              classesMap={classesMap}
              childContentsMap={childContentsMap}
              ref={(el) => {
                itemRefs.current[content.id] = el!
              }}>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
})

Preview.displayName = 'Preview'

export { Preview }
