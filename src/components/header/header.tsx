'use client'

import { BookOpen, ChevronDown, Download, Folder, ImageDown, LinkIcon, MessageSquareMore, Trash2, TriangleAlert } from 'lucide-react'
// import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
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
import type { Content, ContentWithId, PreviewRef, Theme } from '@/types/common'
import type { ExportContent, ExportJSON } from '@/components/header/types'
import { addAllContents, removeAllContents } from '@/lib/indexed-db'

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
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
import { cn, defaultTheme, defaultThemeColor, removeHtmlTags, themeColorMap, themeTemplates } from '@/lib'

interface HeaderProps {
  contents: Content[];
  setContents: (contents: ContentWithId[]) => void;
  previewRef: React.RefObject<PreviewRef>;
  theme: Theme;
  themeColor: string;
  setTheme: (theme: Theme) => void;
  setThemeColor: (color: string) => void
  setTableValue?: (tab: string) => void
}

type DialogType = 'save_file' | 'open_file' | 'reset_data' | 'user_guide'

export function Header(props: HeaderProps) {
  const [isOpenFile, setIsOpenFile] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<DialogType>('save_file')
  const [isExporting, setIsExporting] = useState(true)
  const [scale, setScale] = useState('1')
  const [platform, setPlatform] = useState('')
  const { contents, setContents, previewRef, theme, themeColor, setTheme, setThemeColor, setTableValue } = props
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Regenerate images when the contents are updated
    setIsExporting(true)
  }, [contents])

  useEffect(() => {
    const userAgent = navigator.userAgent
    if (userAgent.indexOf('Mac') > -1 && navigator.platform !== 'iPhone') {
      setPlatform('mac')
    } else if (userAgent.indexOf('Win') > -1 || userAgent.indexOf('Linux') > -1) {
      setPlatform('windows')
    } else {
      setPlatform('other')
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'o' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!contents.length) {
          handleOpenfileBtnClick()
        } else {
          handleDialogOpen('open_file')
        }
      }

      if (e.key === 'e' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setImageDialogOpen(true)
        setIsExporting(true)
        setScale('1')
        // open preview
        setTableValue && setTableValue('preview')
      }

      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleDialogOpen('save_file')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [contents.length, setTableValue])

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
            const contents: ContentWithId[] = exportContents.map(item => item)

            // remove previous all data
            await removeAllContents()
            // cache import data
            await addAllContents(contents)
            setContents(contents)

            const theme = (importData.theme ?? defaultTheme) as Theme
            const themeColor = importData.themeColor ?? defaultThemeColor.label
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
          id: item.id,
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
      theme: theme ?? defaultTheme,
      themeColor: themeColor ?? defaultThemeColor.label,
      data: exportContents,
    }

    // get theme content
    const title = exportContents.find(item => item.type === 'theme_content')?.title
    const date = new Date()
    const fullDateString = `${date.toLocaleDateString().replace(/\//g, '-')}_${date.toLocaleTimeString().replaceAll(':', '')}`
    const fileName = `${removeHtmlTags(title) || '未命名'}-${fullDateString}.oneimg`

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    try {
      // open the system file save dialog
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
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
        const suggestedName = prompt('文件名称', fileName) || fileName
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = suggestedName
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
    setTheme(defaultTheme)
    setThemeColor(defaultThemeColor.label)
  }

  // open the dialog of saving as image
  async function handleImageExportDialogOpen() {
    setImageDialogOpen(true)
    setIsExporting(true)
    setScale('1')
    // open preview
    setTableValue && setTableValue('preview')
  }

  return (
    <TooltipProvider>
      <header className="h-[58px] flex gap-4 items-center px-4 border-b border-b-gray-200">
        {/* <Link href="/"> */}
        {/*   <Logo type="full" /> */}
        {/* </Link> */}
        <Input onChange={handleFileImport} type="file" className="hidden" ref={fileRef} />
        <Menubar className="p-0 cursor-pointer border-none bg-white hover:bg-accent">
          <MenubarMenu>
            <MenubarTrigger>
              <Logo type="full" />
              <ChevronDown className="ml-2 h-4 w-4" />
            </MenubarTrigger>
            <MenubarContent className="max-h-[calc(100vh-150px)] overflow-y-auto">
              <MenubarItem onClick={() => {
                if (!contents.length) {
                  handleOpenfileBtnClick()
                } else {
                  handleDialogOpen('open_file')
                }
              }}>
                <Folder className="w-4 h-4 mr-2" />
                <span>打开文件</span>
                {platform === 'mac' && <MenubarShortcut>⌘+O</MenubarShortcut>}
                {platform === 'windows' && <MenubarShortcut>Ctrl+O</MenubarShortcut>}
              </MenubarItem>
              <MenubarItem onClick={() => handleDialogOpen('save_file')}>
                <Download className="w-4 h-4 mr-2" />
                <span>保存到...</span>
                {platform === 'mac' && <MenubarShortcut>⌘+S</MenubarShortcut>}
                {platform === 'windows' && <MenubarShortcut>Ctrl+S</MenubarShortcut>}
              </MenubarItem>
              <MenubarItem onClick={() => handleDialogOpen('reset_data')}>
                <Trash2 className="w-4 h-4 mr-2" />
                <span>重置项目</span>
              </MenubarItem>
              <MenubarItem onClick={handleImageExportDialogOpen}>
                <ImageDown className="w-4 h-4 mr-2" />
                <span>导出图片</span>
                {platform === 'mac' && <MenubarShortcut>⌘+Shift+E</MenubarShortcut>}
                {platform === 'windows' && <MenubarShortcut>Ctrl+Shift+E</MenubarShortcut>}
              </MenubarItem>
              <MenubarItem onClick={() => handleDialogOpen('user_guide')} >
                <BookOpen className="w-4 h-4 mr-2" />
                <span>指南</span>
              </MenubarItem>
              <Tooltip delayDuration={0}>
                <TooltipTrigger className="w-full px-2 py-1.5 hidden sm:block">
                  <div className="flex items-center text-sm">
                    <MessageSquareMore className="w-4 h-4 mr-2" />
                    <span>反馈建议</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={-50}>
                  <div className="rounded-sm px-2 py-1.5 text-white bg-black text-sm">
                    <p>您有任何问题或改进建议，</p>
                    <p>可以发送电子邮件至 support@oneimgai.com 与我们取得联系。</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <MenubarItem asChild className="sm:hidden">
                <a href="mailto:support@oneimgai.com?subject=改进建议或问题反馈&body=您好，%0A%0A我想反馈以下问题或提供一些改进建议： %0A%0A[请在这里描述您的问题或建议]%0A%0A系统信息%0A操作系统：%0A浏览器：%0A应用版本：%0A%0A谢谢！" target="_blank" rel="noreferrer">
                  <MessageSquareMore className="w-4 h-4 mr-2" />
                  <span>反馈建议</span>
                </a>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem asChild>
                <a href="https://github.com/byodian/oneimg" target="_blank" rel="noreferrer">
                  <Image src="/images/github.svg" alt="github icon" className="w-4 h-4 mr-2" width={24} height={24} />
                  <span>Github</span>
                </a>
              </MenubarItem>
              <MenubarItem asChild>
                <a href="https://t.me/oneimg" target="_blank" rel="noreferrer">
                  <Image src="/images/telegram.svg" alt="telegram icon" className="w-4 h-4 mr-2" width={24} height={24} />
                  <span>交流群</span>
                </a>
              </MenubarItem>
              <MenubarItem asChild>
                <a href="https://x.com/byodian1" target="_blank" rel="noreferrer">
                  <Image src="/images/x.svg" alt="x icon" className="w-4 h-4 mr-2" width={24} height={24} />
                  <span>Follow us</span>
                </a>
              </MenubarItem>
              <MenubarItem asChild>
                <a href="https://www.xiaohongshu.com/user/profile/61278fd2000000000100a607" target="_blank" rel="noreferrer">
                  <Image src="/images/xiaohongshu.svg" alt="x icon" className="w-4 h-4 mr-2" width={24} height={24} />
                  <span>小红书</span>
                </a>
              </MenubarItem>
              <MenubarSeparator />
              <div className="px-1.5 py-2 text-sm">
                <div className="mb-2">模板</div>
                <Select value={theme} onValueChange={(value: Theme) => {
                  const themeColor = themeColorMap[value][0].label
                  setTheme(value)
                  setThemeColor(themeColor)
                  localStorage.setItem('currentTheme', value)
                  localStorage.setItem('currentThemeColor', themeColor)
                }}>
                  <SelectTrigger className="h-8">
                    <SelectValue className="text-muted-foreground" placeholder="请选择一个主题模版" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {
                        themeTemplates.map(template => (
                          <SelectItem key={template.value} value={template.value} disabled={template.disabled}>
                            {template.label}
                          </SelectItem>
                        ))
                      }
                    </SelectGroup>
                  </SelectContent >
                </Select >
              </div >
              <div className="px-1.5 py-2 text-sm">
                <div className="mb-2">模版色</div>
                <div>
                  {themeColorMap[theme].map(color => (
                    <Button
                      key={color.value}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setThemeColor(color.label)
                        localStorage.setItem('currentThemeColor', color.label)
                      }}
                      className={cn({ 'bg-accent': themeColor === color.label })}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }}></div>
                    </Button>
                  ))}
                </div>
              </div>
            </MenubarContent >
          </MenubarMenu >
        </Menubar >
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button size="sm" onClick={handleImageExportDialogOpen}>
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
                  <h3 className="font-bold text-xl">保存到本地</h3>
                  <p className="text-sm flex-grow">将主题数据导出为文件，以便以后导入。</p>
                  <Button variant="outline" size="lg" onClick={handleFileSave}>保存到本地</Button>
                </div>

                <div className="text-center flex flex-col gap-4 px-6 py-4">
                  <h3 className="font-bold text-xl">导出为图片</h3>
                  <p className="text-sm flex-grow">将主题数据导出为图片</p>
                  <Button variant="outline" size="lg" onClick={handleImageExportDialogOpen}>导出为图片</Button>
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
          {dialogType === 'user_guide' && <DialogContent className="max-w-full sm:max-w-[900px] px-10 py-8 h-full overflow-y-auto sm:h-auto">
            <DialogHeader className="text-2xl pb-4 border-b mb-4">
              <DialogTitle className="">使用指南</DialogTitle>
              <DialogDescription className="hidden">
                User Guide
              </DialogDescription>
            </DialogHeader>
            <div>
              <video controls autoPlay muted width="100%" height="380px">
                <source src="https://file.oneimgai.com/user-guide.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </DialogContent>}
        </Dialog>
        <ExportImageDialog
          previewRef={previewRef}
          scale={scale}
          setScale={setScale}
          isExportModalOpen={imageDialogOpen}
          setIsExportModalOpen={setImageDialogOpen}
          isExporting={isExporting}
          setIsExporting={setIsExporting}
        />
      </header >
    </TooltipProvider>
  )
}
