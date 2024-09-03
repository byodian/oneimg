'use client'
import { useEffect, useRef, useState } from 'react'
import { addContent, deleteContent, getContents, updateContent } from '@/lib/indexed-db'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Workspace } from '@/components/workspace/workspace'
import { Header } from '@/components/header/header'
import { Preview } from '@/components/preview/preview'

import type { Content, PreviewRef, ThemeContent } from '@/types/common'

export default function Home() {
  const [contents, setContents] = useState<Content[]>([])
  const [theme, setTheme] = useState('')
  const { toast } = useToast()
  const previewRef = useRef<PreviewRef>(null)

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const data = await getContents()
        setContents(data)
      } catch (error) {
        toast({
          title: 'Failed to load contents',
          description: 'Please refresh the page.',
          duration: 1000,
        })
      }
    }

    fetchContents()
  }, [toast])

  async function handleThemeContentSubmit(content: ThemeContent) {
    try {
      if ('id' in content) {
        await updateContent(content)
        setContents(contents.map(item => (item.id === content.id ? content : item)))
      } else {
        const newContent = {
          ...content,
          type: 'theme_content',
        } as Content
        const id = await addContent(newContent)
        setContents(prevContents => [...prevContents, { ...newContent, id }])
        setTheme(content.theme)
        window.localStorage.setItem('currentTheme', content.theme)
      }
    } catch (error) {
      toast({
        title: 'Failed to add theme content',
        description: 'Please try again.',
      })
    }
  }

  async function handleContentSubmit(content: Content) {
    try {
      if ('id' in content) {
        await updateContent(content)
        setContents(contents.map(item => (item.id === content.id ? content : item)))
      // toast({
      //   title: 'Content updated',
      //   description: 'Content updated successfully.',
      //   duration: 1000,
      // })
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
        title: 'Failed to add content',
        description: 'Please try again.',
      })
    }
  }

  async function handleContentDelete(content: Content) {
    try {
      setContents(contents.filter(item => item.id !== content.id))
      await deleteContent(content.id!)
      toast({
        title: 'Content deleted',
        description: 'Content deleted successfully',
        duration: 5000,
        action: <ToastAction altText="undo" onClick={() => handeleContenUndo(content)}>Undo</ToastAction>,
      })
    } catch (error) {
      toast({
        title: 'Failed to delete content',
        description: 'Please try again.',
      })
    }
  }

  async function handeleContenUndo(content: Content) {
    try {
      await addContent(content)
      setContents(contents.map(item => (item.id === content.id ? content : item)))
    } catch (error) {
      toast({
        title: 'Failed to add content',
        description: 'Please try again.',
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header contents={contents} setContents={setContents} previewRef={previewRef} theme={theme} setTheme={setTheme} />
      <main className="flex h-[calc(100%-58px)]">
        <div className="hidden w-full sm:block sm:w-[360px] overflow-y-auto sm:min-w-[360px] h-full">
          <Preview ref={previewRef} contents={contents} className="w-full flex flex-col m-auto" />
        </div>
        <div className="flex-grow flex justify-center bg-card text-card-foreground overflow-y-auto">
          <Workspace
            contents={contents}
            onContentSubmit={handleContentSubmit}
            onContentDelete={handleContentDelete}
            onThemeContentSubmit={handleThemeContentSubmit}
          />
        </div>
      </main>
    </div>
  )
}
