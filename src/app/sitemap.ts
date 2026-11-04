import type { MetadataRoute } from 'next'
import { siteUrl, tutorials } from '@/features/public-content/catalog'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['', '/blog', '/about', '/privacy', '/terms', '/sponsor'].map(path => ({ url: siteUrl + path })),
    ...tutorials.map(article => ({ url: `${siteUrl}/blog/${article.slug}`, lastModified: article.updated })),
  ]
}
