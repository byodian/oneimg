import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SortableItemProps } from '@/types/common'
import { cn } from '@/lib'

export function SortableItem({ item, children, disabled = false }: SortableItemProps) {
  const id = item.id
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={
      cn(
        !item.parentId ? 'text-lg text-primary group/item' : 'group/child-item text-base pl-4 text-secondary-foreground',
        item.type === 'theme_content' && 'text-2xl',
        isOver && item.parentId == null && 'bg-gray-50',
        'relative',
      )
    }>
      {children}
    </div>
  )
}
