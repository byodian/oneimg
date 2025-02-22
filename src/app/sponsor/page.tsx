import type { Metadata } from 'next'
import Image from 'next/image'
import { SponsorHero } from './components/sponsor-hero'
import { SponsorList } from './components/sponsor-list'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '赞助列表',
}

export default function SponsorPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="h-[58px] flex gap-4 items-center px-4 border-b border-b-gray-200">
        <div>
          <Button variant="ghost">
            <a href="/" rel="noreferrer">
              <Logo type="full" />
            </a>
          </Button>
        </div>
        <div className="ml-auto">
          <Button size="sm" asChild variant="ghost" className="py-2 px-2">
            <a href="https://github.com/byodian/oneimg" target="_blank" rel="noreferrer">
              <Image src="/images/github.svg" alt="github icon" className="w-4 h-4 mr-2" width={24} height={24} />
              <span>Github</span>
            </a>
          </Button>
        </div>

      </header>
      <main className="overflow-auto h-[calc(100%-58px)]">
        <div className="container mx-auto py-8 px-4 overflow-auto">
          <SponsorHero />
          <SponsorList />
        </div>
      </main>
    </div>
  )
}
