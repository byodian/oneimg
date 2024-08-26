'use client'
import { Download, Folder, ImageDown, LinkIcon, Trash2, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useToast } from './ui/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import type { Content, ExportContent, ExportJSON, ImageFile, UploadFile } from '@/types/type'
import { base64ToBlob, blobToBase64, getMimeType } from '@/lib/utils'

interface HeaderProps {
  contents: Content[]
}

type DialogType = 'save_file' | 'save_image' | 'open_file' | 'reset_data'

export function Header(props: HeaderProps) {
  const [isOpenFile, setIsOpenFile] = useState(false)
  const [dialogType, setDialogType] = useState<DialogType>('save_file')
  const { contents } = props
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleDialogOpen(type: DialogType) {
    setIsOpenFile(true)
    setDialogType(type)
  }

  function handleOpenfileBtnClick() {
    if (fileRef.current) {
      fileRef.current.click()
    }
  }

  async function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      // Check if it's a JSON file
      const reader = new FileReader()
      reader.onload = (e) => {
        const json = e.target?.result as string
        try {
          const importData = JSON.parse(json) as ExportJSON
          if (typeof importData === 'object' && importData !== null) {
            if ('data' in importData) {
              const exportContents = importData.data
              const contents: Content[] = exportContents.map((item) => {
                return {
                  ...item,
                  uploadFiles: item.uploadFiles?.map((file) => {
                    return {
                      uid: file.uid,
                      name: file.name,
                      raw: base64ToBlob(file.src, getMimeType(file.src) ? getMimeType(file.src)! : ''),
                    } as UploadFile
                  }),
                }
              })
              if ('type' in importData && importData.type === 'oneimg') {
                // remove previous all data

                // cache import data
                console.log(contents)
              }
            }
          } else {
            toast({
              title: 'Empty JSON file',
              description: 'Please upload a valid oneimg file.',
            })
          }
        } catch (error) {
          toast({
            title: 'Invalid file format',
            description: 'Please upload a valid oneimg file.',
          })
        }
      }
      reader.readAsText(file)
    }
  }

  async function handleFileSave() {
    const exportContents = await Promise.all(
      contents.map(async (item) => {
        const uploadFiles: ImageFile[] = await Promise.all(
          item.uploadFiles?.map(async file => ({
            name: file.name,
            uid: file.uid,
            src: await blobToBase64(file.raw),
          })) || [],
        )

        return {
          id: item.id!,
          title: item.title,
          content: item.content,
          parentId: item.parentId,
          uploadFiles,
        } as ExportContent
      }),
    )

    const exportData: ExportJSON = {
      type: 'oneimg',
      version: 1,
      source: 'https://oneimg.xyz',
      data: exportContents,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    try {
      // open the system file save dialog
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: '未命名.oneimg',
          types: [{
            description: 'OneImg File',
            accept: { 'application/json': ['.oneimg'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const fileName = prompt('请输入文件名称', '未命名.oneimg') || '未命名.oneimg'
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = fileName
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch (error) {
      console.log('File save failed', error)
    }
  }

  return (
    <header className="h-[58px] flex items-center px-4 border-b border-b-gray-200">
      <Link href="/">
        <Logo type="full" />
      </Link>
      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={() => handleDialogOpen('open_file')}>
          <Folder className="w-4 h-4 mr-2" />
          <span>打开文件</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleDialogOpen('save_file')}>
          <Download className="w-4 h-4 mr-2" />
          <span>保存文件</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleDialogOpen('reset_data')}>
          <Trash2 className="w-4 h-4 mr-2" />
          <span>重置主题</span>
        </Button>
        <Button size="sm" onClick={() => handleDialogOpen('save_image')}>
          <ImageDown className="w-4 h-4 mr-2" />
          <span>导出图片</span>
        </Button>
      </div>
      <Dialog open={isOpenFile} onOpenChange={() => setIsOpenFile(!isOpenFile)}>
        {dialogType === 'open_file' && <DialogContent className="max-w-full sm:max-w-[900px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">从文件加载</DialogTitle>
            <DialogDescription className="hidden">
              open file
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8 py-4">
            <div className="flex items-center gap-4 p-8 bg-gray-300 rounded-lg">
              <div className="flex flex-grow-0 flex-shrink-0 items-center justify-center bg-yellow-400 w-[56px] h-[56px] rounded-full">
                <TriangleAlert className="w-6 h-6" />
              </div>
              <div>
                <p>从文件加载将<strong>替换您现有的内容</strong>。</p>
                <p>您可以先使用下列方式备份您的数据</p>
              </div>
              <Button variant="default" className="ml-auto bg-yellow-400 text-black hover:bg-yellow-500" onClick={handleOpenfileBtnClick}>
                从文件加载
              </Button>
              <Input onChange={handleFileImport} type="file" className="hidden" ref={fileRef} />
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">导出为图片</h3>
                <p className="text-sm flex-grow">将主题数据导出为图片，以便以后导入。</p>
                <Button variant="outline" size="lg">导出为图片</Button>
              </div>

              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">保存到本地</h3>
                <p className="text-sm flex-grow">将主题数据导出为文件，以便以后导入。</p>
                <Button variant="outline" size="lg" onClick={handleFileSave}>保存到本地</Button>
              </div>

              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">OneIMG+</h3>
                <p className="text-sm flex-grow">将主题数据保存到您的 OneIMG+ 工作区。</p>
                <Button variant="outline" size="lg" disabled={true}>即将上线</Button>
              </div>
            </div>
          </div>
        </DialogContent>}
        {dialogType === 'save_file' && <DialogContent className="max-w-full sm:max-w-[900px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
          <DialogHeader className="text-2xl pb-4 border-b">
            <DialogTitle className="">保存到...</DialogTitle>
            <DialogDescription className="hidden">
              save as...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-center justify-center flex-col gap-4 px-8 py-4">
                <div className="flex flex-grow-0 flex-shrink-0 items-center justify-center bg-primary w-[110px] h-[110px] rounded-full">
                  <Download className="w-12 h-12 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl">保存到本地</h3>
                <p className="text-sm flex-grow">将主题数据导出为文件，以便以后导入。</p>
                <Button variant="outline" size="lg" onClick={handleFileSave}>保存到本地</Button>
              </div>

              <div className="flex items-center justify-center flex-col gap-4 px-8 py-4">
                <div className="flex flex-grow-0 flex-shrink-0 items-center justify-center bg-primary w-[110px] h-[110px] rounded-full">
                  <LinkIcon className="w-12 h-12 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl">分享链接</h3>
                <p className="text-sm flex-grow">导出为只读链接</p>
                <Button variant="outline" size="lg" disabled={true}>即将上线</Button>
              </div>

              <div className="flex items-center justify-center flex-col gap-4 px-8 py-4">
                <div className="flex flex-grow-0 flex-shrink-0 items-center justify-center bg-warning w-[110px] h-[110px] rounded-full">
                  <Logo type="part" className="w-12 h-12 text-warning-foreground" />
                </div>
                <h3 className="font-bold text-xl">OneIMG+</h3>
                <p className="text-sm flex-grow">将主题数据保存到您的 OneIMG+ 工作区。</p>
                <Button variant="outline" size="lg" disabled={true}>即将上线</Button>
              </div>
            </div>
          </div>
        </DialogContent>}
        {dialogType === 'save_image' && <DialogContent className="max-w-full sm:max-w-[900px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">导出图片</DialogTitle>
            <DialogDescription className="hidden">
              export as image
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">导出为图片</h3>
                <p className="text-sm flex-grow">将主题数据导出为图片，以便以后导入。</p>
                <Button variant="outline" size="lg">导出为图片</Button>
              </div>

              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">导出为图片</h3>
                <p className="text-sm flex-grow">将主题数据导出为文件，以便以后导入。</p>
                <Button variant="outline" size="lg">保存到本地</Button>
              </div>
              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">OneIMG+</h3>
                <p className="text-sm flex-grow">将主题数据保存到您的 OneIMG+ 工作区。</p>
                <Button variant="outline" size="lg" disabled={true}>即将上线</Button>
              </div>
            </div>
          </div>
        </DialogContent>}
        {dialogType === 'reset_data' && <DialogContent className="max-w-full sm:max-w-[495px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
          <DialogHeader className="text-2xl pb-4 border-b">
            <DialogTitle className="">清除数据</DialogTitle>
            <DialogDescription className="hidden">
              reset all data
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8 py-4">
            <p>
              这将会清除整个主题数据。您是否继续？
            </p>
          </div>
          <DialogFooter>
            <div className="flex gap-4">
              <Button variant="outline" size="lg" onClick={() => setIsOpenFile(false)}>取消</Button>
              <Button variant="destructive" size="lg">确定</Button>
            </div>
          </DialogFooter>
        </DialogContent>}
      </Dialog>
    </header>
  )
}
