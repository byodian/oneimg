import type { Metadata, Viewport } from 'next'
import { LandingPage } from '@/components/landing/landing-page'

export const metadata: Metadata = {
  title: 'Oneimg | 把想说的，变成想分享的',
  description: '免费、开源的文字转图片工具。输入文字与图片，选择模板，实时预览，轻松导出微信长图、小红书与 Instagram 图文。无需注册，在浏览器里开始创作。',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Oneimg | 把想说的，变成想分享的',
    description: '文字、图片、一点灵感。一张好看的分享图，就这么简单。',
    url: '/',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function Home() {
  return <LandingPage />
}
