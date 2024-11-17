import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import React from 'react'
import { TooltipProvider } from '../ui/tooltip'
import type { ContentWithId } from '@/types'
import { cn } from '@/lib'

export interface ContentItemButtonsProps {
  item: ContentWithId;
  onContentEdit: (content: ContentWithId) => void;
  onDialogOpen: (content: ContentWithId) => void;
  onSubContentAdd: (parentContent: ContentWithId) => void;
}

export function ContentItemButtons(props: ContentItemButtonsProps) {
  const { onContentEdit, item, onDialogOpen, onSubContentAdd } = props

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(!item.parentId ? 'group-hover:flex' : 'group-hover/child:flex', 'hidden absolute right-4 top-0 gap-4')}>
        {item.type === 'normal_content' && (
          <>
            <div className="h-[60px] flex items-center" onClick={() => onContentEdit(item)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Pencil className="cursor-pointer text-black" width={18} height={18} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-white bg-black text-sm py-1 px-2 rounded-sm">{!item.parentId ? '编辑标题' : '编辑子标题'}</TooltipContent>
              </Tooltip>
            </div>
            <div className="h-[60px] flex items-center" onClick={() => onDialogOpen(item)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Trash2 className="cursor-pointer text-black" width={18} height={18} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-white bg-black text-sm py-1 px-2 rounded-sm">{!item.parentId ? '删除标题' : '删除子标题'}</TooltipContent>
              </Tooltip>
            </div>
            {!item.parentId && <div className="h-[60px] flex items-center" onClick={() => onSubContentAdd(item)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Plus className="cursor-pointer text-black" width={18} height={18} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-white bg-black text-sm py-1 px-2 rounded-sm">添加子标题</TooltipContent>
              </Tooltip>
            </div>}
          </>
        )}
        {/* Only editing as project information is supported */}
        {item.type === 'theme_content' && <div className="h-[60px] flex items-center" onClick={() => onContentEdit(item)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Pencil className="cursor-pointer text-black" width={18} height={18} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-white bg-black text-sm py-1 px-2 rounded-sm">编辑主题</TooltipContent>
          </Tooltip>
        </div>
        }
      </div>
    </TooltipProvider>
  )
}
