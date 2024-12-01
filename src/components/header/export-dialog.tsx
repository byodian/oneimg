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
import { cn /* removeHtmlTags */ } from '@/lib/utils'
import { getContents } from '@/lib/indexed-db'

interface ExportImageProps {
  previewRef: React.RefObject<PreviewRef>;
  isExportModalOpen: boolean;
  isExporting: boolean;
  scale: string;
  setScale: (scale: string) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsExporting: (isExporting: boolean) => void;
}

export function ExportImageDialog({
  previewRef,
  isExportModalOpen,
  scale,
  setScale,
  isExporting,
  setIsExporting,
  setIsExportModalOpen,
}: ExportImageProps) {
  const [previewImages, setPreviewImages] = useState<ExportImage[]>([])
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(previewImages?.length as number)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api, isExporting, previewImages?.length])

  // Listen for changes in export options and regenerate images if options are updated
  useEffect(() => {
    console.log(124)
    const exportOption = {
      scale: Number(scale),
    } as ExportOption

    const generateImages = async () => {
      console.log('previewRef.current', previewRef)
      if (previewRef.current) {
        const images: ExportImage[] = []
        console.log('previewRef.current', previewRef.current)

        try {
          const data = await getContents()
          const dataMap = new Map()
          for (const content of data) {
            dataMap.set(content.id, content.title)
          }

          // 导出整个 Preview
          let index = 1
          console.log('previewRef.current.containerRef.current', previewRef.current.containerRef.current)
          if (previewRef.current.containerRef.current) {
            const fullPreviewBlobObject = await exportImage(previewRef.current.containerRef.current!, `${index}_full_preview.png`, exportOption)

            console.log('fullPreviewBlobObject', fullPreviewBlobObject)

            if (fullPreviewBlobObject && fullPreviewBlobObject.data) {
              images.push(fullPreviewBlobObject)
            }
            index = index + 1

            // 导出每个顶层 PreviewItem
            // const itemRefs = previewRef.current.itemRefs.current
            // if (itemRefs) {
            //   for (const [id, ref] of Object.entries(itemRefs)) {
            //     if (ref) {
            //       const cardPreviewBlobObject = await exportImage(ref, `${index}_${removeHtmlTags(dataMap.get(Number(id)))}.png`, exportOption)
            //
            //       if (cardPreviewBlobObject && cardPreviewBlobObject.data) {
            //         images.push(cardPreviewBlobObject)
            //       }
            //
            //       index++
            //     }
            //   }

            // }
            setPreviewImages(images)
          }
        } catch (error) {
          console.log('error')
          console.log(error)
        } finally {
          setIsExporting(false)
        }
      }
    }

    if (previewRef.current && previewRef.current.itemRefs.current && previewRef.current.containerRef.current) {
      if (isExportModalOpen) {
        generateImages()
      }
    }
  }, [previewRef, scale, setIsExporting, isExporting, isExportModalOpen])

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
  }, [previewImages, setIsExporting])

  // 更新缩放比例
  const onScaleChange = (event: React.MouseEvent<HTMLButtonElement>) => {
    const scaleValue = event.currentTarget.getAttribute('data-scale') || scale
    setScale(scaleValue)
    setIsExporting(true)
  }

  return (
    <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
      <DialogContent className="flex flex-col max-w-full sm:max-w-[840px] h-full sm:h-[500px] px-10 py-8 overflow-y-auto gap-4">
        <DialogHeader>
          <DialogTitle className="text-2xl">导出图片</DialogTitle>
          <DialogDescription className="hidden">
            save as images
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col sm:flex-row gap-4">
          <div className="sm:w-[480px] px-12 border rounded-lg">
            <Carousel setApi={setApi} className="w-full py-2 px-4 h-[500px] sm:h-[300px]">
              <CarouselContent>
                {previewImages.length > 0 ? previewImages.map(item => (
                  <CarouselItem key={item.id} className="h-[500px] sm:h-[300px]">
                    <Image
                      src={item.data ? URL.createObjectURL(item.data) : ''}
                      alt="Preview"
                      width={300}
                      height={200}
                      className="w-full h-full object-contain"
                    />
                  </CarouselItem>
                )) : (
                  <CarouselItem className="h-[500px] sm:h-[300px] flex items-center justify-center">
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
                <Button
                  variant="ghost"
                  data-scale="1"
                  // disabled={previewImages.length === 0 || isExporting}
                  className={cn('h-6 px-2.5 py-0.5 hover:bg-transparent hover:text-primary', scale === '1' && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}
                  onClick={onScaleChange}
                >
                  1×
                </Button>
                <Button
                  variant="ghost"
                  data-scale="2"
                  // disabled={previewImages.length === 0 || isExporting}
                  className={cn('h-6 px-2.5 py-0.5 hover:bg-transparent hover:text-primary', scale === '2' && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}
                  onClick={onScaleChange}
                >
                  2×
                </Button>
                <Button
                  variant="ghost"
                  data-scale="3"
                  // disabled={previewImages.length === 0 || isExporting}
                  className={cn('h-6 px-2.5 py-0.5 hover:bg-transparent hover:text-primary', scale === '3' && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}
                  onClick={onScaleChange}
                >
                  3×
                </Button>
              </div>
            </div>
            <div className="mt-4 sm:mt-auto ml-auto">
              <Button onClick={exportImages} disabled={previewImages.length === 0 || isExporting}>
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
