import Image from 'next/image'
import { publicMetadata, tutorials } from '@/features/public-content/catalog'
import { tutorialImages } from '@/features/public-content/images'
import { PublicShell } from '@/features/public-content/public-shell'
import styles from '@/features/public-content/public.module.css'

export const metadata = publicMetadata('使用教程', '从第一张图到导出与备份，四篇实际操作教程帮助你使用 Oneimg 当前编辑器。', '/blog')

export default function BlogPage() {
  return <PublicShell>
    <p className={styles.eyebrow}>Oneimg · 使用手册</p>
    <h1 className={styles.heading}>让想法成图，<br />从这里开始。</h1>
    <p className={styles.intro}>跟着一份阅读笔记，熟悉编辑、样式、导出与备份。每一步，都对应当前编辑器里的真实操作。</p>
    <div className={styles.list}>{tutorials.map(article => <a href={`/blog/${article.slug}`} key={article.slug} className={styles.card}>
      <Image src={tutorialImages[article.image as keyof typeof tutorialImages]} alt={article.imageAlt} className={styles.cardImage} sizes="(max-width:640px) 100vw, 480px" />
      <h2>{article.title} <span aria-hidden="true">↗</span></h2><p>{article.description}</p>
      <div className={styles.meta}><span>约 {article.minutes} 分钟</span><span>byodian · 更新于 <time dateTime={article.updated}>{article.updated}</time></span></div>
    </a>)}</div>
  </PublicShell>
}

export { publicViewport as viewport } from '@/features/public-content/catalog'
