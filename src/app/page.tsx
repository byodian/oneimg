'use client'
import { useEffect, useState } from 'react'
import Preview from '@/components/preview'
import type { Content } from '@/types/type'
import { addContent, deleteContent, getContents, updateContent } from '@/lib/indexed-db'
import { useToast } from '@/components/ui/use-toast'
import { Workspace } from '@/components/workspace'
export default function Home() {
  const [contents, setContents] = useState<Content[]>([])
  const { toast } = useToast()

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

  const handleSubContentAdd = async (parentId: number) => {
    console.log(parentId)
  }

  return (
    <div className="flex h-full">
      <div className="w-[460px]  overflow-y-auto min-w-[460px]">
        <Preview contents={contents} className="w-[460px] p-4 m-auto" />
      </div>
      <div className="flex-grow flex justify-center p-8 bg-card text-card-foreground overflow-y-auto">
        <Workspace
          contents={contents}
          onContentSubmit={handleContentSubmit}
          onContentDelete={handleContentDelete}
          onSubContentAdd={handleSubContentAdd}
        />
      </div>
    </div>
  )
}
