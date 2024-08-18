import ImageWrapper from './image'
import type { Content, ImageContent } from '@/types/type'
import { cn } from '@/lib/utils'

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

const getImageLayout = (images: ImageContent[]) => {
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
    <div className={cn(className)}>
      {contents.length === 0 ? (
        <p>No contents to display.</p>
      ) : (
        contents.map((content, index) => (
          <div key={content.id || index}>
            {content.title && <h1 className="text-2xl font-bold">{content.title}</h1>}
            {content.content && <p className="mt-2">{content.content}</p>}
            {content.images && content.images.length > 0 && (
              <div className={`grid gap-2 mt-4 ${getImageLayout(content.images)}`}>
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
