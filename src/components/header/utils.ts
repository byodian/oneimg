import html2canvas from 'html2canvas'
import UPNG from '@pdf-lib/upng'
import type { ExportOption } from './types'

export async function generateImage(element: HTMLElement, option: ExportOption): Promise<Blob> {
  // 临时保存原始的样式
  const originalStyle = element.style.cssText

  // 为了确保 html2canvas 捕获完整内容，临时设置样式
  element.style.overflow = 'visible'
  element.style.height = 'auto'
  element.style.maxHeight = 'none'

  // 同时设置所有子元素的样式，确保内容不被裁剪
  const allChildren = element.querySelectorAll('*')
  const originalChildStyles: Map<Element, string> = new Map()

  allChildren.forEach((child) => {
    const childElement = child as HTMLElement
    originalChildStyles.set(child, childElement.style.cssText)
    childElement.style.overflow = 'visible'
    childElement.style.maxHeight = 'none'
  })

  const canvas = await html2canvas(element, {
    scale: option.scale,
    useCORS: true,
    logging: false,
  })

  // 恢复所有子元素的原始样式
  allChildren.forEach((child) => {
    const childElement = child as HTMLElement
    const originalStyleText = originalChildStyles.get(child) || ''
    childElement.style.cssText = originalStyleText
  })

  // 恢复原始样式
  element.style.cssText = originalStyle

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob as Blob)
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

/**
 * 将长图按指定高度切割成多张图片
 * @param blob 原始图片 blob
 * @param maxHeight 每张图片的最大高度
 * @returns 切割后的图片 blob 数组
 */
export async function sliceLongImage(blob: Blob, maxHeight: number): Promise<Blob[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = URL.createObjectURL(blob)

    img.onload = () => {
      const width = img.width
      const height = img.height

      // 计算需要切割的数量
      const slices = Math.ceil(height / maxHeight)
      const slicedBlobs: Blob[] = []

      console.log(`切割图片：原始高度 ${height}, 最大高度 ${maxHeight}, 切片数 ${slices}`)

      // 如果不需要切割，直接返回
      if (slices === 1) {
        console.log('不需要切割')
        URL.revokeObjectURL(img.src)
        resolve([blob])
        return
      }

      // 逐一切割
      let completedSlices = 0

      for (let i = 0; i < slices; i++) {
        const startY = i * maxHeight
        const currentHeight = Math.min(maxHeight, height - startY)

        // 为每个切片创建独立的 canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = currentHeight
        const ctx = canvas.getContext('2d')!

        // 绘制当前片段
        ctx.drawImage(
          img,
          0, startY, width, currentHeight, // 源图像区域
          0, 0, width, currentHeight, // 目标画布区域
        )

        // 转换为 blob
        canvas.toBlob((sliceBlob) => {
          if (sliceBlob) {
            slicedBlobs.push(sliceBlob)
            console.log(`切片 ${i + 1} 完成，高度 ${currentHeight}`)
          }

          completedSlices++

          // 所有切片完成
          if (completedSlices === slices) {
            URL.revokeObjectURL(img.src)
            console.log(`所有切片完成，共 ${slicedBlobs.length} 张`)
            resolve(slicedBlobs)
          }
        }, blob.type)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      console.error('图片加载失败')
      resolve([blob]) // 如果加载失败，返回原图
    }
  })
}
