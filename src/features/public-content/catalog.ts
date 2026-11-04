import type { Metadata, Viewport } from 'next'
import tutorials from '../../../docs/product/adsense-readiness/content/tutorials.json'
import pages from '../../../docs/product/adsense-readiness/content/pages.json'

export { tutorials, pages }
export const siteUrl = 'https://oneimgai.com'

export function publicMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: siteUrl + path }, openGraph: { title, description, url: siteUrl + path, locale: 'zh_CN', type: 'website' } }
}

export const publicViewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true }
