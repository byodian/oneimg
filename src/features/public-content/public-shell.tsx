import styles from './public.module.css'
import { Logo } from '@/components/logo'

export function PublicFooter() {
  return <footer className={styles.footer}>
    <div><a href="/" aria-label="Oneimg 首页"><Logo type="full" /></a><p>让每一份表达，都有好模样。</p></div>
    <nav aria-label="页脚导航">
      <a href="/blog">使用教程</a><a href="/about">关于项目</a><a href="/privacy">隐私政策</a><a href="/terms">使用条款</a><a href="/privacy#choices">隐私设置</a><a href="/sponsor">支持项目</a>
      <a href="https://github.com/byodian/oneimg/issues" target="_blank" rel="noreferrer">反馈建议</a>
    </nav>
  </footer>
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <a href="#public-main" className={styles.skip}>跳到正文</a>
    <header className={styles.header}>
      <a href="/" aria-label="Oneimg 首页"><Logo type="full" /></a>
      <nav aria-label="公开导航"><a href="/blog">使用教程</a><a href="/about">关于项目</a><a href="/editor" className={styles.start}>开始创作 <span aria-hidden="true">↗</span></a></nav>
    </header>
    <main id="public-main" tabIndex={-1} className={styles.main}>{children}</main>
    <PublicFooter />
  </div>
}
