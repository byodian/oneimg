import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import { useMemo, useState } from 'react'
import { DialogTitle } from '@radix-ui/react-dialog'
import type {
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ContentItem } from './content-item'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import type { ContentListProps, ContentWithId } from '@/types/common'
import { cn } from '@/lib/utils'

export default function ContentList(props: ContentListProps) {
  const { contents, setContents, onSubmit, onContentDelete } = props
  const [isOpen, setIsOpen] = useState(false)
  const [curContent, setCurContent] = useState<ContentWithId>({} as ContentWithId)
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(
    // useSensor(MouseSensor),
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  )

  // root notes
  const rootContents = useMemo(() => {
    const filteredContents = contents.filter(content => content.parentId == null)
    return filteredContents
  }, [contents])

  const childContentsMap = useMemo(() => {
    const childContents: Map<number, ContentWithId[]> = new Map()
    for (const content of contents) {
      if (content.parentId) {
        if (!childContents.has(content.parentId)) {
          childContents.set(content.parentId, [])
        }
        childContents.get(content.parentId)!.push(content)
      }
    }
    return childContents
  }, [contents])

  function handleDialogOpen(content: ContentWithId) {
    setIsOpen(true)
    setCurContent(content)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as number)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const activeIndex = contents.findIndex(item => item.id === active.id)
    const overIndex = contents.findIndex(item => item.id === over?.id)

    const activeItem = contents[activeIndex]
    const overItem = contents[overIndex]
    if (activeItem == null || overItem == null) {
      return
    }

    if (overItem.type === 'theme_content' || activeItem.type === 'theme_content') {
      // If trying to drag over a disabled item, do nothing
      return
    }

    function resortContents(items: ContentWithId[]) {
      let newItems = [...items]

      // Check if both items are at the root level (parentId is null or undefined, so use ==)
      const bothAtRootLevel = activeItem.parentId == null && overItem.parentId == null

      // Check if the active item is a child and the over item is a parent
      const movingChildToParent = typeof activeItem.parentId === 'number' && overItem.parentId == null

      // If both items are at root level, only allow reordering
      if (bothAtRootLevel) {
        newItems = arrayMove(newItems, activeIndex, overIndex)
        // Update childOrder for root level items
        return newItems.map((item, index) =>
          item.parentId == null
            ? { ...item, childOrder: index }
            : item,
        )
      } else if (movingChildToParent) { // If moving a child to a parent, allow it
        // Update the parentId of the dragged item
        newItems[activeIndex] = { ...activeItem, parentId: overItem.id }

        // Update childOrder for items in the new parent
        const newSiblings = newItems.filter(item => item.parentId === overItem.id)
        newSiblings.forEach((item, index) => {
          const itemIndex = newItems.findIndex(i => i.id === item.id)
          newItems[itemIndex] = { ...item, childOrder: index }
        })

        // Update childOrder for items in the old parent
        const oldSiblings = newItems.filter(item => item.parentId === activeItem.parentId)
        oldSiblings.forEach((item, index) => {
          const itemIndex = newItems.findIndex(i => i.id === item.id)
          newItems[itemIndex] = { ...item, childOrder: index }
        })

        return newItems
      } else if (activeItem.parentId === overItem.parentId) { // If dragging within the same parent container
        newItems = arrayMove(newItems, activeIndex, overIndex)
        // Update childOrder for items with the same parent
        return newItems.map((item, index) =>
          item.parentId === activeItem.parentId
            ? { ...item, childOrder: index }
            : item,
        )
      }

      // For all other cases (e.g., trying to move a parent into another parent),
      // don't allow the move
      return items
    }

    if (active.id !== over?.id) {
      const newItems = resortContents(contents)
      setContents(newItems)
    }

    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={rootContents.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mb-2">
          {rootContents.map(item => (
            <ContentItem
              key={item.id}
              item={item}
              childItemMap={childContentsMap}
              onSubmit={onSubmit}
              handleDialogOpen={handleDialogOpen}
            />
          ))}

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle hidden>确定删除此标题以及子标题吗?</DialogTitle>
                <DialogDescription hidden>确定删除此标题以及子标题吗?</DialogDescription>
              </DialogHeader>
              <div className="flex">
                <span>您确定永久删除</span>
                {DOMPurify && typeof DOMPurify.sanitize === 'function' && <div className="font-bold">{parse(DOMPurify.sanitize(curContent.title))}</div>}
                <span>{`${!curContent.parentId ? '和它的子标题' : ''}？`}</span>
              </div>
              <DialogFooter className="mt-4">
                <div>
                  <Button className="mr-4" variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                  <Button variant="destructive" onClick={() => {
                    onContentDelete(curContent)
                    setIsOpen(false)
                  }}>确定</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SortableContext>
      <DragOverlay>
        {
          activeId && (
            (() => {
              const activeContent = contents.find(contentItem => contentItem.id === activeId)
              if (!activeContent) {
                return null
              }

              const isParent = !activeContent.parentId
              const className = cn(
                isParent ? 'font-bold text-xl' : 'text-base',
                'px-3 py-4 cursor-grabbing bg-white shadow-xl rounded',
              )

              return (
                <div className={className}>
                  <div className="mr-28">
                    {parse(DOMPurify.sanitize(activeContent.title || ''))}
                  </div>
                </div>
              )
            })()
          )
        }
      </DragOverlay>
    </DndContext>
  )
}
