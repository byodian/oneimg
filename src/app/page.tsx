'use client'
import { useEffect, useState } from 'react'
import ContentList from '@/components/content-list'
import Editor from '@/components/editor'
import Preview from '@/components/preview'
import type { Content } from '@/types/type'
import { addContent, getContents } from '@/lib/indexed-db'

export default function Home() {
  const [contents, setContents] = useState<Content[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const data = await getContents()
        setContents(data)
      } catch (error) {
        setError('Failed to load contents. Please refresh the page.')
      }
    }
    fetchContents()
  }, [])

  const handleAddContent = async (newContent: Content) => {
    try {
      const id = await addContent(newContent)
      setContents([...contents, { ...newContent, id }])
    } catch (error) {
      setError('Failed to add content. Please try again.')
    }
  }

  const handleContentEdit = (content: Content) => {
    console.log(content)
  }

  const handleContentDelete = (content: Content) => {
    console.log(content)
  }

  if (error) {
    return <div className="h-full text-destructive-foreground bg-destructive p-4">{error}</div>
  }

  return (
    <div className="flex h-full">
      <div className="w-[460px] p-8 bg-card text-card-foreground overflow-y-auto">
        <ContentList contents={contents} handleContentEdit={handleContentEdit} handleContentDelete={handleContentDelete} />
        <Editor onSubmit={handleAddContent} />
      </div>
      <div className="flex-grow-[2] overflow-y-auto min-w-[460px]">
        <Preview contents={contents} className="w-[460px] p-4 border m-auto" />
      </div>
    </div>
  )
}
