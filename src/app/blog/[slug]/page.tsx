import { notFound } from 'next/navigation'
import { publicMetadata, tutorials } from '@/features/public-content/catalog'
import { ContentSections } from '@/features/public-content/sections'
import { PublicShell } from '@/features/public-content/public-shell'
import { TutorialAdvertising } from '@/features/public-content/tutorial-advertising'
import { advertisingConfig } from '@/features/public-content/advertising-config'
import styles from '@/features/public-content/public.module.css'

export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = tutorials.find(item => item.slug === params.slug)
  if (!article) {
    return { title: '教程不存在', robots: { index: false, follow: false } }
  }
  return publicMetadata(article.title, article.description, `/blog/${article.slug}`)
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const article = tutorials.find(item => item.slug === params.slug)
  if (!article) {
    notFound()
  }
  return <PublicShell><article className={styles.article}>
    <a href="/blog" className={styles.back}>← 全部教程</a>
    <p className={styles.eyebrow}>Oneimg · 当前编辑器指南</p>
    <h1 className={styles.heading}>{article.title}</h1>
    <p className={styles.intro}>{article.description}</p>
    <div className={styles.meta}><span>维护：{article.author}</span><span>更新于 <time dateTime={article.updated}>{article.updated}</time></span><span>约 {article.minutes} 分钟</span></div>
    <ContentSections sections={article.sections} />
    <TutorialAdvertising config={advertisingConfig()} />
    <div className={styles.next}><h2>接着读</h2><ul>{tutorials.filter(item => item.slug !== article.slug).map(item => <li key={item.slug}><a href={`/blog/${item.slug}`}>{item.title}</a></li>)}</ul></div>
    <a href="/editor" className={styles.action}>打开编辑器，动手试试 ↗</a>
  </article></PublicShell>
}

export { publicViewport as viewport } from '@/features/public-content/catalog'
