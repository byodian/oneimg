export const canonicalStylePack = {
  id: 'oneimg-foundation@1',
  cssText: String.raw`
  @layer oneimg-foundation;
  @layer oneimg-foundation {
  [data-oneimg-render-root] {
    box-sizing: border-box;
    color-scheme: light;
    display: block;
    font-family: var(--oneimg-font-family);
    font-size: 16px;
    font-style: normal;
    font-synthesis: none;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1.5;
    margin: 0;
    overflow: hidden;
    padding: 0;
    text-align: left;
    text-rendering: geometricPrecision;
    width: var(--oneimg-reference-width);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  [data-oneimg-render-root] :where(*) {
    box-sizing: border-box;
  }

  [data-oneimg-render-root] :where(article, section, div, header, footer, figure, figcaption, h1, h2, h3, p, ul, li, span) {
    margin: 0;
    padding: 0;
  }

  [data-oneimg-render-root] :where(ul) {
    list-style: none;
  }

  [data-oneimg-render-root] :where(img) {
    display: block;
    max-width: 100%;
  }
  [data-oneimg-render-root] {
    --oneimg-ink-soft: color-mix(in srgb, var(--oneimg-foreground) 64%, transparent);
    --oneimg-accent-soft: color-mix(in srgb, var(--oneimg-accent) 16%, var(--oneimg-surface));
    background: var(--oneimg-background);
    color: var(--oneimg-foreground);
  }
  [data-oneimg-render-root] .oneimg-section {
    position: relative;
  }

  [data-oneimg-render-root] .oneimg-eyebrow {
    color: var(--oneimg-accent);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  [data-oneimg-render-root] .oneimg-hero {
    align-content: end;
    background:
      radial-gradient(circle at 88% 12%, var(--oneimg-accent-soft), transparent 34%),
      linear-gradient(155deg, var(--oneimg-surface), var(--oneimg-background));
    display: grid;
    min-height: 246px;
    padding: 46px 48px 40px;
  }

  [data-oneimg-render-root] .oneimg-hero-copy {
    display: grid;
    gap: 12px;
    max-width: 520px;
  }

  [data-oneimg-render-root] .oneimg-title {
    font-size: 48px;
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.08;
    text-wrap: balance;
  }

  [data-oneimg-render-root] .oneimg-lede {
    color: var(--oneimg-ink-soft);
    font-size: 18px;
    line-height: 1.6;
    max-width: 460px;
  }

  [data-oneimg-render-root] .oneimg-grid-section {
    background: var(--oneimg-background);
    padding: 38px 48px 42px;
  }

  [data-oneimg-render-root] .oneimg-grid {
    background: var(--oneimg-surface);
    border: 1px solid color-mix(in srgb, var(--oneimg-foreground) 10%, transparent);
    border-radius: 24px;
    box-shadow: 0 20px 52px rgba(24, 31, 49, 0.13);
    display: grid;
    gap: 1px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 18px;
    overflow: hidden;
  }

  [data-oneimg-render-root] .oneimg-feature {
    background: var(--oneimg-surface);
    min-height: 132px;
    padding: 22px 24px;
  }

  [data-oneimg-render-root] .oneimg-feature:nth-child(odd) {
    background: var(--oneimg-accent-soft);
  }

  [data-oneimg-render-root] .oneimg-feature-title,
  [data-oneimg-render-root] .oneimg-media-title,
  [data-oneimg-render-root] .oneimg-summary-title {
    font-size: 21px;
    font-weight: 700;
    line-height: 1.25;
  }

  [data-oneimg-render-root] .oneimg-feature-body,
  [data-oneimg-render-root] .oneimg-media-body,
  [data-oneimg-render-root] .oneimg-summary-body {
    color: var(--oneimg-ink-soft);
    font-size: 14px;
    line-height: 1.65;
    margin-top: 8px;
  }

  [data-oneimg-render-root] .oneimg-media {
    align-items: center;
    background: var(--oneimg-muted);
    display: flex;
    gap: 30px;
    min-height: 282px;
    padding: 38px 48px;
  }

  [data-oneimg-render-root] .oneimg-media-figure {
    border-radius: 20px;
    box-shadow: 0 14px 36px rgba(18, 26, 45, 0.2);
    flex: 0 0 226px;
    overflow: hidden;
  }

  [data-oneimg-render-root] .oneimg-media-image {
    aspect-ratio: 4 / 3;
    height: 170px;
    object-fit: cover;
    width: 226px;
  }

  [data-oneimg-render-root] .oneimg-media-copy {
    flex: 1 1 auto;
    min-width: 0;
  }

  [data-oneimg-render-root] .oneimg-media-title {
    font-size: 28px;
    margin-top: 12px;
    text-wrap: balance;
  }

  [data-oneimg-render-root] .oneimg-summary {
    background: var(--oneimg-foreground);
    color: var(--oneimg-background);
    display: grid;
    gap: 26px;
    grid-template-columns: 1fr auto;
    min-height: 172px;
    padding: 36px 48px 38px;
  }

  [data-oneimg-render-root] .oneimg-summary-copy {
    max-width: 330px;
  }

  [data-oneimg-render-root] .oneimg-summary-body {
    color: color-mix(in srgb, var(--oneimg-background) 70%, transparent);
  }

  [data-oneimg-render-root] .oneimg-facts {
    align-content: start;
    display: grid;
    gap: 8px;
    min-width: 148px;
  }

  [data-oneimg-render-root] .oneimg-fact {
    border: 1px solid color-mix(in srgb, var(--oneimg-background) 24%, transparent);
    border-radius: 999px;
    font-size: 12px;
    line-height: 1.2;
    padding: 8px 12px;
    text-align: center;
  }

  [data-oneimg-render-root] .oneimg-rich-text-section {
    background: var(--oneimg-surface);
    border-bottom: 1px solid color-mix(in srgb, var(--oneimg-foreground) 8%, transparent);
    padding: 42px 48px;
  }

  [data-oneimg-render-root] .oneimg-rich-text {
    color: var(--oneimg-foreground);
    margin: 0 auto;
    max-width: 544px;
    outline: none;
  }

  [data-oneimg-render-root] .oneimg-rich-text:focus,
  [data-oneimg-render-root] .oneimg-empty-editor:focus {
    outline: 2px solid color-mix(in srgb, var(--oneimg-accent) 64%, transparent);
    outline-offset: 8px;
  }

  [data-oneimg-render-root] .oneimg-rich-text :where(h1, h2, h3) {
    color: var(--oneimg-foreground);
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.18;
    text-wrap: balance;
  }

  [data-oneimg-render-root] .oneimg-rich-text h1 {
    font-size: 38px;
  }

  [data-oneimg-render-root] .oneimg-rich-text h2 {
    font-size: 28px;
    margin-top: 28px;
  }

  [data-oneimg-render-root] .oneimg-rich-text h3 {
    font-size: 21px;
    margin-top: 22px;
  }

  [data-oneimg-render-root] .oneimg-rich-text :where(p, li) {
    color: var(--oneimg-ink-soft);
    font-size: 17px;
    line-height: 1.75;
  }

  [data-oneimg-render-root] .oneimg-rich-text :where(p + p, ul + p, ol + p, blockquote + p) {
    margin-top: 16px;
  }

  [data-oneimg-render-root] .oneimg-rich-text :where(ul, ol) {
    display: grid;
    gap: 8px;
    margin: 18px 0 0;
    padding-left: 28px;
  }

  [data-oneimg-render-root] .oneimg-rich-text ul {
    list-style: disc;
  }

  [data-oneimg-render-root] .oneimg-rich-text ol {
    list-style: decimal;
  }

  [data-oneimg-render-root] .oneimg-rich-text blockquote {
    background: var(--oneimg-accent-soft);
    border-left: 4px solid var(--oneimg-accent);
    border-radius: 0 12px 12px 0;
    color: var(--oneimg-ink-soft);
    margin: 22px 0 0;
    padding: 14px 18px;
  }

  [data-oneimg-render-root] .oneimg-rich-text :where(code) {
    background: var(--oneimg-accent-soft);
    border-radius: 6px;
    color: var(--oneimg-foreground);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.88em;
    padding: 2px 5px;
  }

  [data-oneimg-render-root] .oneimg-rich-text a {
    color: var(--oneimg-accent);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  [data-oneimg-render-root] .oneimg-empty-editor {
    min-height: 420px;
    padding: 42px 48px;
  }

  [data-oneimg-render-root] .oneimg-empty-editor p {
    color: var(--oneimg-ink-soft);
    font-size: 20px;
    line-height: 1.7;
    margin: 0 auto;
    max-width: 544px;
  }

  [data-oneimg-render-root] .oneimg-empty-editor p:empty::before {
    color: color-mix(in srgb, var(--oneimg-foreground) 45%, transparent);
    content: '粘贴文字，或开始输入';
  }

  [data-oneimg-render-root] .oneimg-unknown-block {
    background: var(--oneimg-muted);
    padding: 30px 48px;
  }

  [data-oneimg-render-root] .oneimg-unknown-block h2 {
    font-size: 24px;
    margin-top: 8px;
  }

  [data-oneimg-render-root] .oneimg-unknown-block p:last-child {
    color: var(--oneimg-ink-soft);
    margin-top: 8px;
  }
  }

  /*
   * The host app ships Tailwind Preflight as unlayered CSS. This bridge keeps
   * the Style Pack layered while reverting only the host's declarations back
   * to the scoped layer below it, so preview and inert export see one cascade.
   */
  [data-oneimg-render-root],
  [data-oneimg-render-root] :where(*) {
    all: revert-layer;
  }
`,
} as const
