import { publicMetadata } from '@/features/public-content/catalog'
import { PolicyPage } from '@/features/public-content/policy-page'

export const metadata = publicMetadata('关于 Oneimg', '了解 Oneimg 的用途、开源项目和现有反馈渠道。', '/about')

export default function Page() {
  return <PolicyPage slug="about" />
}

export { publicViewport as viewport } from '@/features/public-content/catalog'
