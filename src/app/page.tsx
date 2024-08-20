'use client'
import { useEffect, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import ContentList from '@/components/content-list'
import Editor from '@/components/editor'
import Preview from '@/components/preview'
import { Button } from '@/components/ui/button'
import type { Content } from '@/types/type'
import { addContent, getContents } from '@/lib/indexed-db'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
export default function Home() {
  const [contents, setContents] = useState<Content[]>([])
  const [showEditor, setShowEditor] = useState(false)
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

  const handleAddContent = async (newContent: Content) => {
    try {
      const id = await addContent(newContent)
      setContents([...contents, { ...newContent, id }])
      toast({
        title: 'Content added',
        description: 'Content added successfully.',
      })
    } catch (error) {
      toast({
        title: 'Failed to add content',
        description: 'Please try again.',
      })
    }
  }

  const handleContentEdit = (content: Content) => {
    console.log(content)
  }

  const handleContentDelete = (content: Content) => {
    console.log(content)
  }

  return (
    <div className="flex h-full">
      <div className="w-[460px] p-8 bg-card text-card-foreground overflow-y-auto">
        <ContentList contents={contents} handleContentEdit={handleContentEdit} handleContentDelete={handleContentDelete} />
        <Editor onSubmit={handleAddContent} className={showEditor ? '' : 'hidden'} hideEditor={() => setShowEditor(false)} />
        <Button className={cn('w-full', showEditor ? 'hidden' : '')} onClick={() => setShowEditor(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </div>
      <div className="flex-grow-[2] overflow-y-auto min-w-[460px]">
        <Preview contents={contents} className="w-[460px] p-4 border m-auto" />
      </div>
    </div>
  )
}
