// components/export-image/index.tsx
'use client'

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, Loader2 } from 'lucide-react'
import type { ExportImage, ExportOption } from './types'
import { exportImage } from './utils'
import type { PreviewRef } from '@/types/common'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

interface ExportImageProps {
  previewRef: React.RefObject<PreviewRef>;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
}

export function ExportImageDialog({ previewRef, isExportModalOpen, setIsExportModalOpen }: ExportImageProps) {
  const [isExporting, setIsExporting] = useState(true)
  const [scale, setScale] = useState('1')
  const [previewImages, setPreviewImages] = useState<ExportImage[]>([])
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    if (!isExporting) {
      setCurrent(api.selectedScrollSnap() + 1)
      setCount(previewImages?.length as number)
    }

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api, isExporting, previewImages?.length])

  // 监听导出选项变化，若选项更新就重新生成图片
  useEffect(() => {
    const exportOption = {
      scale: Number(scale),
    } as ExportOption

    const generateImages = async () => {
      if (previewRef.current) {
        const images: ExportImage[] = []

        try {
          // 导出整个 Preview
          images.push(await exportImage(previewRef.current.containerRef.current!, 'full_preview.png', exportOption))

          // 导出每个顶层 PreviewItem
          const itemRefs = previewRef.current.itemRefs.current!
          for (const [id, ref] of Object.entries(itemRefs)) {
            if (ref) {
              images.push(await exportImage(ref, `preview_item_${id}.png`, exportOption))
            }
          }

          setPreviewImages(images)
        } catch (error) {
          console.log(error)
        } finally {
          setIsExporting(false)
        }
      }
    }

    // 等待DOM节点更新，延迟生成图片
    const timer = setTimeout(() => {
      generateImages()
    }, 1000)
    return () => clearTimeout(timer)
  }, [previewRef, scale])

  const exportImages = useCallback(async () => {
    const zip = new JSZip()
    try {
      // 将所有图片添加到 ZIP 文件
      previewImages?.forEach((img) => {
        zip.file(img.id as string, img.data, { base64: true })
      })

      // 生成 ZIP 文件并下载
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'preview_images.zip')
    } catch (error) {
      console.log(error)
    } finally {
      setIsExporting(false)
    }
  }, [previewImages])

  // 更新缩放比例
  const onScaleChange = (event: React.MouseEvent<HTMLDivElement>) => {
    const scaleValue = event.currentTarget.getAttribute('data-scale') || scale
    setScale(scaleValue)
    setIsExporting(true)
  }

  return (
    <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
      <DialogContent className="max-w-full sm:max-w-[840px] px-10 py-8 sm:h-[500px] overflow-y-auto flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-2xl">导出图片</DialogTitle>
          <DialogDescription className="hidden">
            save as images
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex items-start gap-4">
          <div className="w-[480px] px-12 border rounded-lg">
            <Carousel setApi={setApi} className="w-full py-2 px-4">
              <CarouselContent>
                {previewImages.length > 0 && !isExporting ? previewImages.map(item => (
                  <CarouselItem key={item.id} className="h-[300px]">
                    <Image
                      src={item.data ? URL.createObjectURL(item.data) : ''}
                      alt="Preview"
                      width={300}
                      height={200}
                      className="w-full h-full object-contain"
                    />
                  </CarouselItem>
                )) : (
                  <CarouselItem className="h-[300px] flex items-center justify-center">
                      <div className="flex gap-2 items-center text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        图片生成中...
                      </div>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="-left-8" />
              <CarouselNext className="-right-8" />
            </Carousel>
            <div className="py-2 text-center text-sm text-muted-foreground">
              {current} / {count}
            </div>
          </div>

          <div className="flex-grow flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="font-bold">缩放比例</div>
              <div className="flex p-1 border rounded-lg">
                <div
                  data-scale="1"
                  className={cn(scale === '1' && 'bg-primary text-primary-foreground', 'px-2 rounded-sm text-sm cursor-pointer')}
                  onClick={onScaleChange}
                >
                  1x
                </div>
                <div
                  data-scale="2"
                  className={cn(scale === '2' && 'bg-primary text-primary-foreground', 'px-2 rounded-sm text-sm cursor-pointer')}
                  onClick={onScaleChange}
                >
                  2x
                </div>
                <div data-scale="3"
                  className={cn(scale === '3' && 'bg-primary text-primary-foreground', 'px-2 rounded-sm text-sm cursor-pointer')}
                  onClick={onScaleChange}
                >
                  3x
                </div>
              </div>
            </div>
            <div className="mt-8 ml-auto">
              <Button onClick={exportImages} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                <span>PNG</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
