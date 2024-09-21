'use client'

import { ChevronDown, Download, Folder, ImageDown, LinkIcon, Trash2, TriangleAlert } from 'lucide-react'
// import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ExportImageDialog } from './export-dialog'
import { useToast } from '@/components/ui/use-toast'
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
import type { Content, PreviewRef, ThemeColor } from '@/types/common'
import type { ExportContent, ExportJSON } from '@/components/header/types'
import { addAllContents, removeAllContents } from '@/lib/indexed-db'

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  // MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  // SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface HeaderProps {
  contents: Content[];
  setContents: (contents: Content[]) => void;
  previewRef: React.RefObject<PreviewRef>;
  theme: string;
  themeColor: ThemeColor;
  setTheme: (theme: string) => void;
  setThemeColor: (color: ThemeColor) => void
}

type DialogType = 'save_file' | 'open_file' | 'reset_data'

export function Header(props: HeaderProps) {
  const [isOpenFile, setIsOpenFile] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<DialogType>('save_file')
  const [isExporting, setIsExporting] = useState(true)
  const { contents, setContents, previewRef, theme, themeColor, setTheme, setThemeColor } = props
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Regenerate images when the contents are updated
    setIsExporting(true)
  }, [contents])

  // open different dialog by type
  function handleDialogOpen(type: DialogType) {
    setIsOpenFile(true)
    setDialogType(type)
  }

  function handleOpenfileBtnClick() {
    if (fileRef.current) {
      fileRef.current.click()
      setIsOpenFile(false)
    }
  }

  // open from file
  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      // Check if it's a JSON file
      const reader = new FileReader()
      reader.onload = async (e) => {
        const json = e.target?.result as string
        try {
          const importData = JSON.parse(json) as ExportJSON
          if (typeof importData !== 'object' || importData === null) {
            toast({
              title: 'Empty JSON file',
              description: 'Please upload a valid oneimg file.',
            })
            return
          }

          if (!(importData.type && importData.type === 'oneimg')) {
            toast({
              title: 'Invalid file format',
              description: 'Please upload a valid oneimg file.',
            })
            return
          }

          if (importData.data && typeof importData.data === 'object') {
            const exportContents = importData.data
            const contents: Content[] = exportContents.map(item => item)

            // remove previous all data
            await removeAllContents()
            // cache import data
            await addAllContents(contents)
            setContents(contents)

            const theme = importData.theme ?? 'default'
            const themeColor = importData.themeColor ?? 'tech_blue'
            setTheme(theme)
            setThemeColor(themeColor)
            localStorage.setItem('currentTheme', theme)
            localStorage.setItem('currentThemeColor', themeColor)

            // 允许前后两次选择相同文件
            event.target.value = ''
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

  // save as file
  async function handleFileSave() {
    const exportContents = await Promise.all(
      contents.map((item) => {
        return {
          id: item.id!,
          title: item.title,
          type: item.type,
          content: item.content,
          parentId: item.parentId,
          uploadFiles: item.uploadFiles,
        } as ExportContent
      }),
    )

    const exportData: ExportJSON = {
      type: 'oneimg',
      version: 1,
      source: 'https://oneimgai.com',
      theme: theme ?? 'default',
      themeColor: themeColor ?? 'tech_blue',
      data: exportContents,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    try {
      // open the system file save dialog
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        const date = new Date()
        const fullDateString = `${date.toLocaleDateString().replace(/\//g, '-')} ${date.toLocaleTimeString().replaceAll(':', '')}`
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `未命名-${fullDateString}.oneimg`,
          types: [{
            description: 'OneImg File',
            accept: { 'application/json': ['.oneimg'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        toast({
          title: '文件已保存',
          duration: 1000,
        })
      } else {
        // eslint-disable-next-line no-alert
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

  async function handleDataClear() {
    await removeAllContents()
    localStorage.clear()
    setContents([])
    setIsOpenFile(false)
    setTheme('')
    setThemeColor('tech_blue')
  }

  // open the dialog of saving as image
  async function handleImageDialogOpen() {
    setImageDialogOpen(true)
    setIsExporting(true)
  }

  return (
    <header className="h-[58px] flex gap-4 items-center px-4 border-b border-b-gray-200">
      {/* <Link href="/"> */}
      {/*   <Logo type="full" /> */}
      {/* </Link> */}
      <Menubar className="p-0 cursor-pointer border-none bg-white hover:bg-accent">
        <MenubarMenu>
          <MenubarTrigger>
            <Logo type="full" />
            <ChevronDown className="ml-2 h-4 w-4" />
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => {
              if (!contents.length) {
                handleOpenfileBtnClick()
              } else {
                handleDialogOpen('open_file')
              }
            }}>
              <Folder className="w-4 h-4 mr-2" />
              <span>打开文件</span>
              {/* <MenubarShortcut>⌘T</MenubarShortcut> */}
            </MenubarItem>
            <MenubarItem onClick={() => handleDialogOpen('save_file')}>
              <Download className="w-4 h-4 mr-2" />
              <span>保存文件</span>
            </MenubarItem>
            <MenubarItem onClick={() => handleDialogOpen('reset_data')}>
              <Trash2 className="w-4 h-4 mr-2" />
              <span>重置主题</span>
            </MenubarItem>
            <MenubarItem onClick={handleImageDialogOpen}>
              <ImageDown className="w-4 h-4 mr-2" />
              <span>导出图片</span>
            </MenubarItem>
            <MenubarSeparator />
            <div className="px-1.5 py-2 text-sm">
              <div className="mb-2">模板</div>
              <Select value={theme} onValueChange={(value) => {
                setTheme(value)
                localStorage.setItem('currentTheme', value)
              }}>
                <SelectTrigger className="h-8">
                  <SelectValue className="text-muted-foreground" placeholder="请选择一个主题模版" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {/* <SelectLabel>模板</SelectLabel> */}
                    <SelectItem value="wechat-post-1">公众号长图推文1</SelectItem>
                    <SelectItem value="wechat-post-2">公众号长图推文2</SelectItem>
                    {/* <SelectItem value="red-post">小红书推文</SelectItem> */}
                    {/* <SelectItem value="default">默认</SelectItem> */}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="px-1.5 py-2 text-sm">
              <div className="mb-2">模版色</div>
              <div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setThemeColor('tech_blue')
                  localStorage.setItem('currentThemeColor', 'tech_blue')
                }}>
                  <div className="w-4 h-4 bg-[#4383EC] rounded-full"></div>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => {
                  setThemeColor('vibrant_orange')
                  localStorage.setItem('currentThemeColor', 'vibrant_orange')
                }}>
                  <div className="w-4 h-4 bg-[#FF611D] rounded-full"></div>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => {
                  setThemeColor('rose_red')
                  localStorage.setItem('currentThemeColor', 'rose_red')
                }}>
                  <div className="w-4 h-4 bg-[#F14040] rounded-full"></div>
                </Button>
              </div>
            </div>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div className="flex flex-wrap gap-2 ml-auto">
        {/* <Button variant="outline" size="sm" onClick={() => { */}
        {/*   if (!contents.length) { */}
        {/*     handleOpenfileBtnClick() */}
        {/*   } else { */}
        {/*     handleDialogOpen('open_file') */}
        {/*   } */}
        {/* }}> */}
        {/*   <Folder className="w-4 h-4 mr-2" /> */}
        {/*   <span>打开文件</span> */}
        {/*   <Input onChange={handleFileImport} type="file" className="hidden" ref={fileRef} /> */}
        {/* </Button> */}
        {/* <Button variant="outline" size="sm" onClick={() => handleDialogOpen('save_file')}> */}
        {/*   <Download className="w-4 h-4 mr-2" /> */}
        {/*   <span>保存文件</span> */}
        {/* </Button> */}
        {/* <Button variant="outline" size="sm" onClick={() => handleDialogOpen('reset_data')}> */}
        {/*   <Trash2 className="w-4 h-4 mr-2" /> */}
        {/*   <span>重置主题</span> */}
        {/* </Button> */}
        <Input onChange={handleFileImport} type="file" className="hidden" ref={fileRef} />
        <Button size="sm" onClick={handleImageDialogOpen}>
          <ImageDown className="w-4 h-4 mr-2" />
          <span>导出图片</span>
        </Button>
      </div>
      <Dialog open={isOpenFile} onOpenChange={setIsOpenFile}>
        {dialogType === 'open_file' && <DialogContent className="max-w-full sm:max-w-[900px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl mb-4">从文件加载</DialogTitle>
            <DialogDescription className="hidden">
              open file
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8">
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
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="text-center flex flex-col gap-4 px-6 py-4">
                <h3 className="font-bold text-xl">导出为图片</h3>
                <p className="text-sm flex-grow">将主题数据导出为图片，以便以后导入。</p>
                <Button variant="outline" size="lg" onClick={handleImageDialogOpen}>导出为图片</Button>
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
          <DialogHeader className="pb-4 border-b mb-4">
            <DialogTitle className="text-2xl">保存到...</DialogTitle>
            <DialogDescription className="hidden">
              save as...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-center justify-center flex-col gap-4 px-8 py-4">
                <div className="flex flex-grow-0 flex-shrink-0 items-center justify-center bg-primary w-[110px] h-[110px] rounded-full">
                  <Download className="w-12 h-12 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl">保存到本地</h3>
                <p className="text-sm flex-grow">将主题数据导出为文件，以便以后导入。</p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={async () => {
                    await handleFileSave()
                    setIsOpenFile(false)
                  }}>保存到本地</Button>
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
        {dialogType === 'reset_data' && <DialogContent className="max-w-full sm:max-w-[495px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
          <DialogHeader className="text-2xl pb-4 border-b mb-4">
            <DialogTitle className="">清除数据</DialogTitle>
            <DialogDescription className="hidden">
              reset all data
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-8 mb-8">
            <p>
              这将会清除整个主题数据。您是否继续？
            </p>
          </div>
          <DialogFooter>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsOpenFile(false)}>取消</Button>
              <Button variant="destructive" onClick={handleDataClear}>确定</Button>
            </div>
          </DialogFooter>
        </DialogContent>}
      </Dialog>
      <ExportImageDialog
        previewRef={previewRef}
        isExportModalOpen={imageDialogOpen}
        setIsExportModalOpen={setImageDialogOpen}
        isExporting={isExporting}
        setIsExporting={setIsExporting}
      />
    </header >
  )
}
