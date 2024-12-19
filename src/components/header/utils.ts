import html2canvas from 'html2canvas'
import UPNG from '@pdf-lib/upng'
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

export async function exportImage(element: HTMLElement, filename: string, exportOption: ExportOption) {
  const imageBlob = await generateImage(element, exportOption)
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
