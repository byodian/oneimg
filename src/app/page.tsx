'use client'
import { useEffect, useRef, useState } from 'react'
import { addContent, deleteContent, getContents, updateContent } from '@/lib/indexed-db'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Workspace } from '@/components/workspace/workspace'
import { Header } from '@/components/header/header'
import { Preview } from '@/components/preview/preview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { Content, ContentWithId, PreviewRef, Theme, ThemeContent } from '@/types/common'
import { cn, getPreviewWidthClass, getThemeBaseClass } from '@/lib/utils'
import { defaultTheme, defaultThemeColor } from '@/lib'

export default function Home() {
  const [contents, setContents] = useState<ContentWithId[]>([])
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [themeColor, setThemeColor] = useState(defaultThemeColor.label)
  const [tabValue, setTabValue] = useState('workspace')
  const { toast } = useToast()
  const previewRef = useRef<PreviewRef>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = (localStorage.getItem('currentTheme') || defaultTheme) as Theme
      setTheme(currentTheme)
      const currentThemeColor = localStorage.getItem('currentThemeColor') || defaultThemeColor.label
      setThemeColor(currentThemeColor)
    }
  }, [])

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const data = await getContents()
        setContents(data)
      } catch (error) {
        toast({
          title: '加载失败',
          description: '请刷新后重试',
          duration: 1000,
        })
      }
    }

    fetchContents()
  }, [toast])

  async function handleThemeContentSubmit(themeContent: ThemeContent) {
    try {
      if ('id' in themeContent) {
        const updatedContent = {
          ...themeContent,
          type: 'theme_content',
        } as ContentWithId
        await updateContent(updatedContent)
        setContents(contents.map(item => (item.id === updatedContent.id ? updatedContent : item)))
      } else {
        const newContent = {
          ...themeContent,
          type: 'theme_content',
        } as Content
        const id = await addContent(newContent)
        setContents(prevContents => [...prevContents, { ...newContent, id }])
        setTheme(themeContent.theme)
        window.localStorage.setItem('currentTheme', themeContent.theme)
      }
    } catch (error) {
      toast({
        title: '添加失败',
        description: '请重试',
      })
    }
  }

  async function handleContentSubmit(content: Content) {
    try {
      if ('id' in content) {
        await updateContent(content as ContentWithId)
        setContents(contents.map(item => (item.id === content.id ? content as ContentWithId : item)))
      } else {
        const newContent = {
          ...content,
          type: 'normal_content',
        } as Content
        const id = await addContent(newContent)
        setContents(prevContents => [...prevContents, { ...newContent, id }])
      }
    } catch (error) {
      toast({
        title: '添加失败',
        description: '请重试',
      })
    }
  }

  async function handleContentDelete(content: ContentWithId) {
    try {
      const allDeletedContents = contents.filter(item => item.parentId === content.id)
      allDeletedContents.push(content)
      const allDeletedContentIds = allDeletedContents.map(item => item.id)
      setContents(contents.filter(item => !allDeletedContentIds.includes(item.id)))

      // Iterate through all deleted contents and delete each one
      for (const content of allDeletedContents) {
        await deleteContent(content.id)
      }

      toast({
        title: '内容已删除',
        description: '',
        duration: 5000,
        action: <ToastAction altText="undo" onClick={() => handeleContentsUndo(allDeletedContents)}>撤销</ToastAction>,
      })
    } catch (error) {
      toast({
        title: '删除失败',
        description: '请重试',
      })
    }
  }

  async function handeleContentsUndo(deletedContents: Content[]) {
    try {
      for (const content of deletedContents) {
        await addContent(content)
      }
      setContents(contents)
    } catch (error) {
      toast({
        title: '撤销失败',
        description: '',
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        contents={contents}
        setContents={setContents}
        previewRef={previewRef}
        theme={theme}
        setTheme={setTheme}
        themeColor={themeColor}
        setThemeColor={setThemeColor}
        setTableValue={setTabValue}
      />
      <main className="h-[calc(100%-58px)]">
        <Tabs
          defaultValue="workspace"
          activationMode="manual"
          value={tabValue}
          onValueChange={setTabValue}
          className="h-full flex flex-col sm:flex-row"
        >
          <TabsList className="grid w-full grid-cols-2 sm:hidden">
            <TabsTrigger value="workspace">编辑器</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" forceMount className="data-[state=inactive]:hidden sm:!block flex-grow sm:flex-grow-0 flex-shrink sm:flex-shrink-0 overflow-y-auto mt-0">
            <div
              className={
                cn(
                  'one w-full scroll-smooth h-full mx-auto',
                  getThemeBaseClass(theme),
                  theme,
                  themeColor,
                  getPreviewWidthClass(theme),
                )
              }>
              <Preview ref={previewRef} contents={contents} theme={theme} className="w-full flex flex-col m-auto" />
            </div>
          </TabsContent>
          <TabsContent value="workspace" forceMount className="data-[state=inactive]:hidden sm:flex-grow sm:!block overflow-auto">
            <div className="h-full flex-grow flex justify-center items-start bg-card text-card-foreground">
              <Workspace
                contents={contents}
                setContents={setContents}
                onContentSubmit={handleContentSubmit}
                onContentDelete={handleContentDelete}
                onThemeContentSubmit={handleThemeContentSubmit}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
