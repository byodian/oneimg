import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import UPNG from '@pdf-lib/upng'
import type { ImageBase } from '@/types/common'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageLayout(count: number) {
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

let uid = 1
export function getUid() {
  return Date.now() + uid++
}

// Blob to Base64
export function blobToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

export function base64ToBlob(base64String: string, contentType: string) {
  // Split the base64 string and extract the actual base64 encoded part
  const base64 = base64String.split(',')[1]

  const byteArray = Buffer.from(base64, 'base64')
  return new Blob([byteArray], { type: contentType })
}

export function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

// export function getMimeType(base64String: string) {
//   const mimeTypeRegex = /^data:(.+);base64,/
//   const matches = base64String.match(mimeTypeRegex)

//   return matches ? matches[1] : null
// }

export function getMimeType(base64String: string) {
  if (base64String.slice(0, 5) === 'data:') {
    const mimeTypeEnd = base64String.indexOf(';base64,')
    if (mimeTypeEnd !== -1) {
      return base64String.slice(5, mimeTypeEnd)
    }
  }
  return null
}

export function compressImage(file: File, quality = 0.8, outFormat = 'image/jpeg'): Promise<ImageBase> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      if (file.type === 'image/png') {
        file.arrayBuffer().then(async (pngArrayBuffer) => {
          // fix RangeError: byte length of Uint32Array shoule be a multiple of 4
          // https://github.com/photopea/UPNG.js/issues/74
          const rgbaBuffers = UPNG.toRGBA8(UPNG.decode(pngArrayBuffer))
          const compressedArrayBuffer = UPNG.encode(rgbaBuffers, img.width, img.height, 50)
          const blob = new Blob([compressedArrayBuffer], { type: file.type })
          const imageBase = {
            dataUrl: await blobToBase64(blob),
            type: file.type,
          } as ImageBase

          resolve(imageBase)
        }).catch(() => {
          URL.revokeObjectURL(img.src)
          resolve({
            dataUrl: img.src,
            type: file.type,
          } as ImageBase)
        })
      } else {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = img.width
        canvas.height = img.height

        ctx?.drawImage(img, 0, 0)

        canvas?.toBlob(async (blob) => {
          URL.revokeObjectURL(img.src)
          resolve({
            dataUrl: await blobToBase64(blob!),
            // dataUrl: blob,
            type: file.type,
          } as ImageBase)
        }, outFormat, quality)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve({
        dataUrl: img.src,
        type: file.type,
      } as ImageBase)
    }
  })
}

export function cleanHtml(html?: string) {
  if (html) {
    return html.replace(/<p>\s*<\/p>/g, '').trim()
  }

  return html
}
