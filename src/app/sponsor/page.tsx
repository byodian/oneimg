import { SponsorHero } from './components/sponsor-hero'
import { SponsorList } from './components/sponsor-list'
import { PublicShell } from '@/features/public-content/public-shell'
import { publicMetadata } from '@/features/public-content/catalog'

export const metadata = publicMetadata('支持项目', '了解 Oneimg 的赞助方式与项目支持者。', '/sponsor')

export default function SponsorPage() {
  return <PublicShell><SponsorHero /><SponsorList /></PublicShell>
}

export { publicViewport as viewport } from '@/features/public-content/catalog'
