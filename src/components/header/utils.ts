import html2canvas from 'html2canvas'
import { toBlob } from 'html-to-image'
import UPNG from '@pdf-lib/upng'
import ExifReader from 'exifreader'
import type { ExportOption } from './types'

export async function generateImage(element: HTMLElement, option: ExportOption): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: option.scale,
    useCORS: true,
    logging: false,
  })

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob as Blob)
      // if (blob && option.embedText) {
      //   const modifiedBlob = await embedMetadata(blob, options.embedText)
      //   resolve(modifiedBlob)
      // } else {
      //   resolve(blob as Blob)
      // }
    }, option.mimeType)
  })
}

export async function embedMetadata(blob: Blob, text: string): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // 检查图像类型
  const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47

  if (isPNG) {
    return embedPNGMetadata(uint8Array, text)
  } else {
    return embedJPEGMetadata(uint8Array, text)
  }
}

function embedPNGMetadata(_uint8Array: Uint8Array, _text: string): Blob {
  return new Blob()
}

function embedJPEGMetadata(_uint8Array: Uint8Array, _text: string): Blob {
  return new Blob()
}

export async function extractMetadata(file: File): Promise<string | null> {
  try {
    if (file.type === 'image/png') {
      return null
      // const arrayBuffer = await file.arrayBuffer()
      // const uint8Array = new Uint8Array(arrayBuffer)
      // const chunks = readMetadata(uint8Array)
      // const textChunk = chunks.find((chunk: any) => chunk.keyword === 'Description')
      // return textChunk ? textChunk.text : null
    } else {
      const tags = await ExifReader.load(file)
      return tags.ImageDescription?.description || null
    }
  } catch (error) {
    console.error('Error extracting metadata:', error)
    return null
  }
}

export async function generateImageByHtml2Image(element: HTMLElement, option: ExportOption): Promise<Blob> {
  const height = element.offsetHeight
  const width = element.offsetWidth
  const blob = await toBlob(element, {
    quality: 1,
    canvasWidth: width * option.scale,
    canvasHeight: height * option.scale,
  }) as Blob

  return new Promise((resolve) => {
    resolve(blob)
  })
}

export async function exportImage(element: HTMLElement, filename: string, exportOption: ExportOption) {
  const imageBlob = await generateImageByHtml2Image(element, exportOption)
  return {
    id: filename,
    data: imageBlob,
  }
}

export async function compressImage(blob: Blob, quality: number, outFormat: string, width: number, height: number) {
  const pngArrayBuffer = await blob.arrayBuffer()
  const rgbaBuffers = UPNG.toRGBA8(UPNG.decode(pngArrayBuffer))
  const compressedArrayBuffer = UPNG.encode(rgbaBuffers, width, height, quality)
  return new Blob([compressedArrayBuffer], { type: outFormat })
}
