import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
