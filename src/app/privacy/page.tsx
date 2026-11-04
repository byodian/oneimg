import { publicMetadata } from '@/features/public-content/catalog'
import { PolicyPage } from '@/features/public-content/policy-page'

export const dynamic = 'force-dynamic'

export const metadata = publicMetadata('隐私政策', '了解浏览器本地内容、备份与清理风险，以及 Google 广告和隐私选择的处理边界。', '/privacy')

export default function Page() {
  return <PolicyPage slug="privacy" />
}

export { publicViewport as viewport } from '@/features/public-content/catalog'
