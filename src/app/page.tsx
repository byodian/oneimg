'use client'
import { useEffect, useRef, useState } from 'react'
import { GlobalStyles } from 'tss-react'
import Script from 'next/script'
import {
  CACHE_KEY_TEMPLATE,
  CACHE_KEY_THEME,
  addContent,
  cn,
  deleteContent,
  generateThemeVariables,
  getContents,
  updateContent,
} from '@/lib'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Workspace } from '@/components/workspace/workspace'
import { Header } from '@/components/header/header'
import { Preview } from '@/components/preview/preview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { Content, ContentWithId, PreviewRef, ThemeContent } from '@/types'
import { DEFAULT_TEMPLATE, DEFAULT_THEME } from '@/theme'
import { CustomThemeContext } from '@/contexts/custom-theme-context'
import { useThemeStore } from '@/store/use-theme-store'

declare let eruda: any

export default function Home() {
  const [contents, setContents] = useState<ContentWithId[]>([])
  const {
    templateName,
    setTemplateName,
    theme,
    setTheme,
    templateMap,
    themeMap,
    size,
    setSize,
    sizeName,
    setSizeName,
  } = useThemeStore()
  const [cssVariables, setCssVariables] = useState({})
  const [tabValue, setTabValue] = useState('workspace')
  const { toast } = useToast()
  const previewRef = useRef<PreviewRef>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentTemplate = (localStorage.getItem(CACHE_KEY_TEMPLATE) || DEFAULT_TEMPLATE)
      setTemplateName(currentTemplate)

      const currentTheme = localStorage.getItem(CACHE_KEY_THEME) || DEFAULT_THEME.label
      setTheme(currentTheme)
    }
  }, [setTemplateName, setTheme])

  useEffect(() => {
    console.log('contents loading')
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

  useEffect(() => {
    console.log('cssVariables', theme)
    const templateConfig = themeMap[templateName].find(item => item.label === theme)

    if (templateConfig) {
      const cssVariables = generateThemeVariables(templateConfig.theme!)
      setCssVariables(cssVariables)
    }
  }, [theme, templateName, themeMap])

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
        setTemplateName(themeContent.template)
        setTheme(themeContent.theme)
        window.localStorage.setItem('currentTemplate', themeContent.template)
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
    <CustomThemeContext.Provider value={{ theme, template: templateMap[templateName] }}>
      <Script src="https://cdn.jsdelivr.net/npm/eruda"
        onLoad={() => {
          if (typeof eruda !== 'undefined') {
            eruda.init()
          }
        }}></Script>
      <GlobalStyles styles={{ ':root': cssVariables }} />
      <div className="flex flex-col h-full">
        <Header
          contents={contents}
          setContents={setContents}
          previewRef={previewRef}
          templateName={templateName}
          setTemplateName={setTemplateName}
          theme={theme}
          setTheme={setTheme}
          setTableValue={setTabValue}
          sizeName={sizeName}
          setSize={setSize}
          setSizeName={setSizeName}
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
              {/* 根据实际像素比，缩小3倍，保证正常预览。导出图片时放大三倍，可还原实际像素比 */}
              <div style={{ width: `${size.width / 3}px` }} className={cn('one scroll-smooth h-full mx-auto w-[375px]')}>
                <Preview ref={previewRef} contents={contents} className="w-full flex flex-col m-auto" />
              </div>
            </TabsContent>
            <TabsContent value="workspace" forceMount className="data-[state=inactive]:hidden flex-grow sm:!block overflow-auto">
              <div className={cn('min-h-full flex-grow flex justify-center bg-card text-card-foreground', contents.length > 0 && 'items-start')}>
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
    </CustomThemeContext.Provider>
  )
}
