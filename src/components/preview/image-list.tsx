import Image from 'next/image'
import type { ImageFile } from '@/types/common'
export function ImageList({ images }: { images: ImageFile[] }) {
  return (
    <div data-class="oneimg-images">
      {images.length > 0 && images.map(image => (
        <Image
          key={image.uid}
          src={image.dataUrl}
          alt={image.name}
          width={100}
          height={100}
          className="object-cover w-full"
        />
      ))}
    </div>
  )
}
