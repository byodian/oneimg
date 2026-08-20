import type { CSSProperties } from 'react'
import type { CanonicalRenderSnapshot, CanonicalSection } from './model'
import type { ResolvedResourceSet } from './resource-resolver'
import { canonicalStylePack } from './style-pack'

type CanonicalCssProperties = CSSProperties & Record<`--oneimg-${string}`, string>

export interface CanonicalRendererProps {
  readonly snapshot: CanonicalRenderSnapshot
  readonly resources: ResolvedResourceSet
  readonly mode: 'preview' | 'export'
}

function renderSection(section: CanonicalSection, resources: ResolvedResourceSet) {
  switch (section.kind) {
    case 'hero':
      return (
        <section className="oneimg-section oneimg-hero" data-block-id={section.id} key={section.id}>
          <div className="oneimg-hero-copy">
            <p className="oneimg-eyebrow">{section.eyebrow}</p>
            <h1 className="oneimg-title">{section.title}</h1>
            <p className="oneimg-lede">{section.body}</p>
          </div>
        </section>
      )
    case 'feature-grid':
      return (
        <section className="oneimg-section oneimg-grid-section" data-block-id={section.id} key={section.id}>
          <p className="oneimg-eyebrow">{section.label}</p>
          <div className="oneimg-grid" data-layout="grid" data-surface="rounded">
            {section.items.map(item => (
              <article className="oneimg-feature" data-block-id={item.id} key={item.id}>
                <h2 className="oneimg-feature-title">{item.title}</h2>
                <p className="oneimg-feature-body">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      )
    case 'media': {
      const image = resources.get(section.image.resourceId)
      return (
        <section className="oneimg-section oneimg-media" data-block-id={section.id} data-layout="flex" key={section.id}>
          <figure className="oneimg-media-figure">
            {/* Canonical export serializes this native image element and its Blob-backed source. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={section.image.alt}
              className="oneimg-media-image"
              data-resource-id={section.image.resourceId}
              height={170}
              src={image.objectUrl}
              width={226}
            />
          </figure>
          <div className="oneimg-media-copy">
            <p className="oneimg-eyebrow">{section.label}</p>
            <h2 className="oneimg-media-title">{section.title}</h2>
            <p className="oneimg-media-body">{section.body}</p>
          </div>
        </section>
      )
    }
    case 'summary':
      return (
        <section className="oneimg-section oneimg-summary" data-block-id={section.id} key={section.id}>
          <div className="oneimg-summary-copy">
            <h2 className="oneimg-summary-title">{section.title}</h2>
            <p className="oneimg-summary-body">{section.body}</p>
          </div>
          <ul className="oneimg-facts">
            {section.facts.map(fact => <li className="oneimg-fact" key={fact}>{fact}</li>)}
          </ul>
        </section>
      )
  }
}

export function getCanonicalOwnedCss(resources: ResolvedResourceSet) {
  return `${resources.fontFaceCss}\n${canonicalStylePack.cssText}`
}

export function CanonicalRenderer({ snapshot, resources, mode }: CanonicalRendererProps) {
  if (snapshot.stylePackId !== canonicalStylePack.id) {
    throw new Error(`Unsupported Style Pack: ${snapshot.stylePackId}`)
  }

  const style: CanonicalCssProperties = {
    '--oneimg-accent': snapshot.theme.accent,
    '--oneimg-background': snapshot.theme.background,
    '--oneimg-foreground': snapshot.theme.foreground,
    '--oneimg-font-family': resources.fontFamily,
    '--oneimg-muted': snapshot.theme.muted,
    '--oneimg-reference-width': `${snapshot.referenceViewport.width}px`,
    '--oneimg-surface': snapshot.theme.surface,
  }

  return (
    <article
      data-document-id={snapshot.document.id}
      data-oneimg-render-root=""
      data-render-mode={mode}
      data-render-ready="false"
      data-renderer-revision={snapshot.rendererRevision}
      data-resource-fingerprint={resources.fingerprint}
      data-snapshot-id={snapshot.snapshotId}
      data-style-pack={snapshot.stylePackId}
      dir={snapshot.direction}
      lang={snapshot.locale}
      style={style}
    >
      {snapshot.document.sections.map(section => renderSection(section, resources))}
    </article>
  )
}

export function CanonicalRenderSurface(props: CanonicalRendererProps) {
  return (
    <>
      <style data-oneimg-owned-style={props.snapshot.stylePackId}>{getCanonicalOwnedCss(props.resources)}</style>
      <CanonicalRenderer {...props} />
    </>
  )
}
