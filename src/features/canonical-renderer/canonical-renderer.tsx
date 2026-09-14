import type { CSSProperties, ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { memo, useLayoutEffect, useRef } from 'react'
import type { CanonicalMediaItem, CanonicalRenderSnapshot, CanonicalSection } from './model'
import type { ResolvedResourceSet } from './resource-resolver'
import { publishCanonicalPaginationDiagnostics } from './render-ready'
import { canonicalStylePack, getCanonicalStylePack } from './style-pack'
import type { RichTextNode } from '@/features/document-core'
import { resolveSmartCollageLayout } from '@/features/smart-collage'

type CanonicalCssProperties = CSSProperties & Record<`--oneimg-${string}`, string>

export interface CanonicalRendererProps {
  readonly onRichTextBlur?: (blockId: string | undefined, text: string) => void
  readonly onRichTextInput?: (blockId: string | undefined, text: string) => void
  readonly onRichTextPaste?: (blockId: string | undefined, payload: { readonly html: string; readonly text: string }) => boolean
  readonly snapshot: CanonicalRenderSnapshot
  readonly resources: ResolvedResourceSet
  readonly mode: 'edit' | 'preview' | 'export'
}

type RichTextEditingHandlers = Pick<CanonicalRendererProps, 'onRichTextBlur' | 'onRichTextInput' | 'onRichTextPaste'>

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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '\'': '&#39;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character]!)
}

function renderMarkedTextHtml(node: RichTextNode): string {
  let content = escapeHtml(node.text ?? '')
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        content = `<strong>${content}</strong>`
        break
      case 'code':
        content = `<code>${content}</code>`
        break
      case 'italic':
        content = `<em>${content}</em>`
        break
      case 'link':
        content = `<a href="${escapeHtml(safeHref(mark.href))}" rel="noreferrer" target="_blank">${content}</a>`
        break
      case 'underline':
        content = `<u>${content}</u>`
        break
    }
  }
  return content
}

function renderRichTextNodeHtml(node: RichTextNode, path: string): string {
  const children = node.children?.map((child, index) => renderRichTextNodeHtml(child, `${path}.${index}`)).join('') ?? ''
  const inline = node.children === undefined ? renderMarkedTextHtml(node) : children
  switch (node.type) {
    case 'blockquote':
      return `<blockquote data-keep-together="true" data-node-type="${node.type}" data-slice-id="keep-together:${path}">${children}</blockquote>`
    case 'bullet-list':
      return `<ul data-keep-together="true" data-node-type="${node.type}" data-slice-id="keep-together:${path}">${children}</ul>`
    case 'code-block':
      return `<pre data-keep-together="true" data-node-type="${node.type}" data-slice-id="keep-together:${path}"><code>${inline}</code></pre>`
    case 'heading':
      if (node.level === 1) {
        return `<h1 data-node-type="${node.type}" data-slice-id="heading:${path}">${inline}</h1>`
      }
      if (node.level === 2) {
        return `<h2 data-node-type="${node.type}" data-slice-id="heading:${path}">${inline}</h2>`
      }
      return `<h3 data-node-type="${node.type}" data-slice-id="heading:${path}">${inline}</h3>`
    case 'list-item':
      return `<li data-node-type="${node.type}">${children}</li>`
    case 'ordered-list':
      return `<ol data-keep-together="true" data-node-type="${node.type}" data-slice-id="keep-together:${path}">${children}</ol>`
    case 'paragraph':
      return `<p data-node-type="${node.type}">${inline}</p>`
    case 'text':
      return inline
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
    onPaste: editable
      ? (event: ClipboardEvent<HTMLElement>) => {
          if (handlers.onRichTextPaste === undefined) {
            return
          }
          const handled = handlers.onRichTextPaste(blockId, {
            html: event.clipboardData.getData('text/html'),
            text: event.clipboardData.getData('text/plain'),
          })
          if (handled) {
            event.preventDefault()
          }
        }
      : undefined,
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
    <section className="oneimg-section oneimg-rich-text-section" data-block-id={section.id} data-block-kind="rich-text" data-slice-boundary="section" key={section.id}>
      <div
        className="oneimg-rich-text"
        dangerouslySetInnerHTML={{ __html: section.content.children.map((node, index) => renderRichTextNodeHtml(node, `${section.id}.${index}`)).join('') }}
        {...editableProps(mode, section.id, handlers)}
      />
    </section>
  )
}

