import Image from 'next/image'
import type { ImageFile } from '@/types/common'
import { cn, getImageLayout } from '@/lib/utils'
export function ImageList({ images, gridLayout }: { images: ImageFile[], gridLayout: boolean }) {
  return (
    <div className={cn('one-item__images grid gap-2 grid-cols-1', gridLayout && getImageLayout(images.length))}>
      {images.length > 0 && images.map(image => (
        <div key={image.uid}>
          <Image
            src={image.dataUrl}
            alt={image.name}
            width={100}
            height={100}
            className="object-cover w-full"
          />
        </div>
      ))}
    </div>
  )
}
