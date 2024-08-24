'use client'
import { useEffect, useRef, useState } from 'react'
import { Download, Folder, ImageDown, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Preview from '@/components/preview'
import type { Content } from '@/types/type'
import { addContent, deleteContent, getContents, updateContent } from '@/lib/indexed-db'
import { useToast } from '@/components/ui/use-toast'
import { Workspace } from '@/components/workspace'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Home() {
  const [contents, setContents] = useState<Content[]>([])
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const data = await getContents()
        setContents(data)
      } catch (error) {
        toast({
          title: 'Failed to load contents',
          description: 'Please refresh the page.',
        })
      }
    }

    fetchContents()
  }, [toast])

  const handleContentSubmit = async (content: Content) => {
    if ('id' in content) {
      await updateContent(content)
      setContents(contents.map(item => (item.id === content.id ? content : item)))
      toast({
        title: 'Content updated',
        description: 'Content updated successfully.',
      })
    } else {
      const id = await addContent(content)
      setContents([...contents, { ...content, id }])
      toast({
        title: 'Content added',
        description: 'Content added successfully.',
      })
    }
  }

  const handleContentDelete = async (content: Content) => {
    try {
      setContents(contents.filter(item => item.id !== content.id))
      await deleteContent(content.id!)
      toast({
        title: 'Content deleted',
        description: 'Content deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Failed to delete content',
        description: 'Please try again.',
      })
    }
  }

  function handleFileUploadClick() {
    if (fileRef.current) {
      fileRef.current.click()
    }
  }

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files
    if (file && file[0]) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (content instanceof ArrayBuffer) {
          console.log(content)
          const url = URL.createObjectURL(new Blob([content]))
          // Handle the imported image buffer data here
          console.log('Image buffer data:', new Uint8Array(content))
          console.log(url)
          setUrl(url)
          // You might want to update the state or perform other actions with the data
        } else {
          toast({
            title: 'Invalid file format',
            description: 'Please upload a valid image file.',
          })
        }
      }
      reader.readAsArrayBuffer(file[0])
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="h-[58px] flex items-center px-4 border-b border-b-gray-200">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleFileUploadClick}>
            <Input onChange={handleFileImport} type="file" className="hidden" ref={fileRef} />
            <Folder className="w-4 h-4 mr-2" />
            <span>打开文件</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            <span>保存文件</span>
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            <span>重置主题</span>
          </Button>
          <Button size="sm">
            <ImageDown className="w-4 h-4 mr-2" />
            <span>导出图片</span>
          </Button>
        </div>
        {/* <Menubar className="p-0 ml-auto">
          <MenubarMenu>
            <MenubarTrigger>
              <Menu className="w-5 h-5" />
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4"/>
                  <span>打开</span>
                </div>
                </MenubarItem>
              <MenubarItem>
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>保存到...</span>
                </div>
              </MenubarItem>
              <MenubarItem>
                <div className="flex items-center gap-2">
                  <ImageDown className="w-4 h-4" />
                  <span>导出图片</span>
                </div>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar> */}
      </header>
      <main className="flex h-[calc(100%-58px)]">
        <div className="w-[460px] overflow-y-auto min-w-[460px] h-full">
          <Preview contents={contents} className="w-[460px] h-full flex flex-col p-4 m-auto" />
        </div>
        <div className="flex-grow flex justify-center p-4 bg-card text-card-foreground overflow-y-auto">
          <Workspace
            contents={contents}
            onContentSubmit={handleContentSubmit}
            onContentDelete={handleContentDelete}
          />
        </div>
      </main>
    </div>
  )
}