function renderChecklistSection(section: Extract<CanonicalSection, { kind: 'checklist' }>) {
  return (
    <section className="oneimg-section oneimg-checklist-section" data-block-id={section.id} data-block-kind="checklist" data-slice-boundary="section" key={section.id}>
      <ul className="oneimg-checklist" data-keep-together="true" data-slice-id={`${section.id}:items`}>
        {section.items.map(item => (
          <li data-item-id={item.id} key={item.id}>
            <input aria-label={item.text} checked={item.checked} disabled readOnly type="checkbox" />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function renderDataTableSection(section: Extract<CanonicalSection, { kind: 'data-table' }>) {
  return (
    <section className="oneimg-section oneimg-data-table-section" data-block-id={section.id} data-block-kind="data-table" data-slice-boundary="section" key={section.id}>
      <table className="oneimg-data-table" data-keep-together="true" data-slice-id={`${section.id}:table`}>
        <thead>
          <tr>
            {section.columns.map(column => <th key={column.id} scope="col">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {section.rows.map(row => (
            <tr data-item-id={row.id} key={row.id}>
              {row.cells.map((cell, cellIndex) => <td key={`${row.id}:${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function mediaItemStyle(item: CanonicalMediaItem): CSSProperties {
  return {
    objectFit: item.fit,
    objectPosition: `${item.focalPoint.x * 100}% ${item.focalPoint.y * 100}%`,
    transform: `rotate(${item.rotation}deg) scale(${item.zoom})`,
    transformOrigin: `${item.focalPoint.x * 100}% ${item.focalPoint.y * 100}%`,
  }
}

function renderMediaItemImage(item: CanonicalMediaItem, resources: ResolvedResourceSet) {
  return (item.status === 'ready' && item.resourceId !== undefined ? (
              // Canonical export serializes this native image and the same normalized Render Source.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={item.alternativeText ?? ''}
                className="oneimg-media-item-image"
                data-focal-point={`${item.focalPoint.x},${item.focalPoint.y}`}
                data-resource-id={item.resourceId}
                height={240}
                src={resources.get(item.resourceId).objectUrl}
                style={mediaItemStyle(item)}
                width={320}
              />
  ) : (
              <div
                aria-label={`资源 ${item.assetId} 尚未解析`}
                className="oneimg-unresolved-media"
                data-unresolved-asset="true"
                role="img"
              >
                <span>图片待恢复</span>
                <small>{item.assetId}</small>
              </div>
  )
  )
}

function renderMediaGroupSection(
  section: Extract<CanonicalSection, { kind: 'media-group' }>,
  resources: ResolvedResourceSet,
  clipMedia = false,
) {
  const layout = resolveSmartCollageLayout(section.items, section.arrangement)
  const itemRoles = new Map(layout.items.map(item => [item.itemId, item.role]))
  return (
    <section className="oneimg-section oneimg-media-group-section" data-block-id={section.id} data-block-kind="media-group" data-slice-boundary="section" key={section.id}>
      {section.caption && (
        <div className="oneimg-media-group-header">
          <p className="oneimg-media-group-caption">{section.caption}</p>
        </div>
      )}
      <div
        className="oneimg-media-group"
        data-arrangement={section.arrangement}
        data-auto-reason={section.arrangement === 'auto' ? layout.reason : undefined}
        data-effective-arrangement={layout.resolvedArrangement}
        data-layout-columns={layout.columns}
        data-keep-together="true"
        data-slice-id={`${section.id}:items`}
      >
        {section.items.map(item => (
          <figure
            className="oneimg-media-item"
            data-asset-id={item.assetId}
            data-featured={item.featured ? 'true' : undefined}
            data-layout-role={itemRoles.get(item.id)}
            data-media-item-id={item.id}
            data-media-status={item.status}
            data-resource-id={item.resourceId}
            data-testid={item.id}
            key={item.id}
          >
            {clipMedia ? <div className="oneimg-media-frame">{renderMediaItemImage(item, resources)}</div> : renderMediaItemImage(item, resources)}
            {item.caption && <figcaption data-media-caption="true">{item.caption}</figcaption>}
          </figure>
        ))}
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
  clipMedia = false,
) {
  switch (section.kind) {
    case 'hero':
      return (
        <section className="oneimg-section oneimg-hero" data-block-id={section.id} data-slice-boundary="section" key={section.id}>
          <div className="oneimg-hero-copy">
            <p className="oneimg-eyebrow">{section.eyebrow}</p>
            <h1 className="oneimg-title" data-node-type="heading" data-slice-id={`${section.id}:title`}>{section.title}</h1>
            <p className="oneimg-lede">{section.body}</p>
          </div>
        </section>
      )
    case 'feature-grid':
      return (
        <section className="oneimg-section oneimg-grid-section" data-block-id={section.id} data-slice-boundary="section" key={section.id}>
          <p className="oneimg-eyebrow">{section.label}</p>
          <div className="oneimg-grid" data-keep-together="true" data-layout="grid" data-slice-id={`${section.id}:grid`} data-surface="rounded">
            {section.items.map(item => (
              <article className="oneimg-feature" data-block-id={item.id} key={item.id}>
                <h2 className="oneimg-feature-title" data-node-type="heading" data-slice-id={`${item.id}:title`}>{item.title}</h2>
                <p className="oneimg-feature-body">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      )
    case 'media': {
      const image = resources.get(section.image.resourceId)
      return (
        <section className="oneimg-section oneimg-media" data-block-id={section.id} data-layout="flex" data-slice-boundary="section" key={section.id}>
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
            <h2 className="oneimg-media-title" data-node-type="heading" data-slice-id={`${section.id}:title`}>{section.title}</h2>
            <p className="oneimg-media-body">{section.body}</p>
          </div>
        </section>
      )
    }
    case 'rich-text':
      return renderRichTextSection(section, mode, handlers)
    case 'checklist':
      return renderChecklistSection(section)
    case 'data-table':
      return renderDataTableSection(section)
    case 'media-group':
      return renderMediaGroupSection(section, resources, clipMedia)
    case 'summary':
      return (
        <section className="oneimg-section oneimg-summary" data-block-id={section.id} data-slice-boundary="section" key={section.id}>
          <div className="oneimg-summary-copy">
            <h2 className="oneimg-summary-title" data-node-type="heading" data-slice-id={`${section.id}:title`}>{section.title}</h2>
            <p className="oneimg-summary-body">{section.body}</p>
          </div>
          <ul className="oneimg-facts">
            {section.facts.map(fact => <li className="oneimg-fact" key={fact}>{fact}</li>)}
          </ul>
        </section>
      )
    case 'unknown-block':
      return (
        <section className="oneimg-section oneimg-unknown-block" data-block-id={section.id} data-block-kind="unknown" data-slice-boundary="section" key={section.id}>
          <p className="oneimg-eyebrow">保留内容</p>
          <h2 data-node-type="heading" data-slice-id={`${section.id}:fallback-heading`}>暂不支持的内容</h2>
          <p>类型 {section.originalKind}{section.originalVersion ? ` · ${section.originalVersion}` : ''} 将保留在文档中。</p>
          <pre className="oneimg-unknown-fallback">{section.fallbackText}</pre>
        </section>
      )
  }
}

export function getCanonicalOwnedCss(resources: ResolvedResourceSet, stylePackId: string = canonicalStylePack.id) {
  return `${resources.fontFaceCss}\n${getCanonicalStylePack(stylePackId).cssText}`
}

const CanonicalRendererImpl = ({
  onRichTextBlur,
  onRichTextInput,
  onRichTextPaste,
  snapshot,
  resources,
  mode,
}: CanonicalRendererProps) => {
  const rootRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (root === null) {
      return
    }

    delete root.dataset.paginationDiagnostics
    delete root.dataset.paginationSnapshotId
    root.dataset.paginationState = 'pending'
    const publish = () => publishCanonicalPaginationDiagnostics(root, snapshot)
    publish()
    const resizeObserver = new ResizeObserver(publish)
    resizeObserver.observe(root)
    for (const element of Array.from(root.querySelectorAll<HTMLElement>('[data-block-id], [data-resource-id]'))) {
      resizeObserver.observe(element)
    }
    return () => resizeObserver.disconnect()
  }, [mode, resources.fingerprint, snapshot])

  getCanonicalStylePack(snapshot.stylePackId)

  const style: CanonicalCssProperties = {
    '--oneimg-accent': snapshot.theme.accent,
    '--oneimg-background': snapshot.theme.background,
    '--oneimg-foreground': snapshot.theme.foreground,
    '--oneimg-font-family': resources.fontFamily,
    '--oneimg-muted': snapshot.theme.muted,
    '--oneimg-page-height': snapshot.presentation.pageFormat.height === undefined
      ? 'auto'
      : `${snapshot.presentation.pageFormat.height}px`,
    '--oneimg-reference-width': `${snapshot.referenceViewport.width}px`,
    '--oneimg-surface': snapshot.theme.surface,
  }

  return (
    <article
      data-document-id={snapshot.document.id}
      data-density={snapshot.presentation.density}
      data-oneimg-render-root=""
      data-local-capability={snapshot.localCapability}
      data-page-format={snapshot.presentation.pageFormat.preset}
      data-page-format-kind={snapshot.presentation.pageFormat.kind}
      data-render-mode={mode}
      data-render-ready="false"
      data-pagination-state="pending"
      data-renderer-revision={snapshot.rendererRevision}
      data-resource-fingerprint={resources.fingerprint}
      data-sensitive-document={snapshot.sensitive ? 'true' : 'false'}
      data-snapshot-id={snapshot.snapshotId}
      data-style-pack={snapshot.stylePackId}
      data-template-family={snapshot.presentation.templateId}
      data-template-version={snapshot.presentation.templateVersion}
      data-theme-id={snapshot.presentation.themeId}
      data-theme-version={snapshot.presentation.themeVersion}
      dir={snapshot.direction}
      lang={snapshot.locale}
      style={style}
      ref={rootRef}
    >
      {snapshot.document.sections.map(section => renderSection(
        section,
        resources,
        mode,
        { onRichTextBlur, onRichTextInput, onRichTextPaste },
        snapshot.presentation.templateId === 'social-collage',
      ))}
      {snapshot.document.sections.length === 0 && renderEmptyEditor(mode, { onRichTextBlur, onRichTextInput, onRichTextPaste })}
    </article>
  )
}

CanonicalRendererImpl.displayName = 'CanonicalRenderer'
export const CanonicalRenderer = memo(CanonicalRendererImpl)

export function CanonicalRenderSurface(props: CanonicalRendererProps) {
  return (
    <>
      <style data-oneimg-owned-style={props.snapshot.stylePackId}>{getCanonicalOwnedCss(props.resources, props.snapshot.stylePackId)}</style>
      <CanonicalRenderer {...props} />
    </>
  )
}
