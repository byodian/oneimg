'use client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type UserGuideProps = {
  guideModelOpen: boolean,
  setGuideModelOpen: (open: boolean) => void
}

export function UserGuideDialog({ guideModelOpen, setGuideModelOpen }: UserGuideProps) {
  return (
    <Dialog open={guideModelOpen} onOpenChange={setGuideModelOpen}>
      <DialogContent className="flex flex-col max-w-full sm:max-w-[840px] h-full sm:h-[500px] px-10 py-8 overflow-y-auto gap-4">
        <DialogHeader>
          <DialogTitle className="text-2xl">视频介绍</DialogTitle>
          <DialogDescription className="hidden">
            video introduction
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col sm:flex-row gap-4">

        </div>
      </DialogContent>
    </Dialog>
  )
}
