import { notFound } from 'next/navigation'
import { pages } from './catalog'
import { ContentSections } from './sections'
import { PublicShell } from './public-shell'
import { PrivacySettings } from './tutorial-advertising'
import { advertisingConfig } from './advertising-config'
import styles from './public.module.css'

export function PolicyPage({ slug }: { slug: string }) {
  const page = pages.find(item => item.slug === slug)
  if (!page) {
    notFound()
  }
  return <PublicShell><article className={styles.article}>
    <p className={styles.eyebrow}>Oneimg · 项目与使用说明</p>
    <h1 className={styles.heading}>{page.title}</h1>
    <p className={styles.intro}>{page.description}</p>
    <div className={styles.meta}>更新于 <time dateTime="2026-11-01">2026-11-01</time></div>
    <ContentSections sections={page.sections} />
    {slug === 'privacy' && <PrivacySettings config={advertisingConfig()} />}
  </article></PublicShell>
}
