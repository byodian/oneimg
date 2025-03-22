import html2canvas from 'html2canvas'
import { toBlob } from 'html-to-image'
import UPNG from '@pdf-lib/upng'
import type { ExportOption } from './types'

export async function generateImage(element: HTMLElement, option: ExportOption): Promise<Blob> {
  try {
    const canvas = await html2canvas(element, {
      scale: option.scale,
      useCORS: true,
      allowTaint: true,
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
  } catch (error) {
    return new Promise((_resolve, reject) => {
      reject(error)
    })
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
  // const imageBlob = await generateImage(element, exportOption)
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
