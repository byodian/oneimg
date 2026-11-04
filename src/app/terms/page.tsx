import { publicMetadata } from '@/features/public-content/catalog'
import { PolicyPage } from '@/features/public-content/policy-page'

export const metadata = publicMetadata('使用条款', '了解 Oneimg 当前能力、用户内容和素材责任、本地数据备份及第三方服务边界。', '/terms')

export default function Page() {
  return <PolicyPage slug="terms" />
}

export { publicViewport as viewport } from '@/features/public-content/catalog'
