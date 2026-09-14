export const canonicalStylePack = {
  id: 'oneimg-foundation@3',
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

  [data-oneimg-render-root] :where(article, section, div, header, footer, figure, figcaption, h1, h2, h3, p, ul, li, span, pre, table, thead, tbody, tr, th, td) {
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
    --oneimg-ink-soft: var(--oneimg-foreground);
    --oneimg-accent-soft: color-mix(in srgb, var(--oneimg-accent) 16%, var(--oneimg-surface));
    --oneimg-section-pad-x: 48px;
    --oneimg-section-pad-top: 38px;
    --oneimg-section-pad-bottom: 42px;
    --oneimg-section-gap: 18px;
    --oneimg-hero-pad-top: 46px;
    --oneimg-hero-pad-bottom: 40px;
    --oneimg-media-pad-top: 38px;
    --oneimg-media-pad-bottom: 38px;
    --oneimg-summary-pad-top: 36px;
    --oneimg-summary-pad-bottom: 38px;
    --oneimg-rich-text-pad-top: 42px;
    --oneimg-rich-text-pad-bottom: 42px;
    --oneimg-structured-pad-top: 34px;
    --oneimg-structured-pad-bottom: 34px;
    --oneimg-unknown-pad-top: 30px;
    --oneimg-unknown-pad-bottom: 30px;
    background: var(--oneimg-background);
    color: var(--oneimg-foreground);
    min-height: var(--oneimg-page-height);
  }

  [data-oneimg-render-root][data-density="comfortable"] {
    --oneimg-section-pad-x: 54px;
    --oneimg-section-pad-top: 46px;
    --oneimg-section-pad-bottom: 50px;
    --oneimg-section-gap: 24px;
    --oneimg-hero-pad-top: 54px;
    --oneimg-hero-pad-bottom: 52px;
    --oneimg-media-pad-top: 46px;
    --oneimg-media-pad-bottom: 46px;
    --oneimg-summary-pad-top: 44px;
    --oneimg-summary-pad-bottom: 46px;
    --oneimg-rich-text-pad-top: 46px;
    --oneimg-rich-text-pad-bottom: 50px;
    --oneimg-structured-pad-top: 42px;
    --oneimg-structured-pad-bottom: 42px;
    --oneimg-unknown-pad-top: 38px;
    --oneimg-unknown-pad-bottom: 38px;
  }

  [data-oneimg-render-root][data-density="compact"] {
    --oneimg-section-pad-x: 36px;
    --oneimg-section-pad-top: 28px;
    --oneimg-section-pad-bottom: 32px;
    --oneimg-section-gap: 12px;
    --oneimg-hero-pad-top: 34px;
    --oneimg-hero-pad-bottom: 36px;
    --oneimg-media-pad-top: 28px;
    --oneimg-media-pad-bottom: 28px;
    --oneimg-summary-pad-top: 26px;
    --oneimg-summary-pad-bottom: 30px;
    --oneimg-rich-text-pad-top: 28px;
    --oneimg-rich-text-pad-bottom: 32px;
    --oneimg-structured-pad-top: 26px;
    --oneimg-structured-pad-bottom: 28px;
    --oneimg-unknown-pad-top: 24px;
    --oneimg-unknown-pad-bottom: 26px;
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
    padding: var(--oneimg-hero-pad-top) var(--oneimg-section-pad-x) var(--oneimg-hero-pad-bottom);
  }

  [data-oneimg-render-root] .oneimg-hero-copy {
    display: grid;
    gap: var(--oneimg-section-gap);
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
    padding: var(--oneimg-section-pad-top) var(--oneimg-section-pad-x) var(--oneimg-section-pad-bottom);
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
    gap: calc(var(--oneimg-section-gap) + 12px);
    min-height: 282px;
    padding: var(--oneimg-media-pad-top) var(--oneimg-section-pad-x) var(--oneimg-media-pad-bottom);
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

  [data-oneimg-render-root] .oneimg-media-group-section {
    background: var(--oneimg-muted);
    padding: var(--oneimg-media-pad-top) var(--oneimg-section-pad-x) var(--oneimg-media-pad-bottom);
  }

  [data-oneimg-render-root] .oneimg-media-group-header {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
  }

  [data-oneimg-render-root] .oneimg-media-group-caption {
    color: var(--oneimg-ink-soft);
    font-size: 18px;
    line-height: 1.55;
  }

  [data-oneimg-render-root] .oneimg-media-group {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  [data-oneimg-render-root] .oneimg-media-group[data-layout-columns="1"] {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-oneimg-render-root] .oneimg-media-group[data-layout-columns="2"] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  [data-oneimg-render-root] .oneimg-media-item {
    background: var(--oneimg-surface);
    border-radius: 18px;
    box-shadow: 0 12px 28px rgba(18, 26, 45, 0.15);
    min-width: 0;
    overflow: hidden;
  }

  [data-oneimg-render-root] .oneimg-media-item-image,
  [data-oneimg-render-root] .oneimg-unresolved-media {
    aspect-ratio: 4 / 3;
    height: auto;
    min-height: 160px;
    width: 100%;
  }

  [data-oneimg-render-root] .oneimg-media-item-image {
    display: block;
    object-fit: cover;
  }

  [data-oneimg-render-root] .oneimg-media-item figcaption {
    color: var(--oneimg-foreground);
    font-size: 14px;
    line-height: 1.5;
    padding: 12px 14px 14px;
  }

  [data-oneimg-render-root] .oneimg-unresolved-media {
    align-content: center;
    background: repeating-linear-gradient(135deg, var(--oneimg-muted), var(--oneimg-muted) 12px, var(--oneimg-background) 12px, var(--oneimg-background) 24px);
    color: var(--oneimg-foreground);
    display: grid;
    gap: 4px;
    justify-items: center;
    padding: 24px;
    text-align: center;
  }

  [data-oneimg-render-root] .oneimg-unresolved-media small {
    color: var(--oneimg-ink-soft);
    font-size: 11px;
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  [data-oneimg-render-root] .oneimg-media-group .oneimg-media-item[data-layout-role="hero"],
  [data-oneimg-render-root] .oneimg-media-group .oneimg-media-item[data-layout-role="balanced-wide"],
  [data-oneimg-render-root] .oneimg-media-group .oneimg-media-item[data-layout-role="margin-primary"] {
    grid-column: 1 / -1;
  }

  [data-oneimg-render-root] .oneimg-media-group .oneimg-media-item[data-layout-role="hero"] :where(.oneimg-media-item-image, .oneimg-unresolved-media),
  [data-oneimg-render-root] .oneimg-media-group .oneimg-media-item[data-layout-role="balanced-wide"] :where(.oneimg-media-item-image, .oneimg-unresolved-media),
  [data-oneimg-render-root] .oneimg-media-group .oneimg-media-item[data-layout-role="margin-primary"] :where(.oneimg-media-item-image, .oneimg-unresolved-media) {
    aspect-ratio: 16 / 9;
  }

  [data-oneimg-render-root] .oneimg-summary {
    background: var(--oneimg-foreground);
    color: var(--oneimg-background);
    display: grid;
    gap: calc(var(--oneimg-section-gap) + 8px);
    grid-template-columns: 1fr auto;
    min-height: 172px;
    padding: var(--oneimg-summary-pad-top) var(--oneimg-section-pad-x) var(--oneimg-summary-pad-bottom);
  }

  [data-oneimg-render-root] .oneimg-summary-copy {
    max-width: 330px;
  }

  [data-oneimg-render-root] .oneimg-summary-body {
    color: var(--oneimg-surface);
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
    padding: var(--oneimg-rich-text-pad-top) var(--oneimg-section-pad-x) var(--oneimg-rich-text-pad-bottom);
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

  [data-oneimg-render-root] .oneimg-rich-text pre {
    background: var(--oneimg-foreground);
    border-radius: 12px;
    color: var(--oneimg-background);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    line-height: 1.6;
    margin-top: 22px;
    overflow-x: auto;
    padding: 16px 18px;
    white-space: pre-wrap;
  }

  [data-oneimg-render-root] .oneimg-rich-text pre code {
    background: transparent;
    color: inherit;
    display: block;
    padding: 0;
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
    padding: var(--oneimg-rich-text-pad-top) var(--oneimg-section-pad-x) var(--oneimg-rich-text-pad-bottom);
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

  [data-oneimg-render-root] .oneimg-checklist-section,
  [data-oneimg-render-root] .oneimg-data-table-section {
    background: var(--oneimg-surface);
    border-bottom: 1px solid color-mix(in srgb, var(--oneimg-foreground) 8%, transparent);
    padding: var(--oneimg-structured-pad-top) var(--oneimg-section-pad-x) var(--oneimg-structured-pad-bottom);
  }

  [data-oneimg-render-root] .oneimg-checklist {
    display: grid;
    gap: 12px;
    margin: 0 auto;
    max-width: 544px;
    padding: 0;
  }

  [data-oneimg-render-root] .oneimg-checklist li {
    align-items: flex-start;
    color: var(--oneimg-foreground);
    display: flex;
    font-size: 17px;
    gap: 12px;
    line-height: 1.65;
  }

  [data-oneimg-render-root] .oneimg-checklist input {
    accent-color: var(--oneimg-accent);
    flex: 0 0 auto;
    height: 18px;
    margin-top: 5px;
    width: 18px;
  }

  [data-oneimg-render-root] .oneimg-data-table {
    border-collapse: collapse;
    margin: 0 auto;
    max-width: 544px;
    width: 100%;
  }

  [data-oneimg-render-root] .oneimg-data-table :where(th, td) {
    border: 1px solid color-mix(in srgb, var(--oneimg-foreground) 14%, transparent);
    color: var(--oneimg-foreground);
    font-size: 15px;
    line-height: 1.5;
    padding: 11px 13px;
    text-align: left;
    vertical-align: top;
  }

  [data-oneimg-render-root] .oneimg-data-table th {
    background: var(--oneimg-accent-soft);
    font-weight: 700;
  }

  [data-oneimg-render-root] .oneimg-data-table td {
    color: var(--oneimg-ink-soft);
  }

  [data-oneimg-render-root] .oneimg-unknown-block {
    background: var(--oneimg-muted);
    padding: var(--oneimg-unknown-pad-top) var(--oneimg-section-pad-x) var(--oneimg-unknown-pad-bottom);
  }

  [data-oneimg-render-root] .oneimg-unknown-block h2 {
    font-size: 24px;
    margin-top: 8px;
  }

  [data-oneimg-render-root] .oneimg-unknown-block p:last-child {
    color: var(--oneimg-ink-soft);
    margin-top: 8px;
  }

  [data-oneimg-render-root] .oneimg-unknown-fallback {
    background: var(--oneimg-surface);
    border-radius: 12px;
    color: var(--oneimg-foreground);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 16px;
    max-height: 160px;
    overflow: hidden;
    overflow-wrap: anywhere;
    padding: 12px 14px;
    white-space: pre-wrap;
  }

  /*
   * Template Family and Page Format are renderer inputs. These variants keep
   * the semantic section order and every Block visible while changing only
   * the bounded composition around the same content.
   */
  [data-oneimg-render-root][data-template-family="section-cards"] .oneimg-section:not(.oneimg-hero) {
    border-radius: 24px;
    box-shadow: 0 12px 30px color-mix(in srgb, var(--oneimg-foreground) 10%, transparent);
    margin: 16px 24px 0;
    overflow: hidden;
  }

  [data-oneimg-render-root][data-template-family="section-cards"] .oneimg-section:last-child {
    margin-bottom: 16px;
  }

  [data-oneimg-render-root][data-template-family="visual-editorial"] .oneimg-hero {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--oneimg-accent) 18%, var(--oneimg-surface)), var(--oneimg-background));
    min-height: 286px;
  }

  [data-oneimg-render-root][data-template-family="visual-editorial"] .oneimg-media {
    align-items: stretch;
    flex-direction: column;
  }

  [data-oneimg-render-root][data-template-family="visual-editorial"] .oneimg-media-figure {
    flex-basis: auto;
    width: min(100%, 420px);
  }

  [data-oneimg-render-root][data-template-family="visual-editorial"] .oneimg-media-image {
    height: auto;
    width: 100%;
  }

  [data-oneimg-render-root][data-template-family="summary-brief"] .oneimg-grid {
    grid-template-columns: 1fr;
  }

  [data-oneimg-render-root][data-template-family="summary-brief"] .oneimg-summary {
    background: var(--oneimg-accent);
    color: var(--oneimg-surface);
  }

  [data-oneimg-render-root][data-template-family="summary-brief"] .oneimg-summary-body {
    color: color-mix(in srgb, var(--oneimg-surface) 74%, transparent);
  }

  [data-oneimg-render-root][data-page-format="square"] .oneimg-summary,
  [data-oneimg-render-root][data-page-format="portrait-4-5"] .oneimg-summary,
  [data-oneimg-render-root][data-page-format="a4-portrait"] .oneimg-summary {
    grid-template-columns: 1fr;
  }

  [data-oneimg-render-root][data-page-format="square"] .oneimg-facts,
  [data-oneimg-render-root][data-page-format="portrait-4-5"] .oneimg-facts,
  [data-oneimg-render-root][data-page-format="a4-portrait"] .oneimg-facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  [data-oneimg-render-root][data-page-format-kind="bounded"] {
    min-height: var(--oneimg-page-height);
    overflow: visible;
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

// The social adapter has its own revision; existing persisted foundation@3
// pages keep their certified CSS byte-for-byte.
export const socialCollageStylePack = {
  id: 'oneimg-social-collage@1',
  cssText: `${canonicalStylePack.cssText}
  @layer oneimg-foundation {
    [data-oneimg-render-root][data-template-family="social-collage"] {
      display: flex;
      flex-direction: column;
      gap: 18px;
      height: var(--oneimg-page-height);
      padding: 28px;
      overflow: visible;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] > .oneimg-section {
      flex: 0 0 auto;
      padding: 0;
      background: transparent;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] > .oneimg-media-group-section {
      display: flex;
      flex: 1 1 0;
      flex-direction: column;
      min-height: 100px;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-group {
      flex: 1 1 0;
      grid-auto-rows: minmax(0, 1fr);
      min-height: 60px;
      gap: 12px;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-item {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: visible;
      box-shadow: none;
      border-radius: 12px;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-group .oneimg-media-item :where(.oneimg-media-item-image, .oneimg-unresolved-media) {
      aspect-ratio: auto;
      flex: 1 1 0;
      min-height: 24px;
      height: 0;
      border-radius: 12px;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-frame {
      flex: 1 1 0;
      min-height: 24px;
      overflow: hidden;
      border-radius: 12px;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-group .oneimg-media-frame :where(.oneimg-media-item-image, .oneimg-unresolved-media) {
      height: 100%;
      min-height: 0;
      border-radius: 0;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-item figcaption {
      flex: 0 0 auto;
      padding: 8px 10px;
    }
    [data-oneimg-render-root][data-template-family="social-collage"] .oneimg-media-group-header {
      flex: 0 0 auto;
      margin-bottom: 12px;
    }
  }`,
} as const

export function getCanonicalStylePack(id: string) {
  if (id === canonicalStylePack.id) {
    return canonicalStylePack
  }
  if (id === socialCollageStylePack.id) {
    return socialCollageStylePack
  }
  throw new Error(`Unsupported Style Pack: ${id}`)
}
