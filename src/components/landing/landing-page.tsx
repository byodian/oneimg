'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Github,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  MousePointer2,
  Palette,
  Sparkles,
  Type,
} from 'lucide-react'
import styles from './landing-page.module.css'
import { Logo } from '@/components/logo'

const themes = [
  { id: 'tech', label: '简约科技', color: '#4383ec' },
  { id: 'simple', label: '简约黑白', color: '#25282d' },
  { id: 'cartoon', label: '简约卡通', color: '#b38aef' },
] as const

const questions = [
  {
    title: '使用 Oneimg 需要注册或付费吗？',
    answer:
      '不需要。Oneimg 是免费、开源的文字转图片工具，打开编辑器就能开始创作，无需注册账号。',
  },
  {
    title: '可以制作哪些尺寸的图片？',
    answer:
      '支持高度随内容延伸的微信长图，以及小红书（1242 × 1660）、Instagram（1080 × 1350）和 Twitter（1600 × 900）等预设尺寸。可以导出完整长图，也可以按所选尺寸导出多张切图。',
  },
  {
    title: '我的文字和图片会保存在哪里？',
    answer:
      '编辑内容保存在当前浏览器的本地存储中。图片生成也在浏览器内完成。清理浏览器数据或更换设备前，请先保存为 .oneimg 文件，之后可以重新导入继续编辑。',
  },
  {
    title: '不会设计，也能做出好看的图文吗？',
    answer:
      '可以。选择喜欢的模板，填写标题、正文并添加图片，Oneimg 会按照模板组织版式。你可以调整主题色，使用加粗、列表等格式，并实时查看效果。',
  },
]

