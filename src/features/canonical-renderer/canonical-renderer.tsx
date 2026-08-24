import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { CanonicalRenderSnapshot, CanonicalSection } from './model'
import type { ResolvedResourceSet } from './resource-resolver'
import { canonicalStylePack } from './style-pack'
import type { RichTextNode } from '@/features/document-core'

type CanonicalCssProperties = CSSProperties & Record<`--oneimg-${string}`, string>

export interface CanonicalRendererProps {
  readonly onRichTextBlur?: (blockId: string | undefined, text: string) => void
  readonly onRichTextInput?: (blockId: string | undefined, text: string) => void
  readonly snapshot: CanonicalRenderSnapshot
  readonly resources: ResolvedResourceSet
  readonly mode: 'edit' | 'preview' | 'export'
}

type RichTextEditingHandlers = Pick<CanonicalRendererProps, 'onRichTextBlur' | 'onRichTextInput'>

function readEditableText(event: FormEvent<HTMLElement>) {
  return event.currentTarget.innerText.replaceAll('\r\n', '\n')
}

function handleEditableKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Escape') {
    return
  }
  event.preventDefault()
  event.currentTarget.blur()
}

function safeHref(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href) ? href : '#'
}

function renderMarkedText(node: RichTextNode, key: string): ReactNode {
  let content: ReactNode = node.text ?? ''
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        content = <strong key={`${key}-bold`}>{content}</strong>
        break
      case 'code':
        content = <code key={`${key}-code`}>{content}</code>
        break
      case 'italic':
        content = <em key={`${key}-italic`}>{content}</em>
        break
      case 'link':
        content = <a href={safeHref(mark.href)} key={`${key}-link`} rel="noreferrer" target="_blank">{content}</a>
        break
      case 'underline':
        content = <u key={`${key}-underline`}>{content}</u>
        break
    }
  }
  return content
}

function renderRichTextNode(node: RichTextNode, key: string): ReactNode {
  const children = node.children?.map((child, index) => renderRichTextNode(child, `${key}-${index}`))
  const inline = node.children === undefined ? renderMarkedText(node, key) : children
  switch (node.type) {
    case 'blockquote':
      return <blockquote data-node-type={node.type} key={key}>{children}</blockquote>
    case 'bullet-list':
      return <ul data-node-type={node.type} key={key}>{children}</ul>
    case 'heading':
      if (node.level === 1) {
        return <h1 data-node-type={node.type} key={key}>{inline}</h1>
      }
      if (node.level === 2) {
        return <h2 data-node-type={node.type} key={key}>{inline}</h2>
      }
      return <h3 data-node-type={node.type} key={key}>{inline}</h3>
    case 'list-item':
      return <li data-node-type={node.type} key={key}>{children}</li>
    case 'ordered-list':
      return <ol data-node-type={node.type} key={key}>{children}</ol>
    case 'paragraph':
      return <p data-node-type={node.type} key={key}>{inline}</p>
  }
}

function editableProps(
  mode: CanonicalRendererProps['mode'],
  blockId: string | undefined,
  handlers: RichTextEditingHandlers,
) {
  const editable = mode === 'edit'
  const props = {
    contentEditable: editable,
    onBlur: editable
      ? (event: FormEvent<HTMLElement>) => handlers.onRichTextBlur?.(blockId, readEditableText(event))
      : undefined,
    onInput: editable
      ? (event: FormEvent<HTMLElement>) => handlers.onRichTextInput?.(blockId, readEditableText(event))
      : undefined,
    onKeyDown: editable ? handleEditableKeyDown : undefined,
    suppressContentEditableWarning: true,
  } as const
  if (!editable) {
    return props
  }
  return {
    ...props,
    'aria-label': '正文编辑区',
    'aria-multiline': true,
    'role': 'textbox',
  } as const
}

function renderRichTextSection(
  section: Extract<CanonicalSection, { kind: 'rich-text' }>,
  mode: CanonicalRendererProps['mode'],
  handlers: RichTextEditingHandlers,
) {
  return (
    <section className="oneimg-section oneimg-rich-text-section" data-block-id={section.id} key={section.id}>
      <div className="oneimg-rich-text" {...editableProps(mode, section.id, handlers)}>
        {section.content.children.map((node, index) => renderRichTextNode(node, `${section.id}-${index}`))}
      </div>
    </section>
  )
}

function renderEmptyEditor(
  mode: CanonicalRendererProps['mode'],
  handlers: RichTextEditingHandlers,
) {
  if (mode !== 'edit') {
    return null
  }
  return (
    <div className="oneimg-empty-editor" data-studio-empty-editor="true" {...editableProps(mode, undefined, handlers)}>
      <p />
    </div>
  )
}

function renderSection(
  section: CanonicalSection,
  resources: ResolvedResourceSet,
  mode: CanonicalRendererProps['mode'],
  handlers: RichTextEditingHandlers,
) {
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
    case 'rich-text':
      return renderRichTextSection(section, mode, handlers)
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
    case 'unknown-block':
      return (
        <section className="oneimg-section oneimg-unknown-block" data-block-id={section.id} key={section.id}>
          <p className="oneimg-eyebrow">保留内容</p>
          <h2>暂不支持的内容</h2>
          <p>类型 {section.originalKind}{section.originalVersion ? ` · ${section.originalVersion}` : ''} 将保留在文档中。</p>
        </section>
      )
  }
}

export function getCanonicalOwnedCss(resources: ResolvedResourceSet) {
  return `${resources.fontFaceCss}\n${canonicalStylePack.cssText}`
}

export function CanonicalRenderer({
  onRichTextBlur,
  onRichTextInput,
  snapshot,
  resources,
  mode,
}: CanonicalRendererProps) {
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
      {snapshot.document.sections.map(section => renderSection(
        section,
        resources,
        mode,
        { onRichTextBlur, onRichTextInput },
      ))}
      {snapshot.document.sections.length === 0 && renderEmptyEditor(mode, { onRichTextBlur, onRichTextInput })}
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
