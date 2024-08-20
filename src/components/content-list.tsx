import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import type { ContentListProps, handleContentDelete, handleContentEdit } from '@/types/type'

export default function ContentList({ contents, handleContentEdit, handleContentDelete }: ContentListProps) {
  return (
    <div>
      {contents.map(content => (
        <div key={content.id} className="cursor-pointer p-2 hover:bg-accent">
          {content.title && <h1 className="text-lg font-bold">{parse(DOMPurify.sanitize(content.title))}</h1>}
        </div>
      ))}
    </div>
  )
}
