import Image from 'next/image'
import type { ImageFile } from '@/types/common'
import { cn, getImageLayout } from '@/lib/utils'
export function ImageList({ images } : { images: ImageFile[] }) {
  return (
    <div className={cn('one-images grid gap-2', getImageLayout(images.length))}>
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
