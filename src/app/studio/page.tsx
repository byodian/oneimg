import { notFound } from 'next/navigation'
import { StudioClient } from './studio-client'

export const dynamic = 'force-dynamic'

export default function StudioPage() {
  if (process.env.ONEIMG_ENABLE_STUDIO !== '1') {
    notFound()
  }

  return <StudioClient />
}