export function LandingPage() {
  const [theme, setTheme] = useState<(typeof themes)[number]['id']>('tech')

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">
        跳到主要内容
      </a>
      <header className={styles.header}>
        <Link href="/" aria-label="Oneimg 首页" className={styles.brand}>
          <Logo type="full" />
        </Link>
        <nav className={styles.nav} aria-label="主导航">
          <a href="#features">功能亮点</a>
          <a href="#templates">模板风格</a>
          <a href="#faq">常见问题</a>
        </nav>
        <div className={styles.headerActions}>
          <a
            className={styles.github}
            href="https://github.com/byodian/oneimg"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 开源仓库（新窗口）"
          >
            <Github size={19} />
          </a>
          <a href="/editor" className={styles.smallCta}>
            开始创作 <ArrowUpRightIcon />
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.eyebrow}>
            <span /> 让内容，自带好设计
          </div>
          <h1 id="hero-title">
            把想说的，
            <br />
            变成
            <span className={styles.titleAccent}>
              想分享的
              <svg viewBox="0 0 330 16" fill="none" aria-hidden="true">
                <path
                  d="M4 10C80 0 215 0 326 8M42 14C141 7 221 8 294 12"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            。
          </h1>
          <p className={styles.heroDescription}>
            文字、图片、一点灵感。
            <br className={styles.mobileBreak} />
            一张好看的分享图，就这么简单。
            <br />用 Oneimg 把你的笔记、故事和想法，变成值得收藏的图文。
          </p>
          <div className={styles.heroActions}>
            <a href="/editor" className={styles.primaryCta}>
              免费开始创作 <ArrowRight size={18} />
            </a>
            <a href="#templates" className={styles.secondaryCta}>
              看看效果 <ArrowDown size={16} />
            </a>
          </div>
          <p className={styles.heroNote}>
            <span>
              <Check size={13} /> 无需注册
            </span>
            <span>
              <Check size={13} /> 浏览器内完成
            </span>
            <span>
              <Check size={13} /> 免费开源
            </span>
          </p>
        </section>

        <section
          id="templates"
          className={styles.showcase}
          aria-label="三种模板风格预览"
        >
          <div className={styles.dotField} />
          <div className={styles.showcaseCaption}>
            <span>一些文字，无限表达</span>
            <svg viewBox="0 0 90 45" fill="none" aria-hidden="true">
              <path
                d="M3 4C51 0 39 45 83 31M72 25L85 31L77 40"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={styles.cardFan}>
            <article
              className={styles.journalCard}
              aria-label="卡通风格读书笔记示例"
            >
              <div className={styles.journalTop}>
                <span>我的阅读手记</span>
                <Sparkles size={20} />
              </div>
              <p className={styles.journalIssue}>READING NOTES / VOL. 06</p>
              <h2>
                慢一点，
                <br />
                也没关系。
              </h2>
              <div className={styles.quoteMark}>“</div>
              <p className={styles.journalQuote}>
                生活不是一场竞赛，
                <br />
                而是一段值得细细品味的旅程。
              </p>
              <div className={styles.journalDivider} />
              <p className={styles.journalBody}>
                留一点时间给阅读，
                <br />
                也留一点空间给自己。
              </p>
              <div className={styles.journalFooter}>
                <span>把喜欢的句子，留在这里</span>
                <span>✳︎</span>
              </div>
            </article>

            <article
              className={styles.mainCard}
              data-theme={theme}
              aria-label="可切换风格的图文示例"
            >
              <div className={styles.previewTop}>
                <span>
                  <span className={styles.previewDot} /> 灵感备忘录
                </span>
                <span>CREATIVE NOTES</span>
              </div>
              <h2>
                让灵感发生，
                <br />
                让表达被看见。
              </h2>
              <p className={styles.previewIntro}>
                不必是设计师，也能让好内容拥有好模样。
              </p>
              <div className={styles.previewSection}>
                <span>01</span>
                <h3>先记录，再打磨</h3>
              </div>
              <p className={styles.previewBody}>
                一个突然冒出的想法，一段想分享的文字。
                <br />
                先把它写下来，就是创作的开始。
              </p>
              <div className={styles.previewHighlight}>
                <Sparkles size={16} />
                <span>你负责灵感，Oneimg 负责排版。</span>
              </div>
              <div className={styles.previewSection}>
                <span>02</span>
                <h3>让每一次分享，都有自己的风格</h3>
              </div>
              <p className={styles.previewBody}>
                选一个喜欢的模板，加一点自己的颜色。
                <br />
                让文字与图片一起，说出你的故事。
              </p>
              <div className={styles.previewFooter}>
                <Logo type="full" />
                <span>记录 · 创作 · 分享</span>
              </div>
            </article>

            <article
              className={styles.simpleCard}
              aria-label="黑白风格生活分享示例"
            >
              <div className={styles.simpleTop}>
                <span>日常观察</span>
                <span>2026 / NOTES</span>
              </div>
              <div className={styles.orbitArt} aria-hidden="true">
                <div />
                <div />
                <span>
                  less,
                  <br />
                  <i>but better.</i>
                </span>
              </div>
              <h2>
                给生活
                <br />
                做一点减法。
              </h2>
              <p>
                少一点匆忙，多一点感受。
                <br />
                把时间留给真正喜欢的事。
              </p>
              <div className={styles.simpleFooter}>
                <span>LESS IS MORE</span>
                <ArrowRight size={17} />
              </div>
            </article>
          </div>
          <div className={styles.floatingLabel}>
            <ImageIcon size={17} />
            <span>从文字，到一张好图</span>
            <MousePointer2
              className={styles.cursorIcon}
              size={27}
              fill="currentColor"
            />
          </div>
          <div
            className={styles.themePicker}
            role="group"
            aria-label="切换中间卡片的预览风格"
          >
            <span className={styles.pickerLabel}>换个风格试试</span>
            {themes.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={theme === item.id}
                onClick={() => setTheme(item.id)}
              >
                <span style={{ background: item.color }} />
                {item.label}
              </button>
            ))}
          </div>
          <p className={styles.previewNote} aria-live="polite">
            {themes.find(item => item.id === theme)?.label} ·
            排版效果示意，完整设置请进入编辑器
          </p>
        </section>

        <div className={styles.platforms}>
          <p>为每一个值得分享的时刻</p>
          <div>
            <span>小红书图文</span>
            <span>微信公众号长图</span>
            <span>Instagram 帖文</span>
            <span>读书笔记</span>
            <span>知识分享</span>
          </div>
        </div>

        <section
          id="features"
          className={styles.features}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow}>把心思留给内容</span>
            <h2 id="features-title">少一点排版，多一点表达。</h2>
            <p>从第一行文字，到最后一张图片，每一步都简单一点。</p>
          </div>
          <div className={styles.featureGrid}>
            <article className={styles.feature}>
              <div className={styles.featureArt} data-art="write">
                <div className={styles.miniEditor}>
                  <div>
                    <Type size={16} />
                    <span />
                    <b>B</b>
                    <i>I</i>
                    <Layers3 size={14} />
                  </div>
                  <strong>一个想法，就是起点。</strong>
                  <p>
                    写下你想分享的内容
                    <span className={styles.caret} />
                  </p>
                  <div className={styles.fakeLine} />
                </div>
                <span className={styles.artBadge}>
                  <Check size={13} /> 实时预览
                </span>
              </div>
              <h3>
                <FileText size={20} /> 像写笔记一样自然
              </h3>
              <p>
                输入文字，添加图片。加粗、列表、引用，熟悉的编辑方式，让内容清晰成形。
              </p>
            </article>
            <article className={styles.feature}>
              <div className={styles.featureArt} data-art="style">
                <div className={styles.miniStyle} data-variant="plain">
                  <span>Aa</span>
                  <i />
                </div>
                <div className={styles.miniStyle} data-variant="blue">
                  <span>Aa</span>
                  <i />
                </div>
                <div className={styles.miniStyle} data-variant="purple">
                  <span>Aa</span>
                  <i />
                </div>
                <span className={styles.paletteDots}>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <h3>
                <Palette size={20} /> 好看的风格，直接套用
              </h3>
              <p>
                简约黑白、清爽科技、活泼卡通。切换模板与主题色，让同一份内容有不同的表情。
              </p>
            </article>
            <article className={styles.feature}>
              <div className={styles.featureArt} data-art="export">
                <div className={styles.miniLong}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <ArrowRight className={styles.exportArrow} size={22} />
                <div className={styles.miniSlices}>
                  <div>
                    <i />
                    <i />
                  </div>
                  <div>
                    <i />
                    <i />
                  </div>
                  <div>
                    <i />
                    <i />
                  </div>
                </div>
                <span className={styles.artBadge}>
                  <ArrowDownToLine size={13} /> PNG
                </span>
              </div>
              <h3>
                <ArrowDownToLine size={20} /> 一张长图，或一组切图
              </h3>
              <p>
                微信长图、小红书、Instagram，多种尺寸可选。导出图片，就能分享你的下一篇内容。
              </p>
            </article>
          </div>
        </section>

        <section className={styles.workflow} aria-labelledby="workflow-title">
          <div className={styles.workflowHeading}>
            <span className={styles.sectionEyebrow}>从灵感到分享</span>
            <h2 id="workflow-title">好内容，三步成图。</h2>
            <a href="/editor">
              现在就试试 <ArrowRight size={16} />
            </a>
          </div>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h3>写下你的内容</h3>
                <p>输入标题、正文，添加喜欢的图片。</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>选一个喜欢的风格</h3>
                <p>调整模板、配色与尺寸，实时查看效果。</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>导出，分享出去</h3>
                <p>保存长图或多张切图，让好内容被看见。</p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.principles} aria-label="免费开源与本地创作">
          <div>
            <LockKeyhole size={22} />
            <h3>内容留在你的浏览器</h3>
            <p>本地编辑，本地生成图片。保存 .oneimg 文件，随时带走你的创作。</p>
          </div>
          <div>
            <Code2 size={23} />
            <h3>免费使用，也自由开放</h3>
            <p>
              Oneimg 基于 MIT 协议开源。让更多人轻松创作，也欢迎你一起完善它。
            </p>
            <a
              href="https://github.com/byodian/oneimg"
              target="_blank"
              rel="noreferrer"
            >
              在 GitHub 上了解项目 <ArrowUpRightIcon />
            </a>
          </div>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div>
            <span className={styles.sectionEyebrow}>你可能还想知道</span>
            <h2 id="faq-title">几个小问题。</h2>
          </div>
          <div className={styles.faqList}>
            {questions.map(question => (
              <details key={question.title}>
                <summary>
                  {question.title}
                  <ChevronDown size={18} />
                </summary>
                <p>{question.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.closingIcon}>
            <Logo type="part" />
          </div>
          <h2>
            你的下一张好图，
            <br className={styles.mobileBreak} />
            从一个想法开始。
          </h2>
          <p>打开 Oneimg，把今天的灵感变成看得见的分享。</p>
          <a href="/editor" className={styles.primaryCta}>
            免费开始创作 <ArrowRight size={18} />
          </a>
          <span>无需下载 · 无需注册 · 打开就能用</span>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <Link href="/" aria-label="Oneimg 首页">
            <Logo type="full" />
          </Link>
          <p>让每一份表达，都有好模样。</p>
        </div>
        <nav aria-label="页脚导航">
          <a
            href="https://github.com/byodian/oneimg"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRightIcon />
          </a>
          <a
            href="https://support.qq.com/product/673291"
            target="_blank"
            rel="noreferrer"
          >
            反馈建议
          </a>
          <Link href="/sponsor">支持项目</Link>
        </nav>
        <span>用心创造，自由分享。</span>
      </footer>
    </div>
  )
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  )
}
