import {
  type Block,
  type DataTableColumn,
  type DataTableRow,
  type RichTextMark,
  type RichTextNode,
  createChecklistBlock,
  createDataTableBlock,
  createRichTextBlock,
} from '@/features/document-core'

export interface SmartPastePayload {
  readonly html?: string
  readonly text?: string
}

export type SmartPasteSource = 'html' | 'markdown' | 'plain-text'
export type SmartPasteBlockKind = 'checklist' | 'data-table' | 'rich-text'

export interface SmartPasteOptions {
  readonly createBlockId?: (kind: SmartPasteBlockKind, index: number) => string
}

export interface SmartPasteResult {
  readonly blocks: readonly Block[]
  readonly source: SmartPasteSource
}

interface RichSegment {
  readonly kind: 'rich'
  readonly node: RichTextNode
}

interface ChecklistSegment {
  readonly items: readonly ChecklistItemDraft[]
  readonly kind: 'checklist'
}

interface DataTableSegment {
  readonly caption?: string
  readonly columns: readonly string[]
  readonly kind: 'data-table'
  readonly rows: readonly (readonly string[])[]
}

interface ChecklistItemDraft {
  readonly checked: boolean
  readonly text: string
}

type Segment = ChecklistSegment | DataTableSegment | RichSegment

const IGNORED_HTML_TAGS = new Set([
  'base',
  'canvas',
  'embed',
  'head',
  'iframe',
  'link',
  'meta',
  'noscript',
  'object',
  'script',
  'style',
  'svg',
  'template',
])

const HTML_BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
])

const HTML_WRAPPER_TAGS = new Set([
  'address',
  'article',
  'aside',
  'details',
  'div',
  'dl',
  'dt',
  'dd',
  'figure',
  'figcaption',
  'footer',
  'form',
  'header',
  'main',
  'nav',
  'section',
])

export function parseSmartPaste(
  payload: SmartPastePayload,
  options: SmartPasteOptions = {},
): SmartPasteResult {
  const text = normalizeLineEndings(payload.text ?? '')
  const html = payload.html?.trim()

  if (html !== undefined && html.length > 0) {
    const htmlSegments = parseHtmlSegments(html)
    if (hasMeaningfulSegments(htmlSegments)) {
      return {
        blocks: buildBlocks(htmlSegments, options),
        source: 'html',
      }
    }
  }

  if (text.trim().length === 0) {
    return { blocks: [], source: html === undefined ? 'plain-text' : 'html' }
  }

  const source = looksLikeMarkdown(text) ? 'markdown' : 'plain-text'
  return {
    blocks: buildBlocks(
      source === 'markdown' ? parseMarkdownSegments(text) : parsePlainTextSegments(text),
      options,
    ),
    source,
  }
}

function buildBlocks(segments: readonly Segment[], options: SmartPasteOptions): readonly Block[] {
  const blocks: Block[] = []
  const richNodes: RichTextNode[] = []
  const createBlockId = options.createBlockId ?? defaultBlockId

  const flushRichText = () => {
    if (richNodes.length === 0) {
      return
    }
    const index = blocks.length
    blocks.push(createRichTextBlock(
      createBlockId('rich-text', index),
      { children: richNodes.splice(0), type: 'doc' },
    ))
  }

  for (const segment of segments) {
    if (segment.kind === 'rich') {
      richNodes.push(segment.node)
      continue
    }

    flushRichText()
    const index = blocks.length
    const blockId = createBlockId(segment.kind, index)
    if (segment.kind === 'checklist') {
      blocks.push(createChecklistBlock(
        blockId,
        segment.items.map((item, itemIndex) => ({
          checked: item.checked,
          id: `${blockId}:item-${itemIndex + 1}`,
          text: item.text,
        })),
      ))
      continue
    }

    const columns: readonly DataTableColumn[] = segment.columns.map((label, columnIndex) => ({
      id: `${blockId}:column-${columnIndex + 1}`,
      label,
    }))
    const rows: readonly DataTableRow[] = segment.rows.map((cells, rowIndex) => ({
      cells: [...cells],
      id: `${blockId}:row-${rowIndex + 1}`,
    }))
    blocks.push(createDataTableBlock(blockId, columns, rows))
  }
  flushRichText()
  return blocks
}

function defaultBlockId(kind: SmartPasteBlockKind, index: number) {
  return `smart-paste:${kind}:${index + 1}`
}

function parsePlainTextSegments(text: string): readonly Segment[] {
  const lines = text.split('\n')
  const segments: Segment[] = []
  let index = 0
  while (index < lines.length) {
    const table = parseTabSeparatedTable(lines, index)
    if (table !== undefined) {
      segments.push(table.segment)
      index = table.nextIndex
      continue
    }
    const line = lines[index] ?? ''
    if (line.trim().length === 0) {
      index += 1
      continue
    }
    const paragraph = createInlineBlock('paragraph', parseInlineMarkdown(line))
    if (paragraph !== undefined) {
      segments.push({ kind: 'rich', node: paragraph })
    }
    index += 1
  }
  return segments
}

function parseMarkdownSegments(text: string): readonly Segment[] {
  const lines = text.split('\n')
  const segments: Segment[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.trim().length === 0) {
      index += 1
      continue
    }

    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*.*$/)
    if (fence !== null) {
      const marker = fence[1]!
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !new RegExp(`^\\s{0,3}${escapeRegExp(marker[0])}{${marker.length},}\\s*$`).test(lines[index]!)) {
        codeLines.push(lines[index]!)
        index += 1
      }
      if (index < lines.length) {
        index += 1
      }
      if (codeLines.join('\n').trim().length > 0) {
        segments.push({
          kind: 'rich',
          node: { text: codeLines.join('\n'), type: 'code-block' },
        })
      }
      continue
    }

    const table = parseMarkdownTable(lines, index)
    if (table !== undefined) {
      segments.push(table.segment)
      index = table.nextIndex
      continue
    }

    const tabSeparatedTable = parseTabSeparatedTable(lines, index)
    if (tabSeparatedTable !== undefined) {
      segments.push(tabSeparatedTable.segment)
      index = tabSeparatedTable.nextIndex
      continue
    }

    const setextHeading = parseSetextHeading(lines, index)
    if (setextHeading !== undefined) {
      const inline = parseInlineMarkdown(setextHeading.text)
      const node = createInlineBlock('heading', inline, setextHeading.level)
      if (node !== undefined) {
        segments.push({ kind: 'rich', node })
      }
      index = setextHeading.nextIndex
      continue
    }

    const indentedCode = parseIndentedCode(lines, index)
    if (indentedCode !== undefined) {
      segments.push({
        kind: 'rich',
        node: { text: indentedCode.text, type: 'code-block' },
      })
      index = indentedCode.nextIndex
      continue
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading !== null) {
      const inline = parseInlineMarkdown(heading[2]!.trim())
      const node = createInlineBlock('heading', inline, Math.min(3, heading[1]!.length) as 1 | 2 | 3)
      if (node !== undefined) {
        segments.push({ kind: 'rich', node })
      }
      index += 1
      continue
    }

    if (/^\s{0,3}>/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s{0,3}>/.test(lines[index]!)) {
        quoteLines.push(lines[index]!.replace(/^\s{0,3}>\s?/, ''))
        index += 1
      }
      const quoteChildren = parseMarkdownSegments(quoteLines.join('\n'))
        .flatMap(segment => segmentToRichNodes(segment))
      if (quoteChildren.length > 0) {
        segments.push({
          kind: 'rich',
          node: { children: quoteChildren, type: 'blockquote' },
        })
      }
      continue
    }

    const checklist = parseMarkdownChecklist(lines, index)
    if (checklist !== undefined) {
      segments.push(checklist.segment)
      index = checklist.nextIndex
      continue
    }

    const list = parseMarkdownList(lines, index)
    if (list !== undefined) {
      segments.push({ kind: 'rich', node: list.node })
      index = list.nextIndex
      continue
    }

    if (isHorizontalRule(line)) {
      index += 1
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (index < lines.length) {
      const candidate = lines[index] ?? ''
      if (candidate.trim().length === 0 || isMarkdownBlockStart(lines, index)) {
        break
      }
      paragraphLines.push(candidate)
      index += 1
    }
    const paragraph = createInlineBlock('paragraph', parseInlineMarkdown(paragraphLines.join('\n')))
    if (paragraph !== undefined) {
      segments.push({ kind: 'rich', node: paragraph })
    }
  }

  return segments
}

function parseMarkdownTable(lines: readonly string[], index: number) {
  const header = lines[index]
  const separator = lines[index + 1]
  if (header === undefined || separator === undefined || !isTableSeparator(separator) || !isTableRow(header)) {
    return undefined
  }

  const headerCells = splitMarkdownTableCells(header).map(markdownCellText)
  if (headerCells.length === 0) {
    return undefined
  }
  const rows: string[][] = []
  let nextIndex = index + 2
  while (nextIndex < lines.length && isTableRow(lines[nextIndex]!)) {
    rows.push(splitMarkdownTableCells(lines[nextIndex]!).map(markdownCellText))
    nextIndex += 1
  }
  if (rows.length === 0) {
    return undefined
  }

  const width = Math.max(headerCells.length, ...rows.map(row => row.length))
  return {
    nextIndex,
    segment: {
      columns: padCells(headerCells, width),
      kind: 'data-table' as const,
      rows: rows.map(row => padCells(row, width)),
    },
  }
}

function parseSetextHeading(lines: readonly string[], index: number) {
  if (!isSetextHeadingStart(lines, index)) {
    return undefined
  }
  const text = lines[index]!.trim()
  const underline = lines[index + 1]!.trim()
  return {
    level: underline.startsWith('=') ? 1 as const : 2 as const,
    nextIndex: index + 2,
    text,
  }
}

function parseIndentedCode(lines: readonly string[], index: number) {
  if (!isIndentedCodeLine(lines[index] ?? '')) {
    return undefined
  }
  const codeLines: string[] = []
  let nextIndex = index
  while (nextIndex < lines.length) {
    const line = lines[nextIndex] ?? ''
    if (isIndentedCodeLine(line)) {
      codeLines.push(line.startsWith('\t') ? line.slice(1) : line.slice(4))
      nextIndex += 1
      continue
    }
    if (line.trim().length === 0 && codeLines.length > 0) {
      codeLines.push('')
      nextIndex += 1
      continue
    }
    break
  }
  while (codeLines.at(-1) === '') {
    codeLines.pop()
  }
  const text = codeLines.join('\n')
  return text.trim().length === 0 ? undefined : { nextIndex, text }
}

function parseTabSeparatedTable(lines: readonly string[], index: number) {
  const header = lines[index]
  if (header === undefined || header.split('\t').length < 2) {
    return undefined
  }
  const rows: string[][] = []
  let nextIndex = index + 1
  while (nextIndex < lines.length) {
    const line = lines[nextIndex] ?? ''
    if (line.trim().length === 0 || line.split('\t').length < 2) {
      break
    }
    rows.push(line.split('\t').map(cell => cell.trim()))
    nextIndex += 1
  }
  if (rows.length === 0) {
    return undefined
  }
  const columns = header.split('\t').map(cell => cell.trim())
  const width = Math.max(columns.length, ...rows.map(row => row.length))
  return {
    nextIndex,
    segment: {
      columns: padCells(columns, width),
      kind: 'data-table' as const,
      rows: rows.map(row => padCells(row, width)),
    },
  }
}

function parseMarkdownChecklist(lines: readonly string[], index: number) {
  const first = readChecklistLine(lines[index] ?? '')
  if (first === undefined) {
    return undefined
  }
  const items: ChecklistItemDraft[] = [first]
  let nextIndex = index + 1
  while (nextIndex < lines.length) {
    const item = readChecklistLine(lines[nextIndex]!)
    if (item === undefined) {
      break
    }
    items.push(item)
    nextIndex += 1
  }
  return {
    nextIndex,
    segment: { items, kind: 'checklist' as const },
  }
}

function readChecklistLine(line: string): ChecklistItemDraft | undefined {
  const match = line.match(/^\s{0,3}[-+*]\s+\[([ xX])\]\s+(.+?)\s*$/)
  if (match === null || match[2]!.trim().length === 0) {
    return undefined
  }
  return {
    checked: match[1]!.toLowerCase() === 'x',
    text: inlineNodesToText(parseInlineMarkdown(match[2]!.trim())),
  }
}

function parseMarkdownList(lines: readonly string[], index: number) {
  const first = lines[index]!.match(/^\s{0,3}([-+*]|\d+[.)])\s+(.+?)\s*$/)
  if (first === null || readChecklistLine(lines[index]!) !== undefined) {
    return undefined
  }
  const ordered = /^\d/.test(first[1]!)
  const items: RichTextNode[] = []
  let nextIndex = index
  while (nextIndex < lines.length) {
    const match = lines[nextIndex]!.match(/^\s{0,3}([-+*]|\d+[.)])\s+(.+?)\s*$/)
    if (match === null || readChecklistLine(lines[nextIndex]!) !== undefined || /^\d/.test(match[1]!) !== ordered) {
      break
    }
    const paragraph = createInlineBlock('paragraph', parseInlineMarkdown(match[2]!.trim()))
    if (paragraph !== undefined) {
      items.push({ children: [paragraph], type: 'list-item' })
    }
    nextIndex += 1
  }
  if (items.length === 0) {
    return undefined
  }
  return {
    nextIndex,
    node: {
      children: items,
      type: ordered ? 'ordered-list' as const : 'bullet-list' as const,
    },
  }
}

function parseInlineMarkdown(value: string): readonly RichTextNode[] {
  const nodes: RichTextNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+[^)]*)?\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|<((?:https?:\/\/|mailto:|tel:)[^>\s]+)>|((?:https?:\/\/)[^\s<]+)/g
  let cursor = 0

  const appendText = (text: string, marks?: RichTextNode['marks']) => {
    if (text.length === 0) {
      return
    }
    nodes.push({
      ...(marks === undefined || marks.length === 0 ? {} : { marks }),
      text,
      type: 'text',
    })
  }

  for (const match of Array.from(value.matchAll(pattern))) {
    const index = match.index ?? cursor
    appendText(value.slice(cursor, index))
    if (match[1] !== undefined) {
      const href = safeHref(match[2]!)
      appendText(match[1]!, href === undefined ? undefined : [{ href, type: 'link' }])
    } else if (match[3] !== undefined) {
      appendText(match[3], [{ type: 'code' }])
    } else if (match[4] !== undefined || match[5] !== undefined) {
      appendText(match[4] ?? match[5]!, [{ type: 'bold' }])
    } else if (match[6] !== undefined || match[7] !== undefined) {
      appendText(match[6] ?? match[7]!, [{ type: 'italic' }])
    } else if (match[8] !== undefined) {
      const href = safeHref(match[8])
      appendText(match[8], href === undefined ? undefined : [{ href, type: 'link' }])
    } else if (match[9] !== undefined) {
      const { href, trailing } = splitBareUrl(match[9])
      const safeUrl = safeHref(href)
      appendText(href, safeUrl === undefined ? undefined : [{ href: safeUrl, type: 'link' }])
      appendText(trailing)
    }
    cursor = index + match[0].length
  }
  appendText(value.slice(cursor))
  return mergeInlineNodes(nodes)
}

function parseHtmlSegments(html: string): readonly Segment[] {
  if (typeof DOMParser === 'undefined') {
    return []
  }
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const segments: Segment[] = []
  visitHtmlChildren(parsed.body, [], segments)
  return segments
}

function visitHtmlChildren(
  parent: Node,
  inheritedMarks: readonly RichTextMark[],
  segments: Segment[],
) {
  const richNodes: RichTextNode[] = []
  const inlineNodes: RichTextNode[] = []
  const flushInline = () => {
    const paragraph = createInlineBlock('paragraph', trimInlineNodes(inlineNodes.splice(0)))
    if (paragraph !== undefined) {
      richNodes.push(paragraph)
    }
  }
  const flushRich = () => {
    flushInline()
    for (const node of richNodes.splice(0)) {
      segments.push({ kind: 'rich', node })
    }
  }
  const appendRichNode = (node: RichTextNode | undefined) => {
    flushInline()
    if (node !== undefined) {
      richNodes.push(node)
    }
  }

  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === 3) {
      inlineNodes.push(...createTextNodes(child.nodeValue ?? '', inheritedMarks))
      continue
    }
    if (child.nodeType !== 1) {
      continue
    }

    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (IGNORED_HTML_TAGS.has(tag)) {
      continue
    }
    if (tag === 'table') {
      flushRich()
      const table = parseHtmlTable(element)
      if (table === undefined) {
        const fallback = createInlineBlock('paragraph', createTextNodes(safeTextContent(element), inheritedMarks))
        if (fallback !== undefined) {
          segments.push({ kind: 'rich', node: fallback })
        }
      } else {
        if (table.caption !== undefined) {
          const caption = createInlineBlock('paragraph', createTextNodes(table.caption, inheritedMarks))
          if (caption !== undefined) {
            segments.push({ kind: 'rich', node: caption })
          }
        }
        segments.push(table)
      }
      continue
    }
    if (tag === 'ul' || tag === 'ol') {
      const checklist = parseHtmlChecklist(element)
      if (checklist !== undefined) {
        flushRich()
        segments.push(checklist)
        continue
      }
    }
    if (HTML_BLOCK_TAGS.has(tag)) {
      if (HTML_WRAPPER_TAGS.has(tag) && hasStructuredChild(element)) {
        flushRich()
        visitHtmlChildren(element, inheritedMarks, segments)
      } else {
        appendRichNode(parseHtmlRichNode(element, inheritedMarks))
      }
      continue
    }
    inlineNodes.push(...collectInlineNodes(element, inheritedMarks))
  }
  flushRich()
}

function parseHtmlRichNode(
  element: Element,
  inheritedMarks: readonly RichTextMark[],
): RichTextNode | undefined {
  const tag = element.tagName.toLowerCase()
  if (tag === 'hr') {
    return undefined
  }
  if (/^h[1-6]$/.test(tag)) {
    return createInlineBlock(
      'heading',
      trimInlineNodes(collectInlineNodes(element, inheritedMarks)),
      Math.min(3, Number(tag.slice(1))) as 1 | 2 | 3,
    )
  }
  if (tag === 'p' || (HTML_BLOCK_TAGS.has(tag) && !['blockquote', 'ol', 'pre', 'ul'].includes(tag))) {
    return createInlineBlock('paragraph', trimInlineNodes(collectInlineNodes(element, inheritedMarks)))
  }
  if (tag === 'pre') {
    const code = safeTextContent(element).replaceAll('\r\n', '\n').replaceAll('\r', '\n')
    return code.trim().length === 0 ? undefined : { text: code, type: 'code-block' }
  }
  if (tag === 'blockquote') {
    const children = parseHtmlRichChildren(element, inheritedMarks)
    return children.length === 0 ? undefined : { children, type: 'blockquote' }
  }
  if (tag === 'ul' || tag === 'ol') {
    const children = Array.from(element.children)
      .filter(child => child.tagName.toLowerCase() === 'li')
      .map(child => parseHtmlListItem(child, inheritedMarks))
      .filter((child): child is RichTextNode => child !== undefined)
    return children.length === 0
      ? undefined
      : { children, type: tag === 'ol' ? 'ordered-list' : 'bullet-list' }
  }
  return createInlineBlock('paragraph', trimInlineNodes(collectInlineNodes(element, inheritedMarks)))
}

function parseHtmlRichChildren(
  parent: Element,
  inheritedMarks: readonly RichTextMark[],
): readonly RichTextNode[] {
  const nestedSegments: Segment[] = []
  visitHtmlChildren(parent, inheritedMarks, nestedSegments)
  return nestedSegments.flatMap(segmentToRichNodes)
}

function parseHtmlListItem(
  element: Element,
  inheritedMarks: readonly RichTextMark[],
): RichTextNode | undefined {
  const children: RichTextNode[] = []
  const paragraph = createInlineBlock(
    'paragraph',
    trimInlineNodes(collectInlineNodes(element, inheritedMarks, new Set(['ol', 'ul']))),
  )
  if (paragraph !== undefined) {
    children.push(paragraph)
  }
  for (const nested of Array.from(element.children)) {
    const tag = nested.tagName.toLowerCase()
    if (tag === 'ol' || tag === 'ul') {
      const node = parseHtmlRichNode(nested, inheritedMarks)
      if (node !== undefined) {
        children.push(node)
      }
    }
  }
  return children.length === 0 ? undefined : { children, type: 'list-item' }
}

function collectInlineNodes(
  parent: Element,
  inheritedMarks: readonly RichTextMark[],
  skipTags = new Set<string>(),
): readonly RichTextNode[] {
  const nodes: RichTextNode[] = []
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === 3) {
      nodes.push(...createTextNodes(child.nodeValue ?? '', inheritedMarks))
      continue
    }
    if (child.nodeType !== 1) {
      continue
    }
    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (IGNORED_HTML_TAGS.has(tag) || skipTags.has(tag)) {
      continue
    }
    if (tag === 'br') {
      nodes.push({
        ...(inheritedMarks.length === 0 ? {} : { marks: inheritedMarks }),
        text: '\n',
        type: 'text',
      })
      continue
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') {
      continue
    }
    if (tag === 'img') {
      const alt = element.getAttribute('alt')?.trim() ?? ''
      if (alt.length > 0) {
        nodes.push(...createTextNodes(alt, inheritedMarks))
      }
      continue
    }
    const mark = htmlMarkForElement(element)
    nodes.push(...collectInlineNodes(element, mark === undefined ? inheritedMarks : [...inheritedMarks, mark], skipTags))
  }
  return mergeInlineNodes(nodes)
}

function createTextNodes(
  value: string,
  marks: readonly RichTextMark[],
): readonly RichTextNode[] {
  const text = value.replace(/\s+/g, ' ')
  return text.length === 0
    ? []
    : [{
        ...(marks.length === 0 ? {} : { marks }),
        text,
        type: 'text',
      }]
}

function htmlMarkForElement(element: Element): RichTextMark | undefined {
  const tag = element.tagName.toLowerCase()
  if (tag === 'strong' || tag === 'b') {
    return { type: 'bold' }
  }
  if (tag === 'em' || tag === 'i') {
    return { type: 'italic' }
  }
  if (tag === 'u') {
    return { type: 'underline' }
  }
  if (tag === 'code') {
    return { type: 'code' }
  }
  if (tag === 'a') {
    const href = safeHref(element.getAttribute('href') ?? '')
    return href === undefined ? undefined : { href, type: 'link' }
  }
  return undefined
}

function parseHtmlChecklist(element: Element): ChecklistSegment | undefined {
  const listItems = Array.from(element.children).filter(child => child.tagName.toLowerCase() === 'li')
  if (listItems.length === 0) {
    return undefined
  }
  const items: ChecklistItemDraft[] = []
  for (const item of listItems) {
    const checkbox = Array.from(item.querySelectorAll('input')).find(input => (
      (input.getAttribute('type') ?? '').toLowerCase() === 'checkbox'
    ))
    if (checkbox === undefined) {
      return undefined
    }
    const text = inlineNodesToText(collectInlineNodes(item, [], new Set(['ol', 'ul']))).trim()
    if (text.length > 0) {
      items.push({
        checked: checkbox.hasAttribute('checked') || (checkbox as HTMLInputElement).checked,
        text,
      })
    }
  }
  return items.length === listItems.length ? { items, kind: 'checklist' } : undefined
}

function parseHtmlTable(element: Element): DataTableSegment | undefined {
  const rows = Array.from(element.querySelectorAll('tr')).filter(row => row.closest('table') === element)
  const parsedRows = rows.map(row => ({
    cells: Array.from(row.children)
      .filter(cell => ['td', 'th'].includes(cell.tagName.toLowerCase()))
      .map(cell => safeTextContent(cell).replace(/\s+/g, ' ').trim()),
    hasHeader: Array.from(row.children).some(cell => cell.tagName.toLowerCase() === 'th'),
  })).filter(row => row.cells.length > 0)
  if (parsedRows.length === 0) {
    return undefined
  }

  const headerIndex = parsedRows.findIndex(row => row.hasHeader)
  const header = headerIndex < 0 ? [] : parsedRows[headerIndex]!.cells
  const body = headerIndex < 0
    ? parsedRows.map(row => row.cells)
    : parsedRows.filter((_, rowIndex) => rowIndex !== headerIndex).map(row => row.cells)
  if (body.length === 0) {
    return undefined
  }
  const width = Math.max(header.length, ...body.map(row => row.length))
  if (width === 0) {
    return undefined
  }
  const caption = element.querySelector(':scope > caption')?.textContent?.replace(/\s+/g, ' ').trim()
  return {
    ...(caption === undefined || caption.length === 0 ? {} : { caption }),
    columns: padCells(header, width),
    kind: 'data-table',
    rows: body.map(row => padCells(row, width)),
  }
}

function safeTextContent(node: Node): string {
  let text = ''
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      text += child.nodeValue ?? ''
      continue
    }
    if (child.nodeType !== 1) {
      continue
    }
    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (IGNORED_HTML_TAGS.has(tag)) {
      continue
    }
    text += tag === 'br' ? '\n' : safeTextContent(element)
  }
  return text
}

function hasStructuredChild(element: Element): boolean {
  return Array.from(element.children).some((child) => {
    const tag = child.tagName.toLowerCase()
    return HTML_BLOCK_TAGS.has(tag) || (HTML_WRAPPER_TAGS.has(tag) && hasStructuredChild(child))
  })
}

function createInlineBlock(
  type: 'heading' | 'paragraph',
  nodes: readonly RichTextNode[],
  level?: 1 | 2 | 3,
): RichTextNode | undefined {
  const inline = trimInlineNodes(nodes)
  if (inline.length === 0 || inlineNodesToText(inline).trim().length === 0) {
    return undefined
  }
  if (inline.length === 1 && inline[0]!.type === 'text' && inline[0]!.marks === undefined) {
    return {
      ...(type === 'heading' ? { level } : {}),
      text: inline[0]!.text,
      type,
    }
  }
  return {
    ...(type === 'heading' ? { level } : {}),
    children: inline,
    type,
  }
}

function trimInlineNodes(nodes: readonly RichTextNode[]): readonly RichTextNode[] {
  const trimmed = nodes.map(node => ({ ...node }))
  const first = trimmed[0]
  const last = trimmed.at(-1)
  if (first?.type === 'text' && first.text !== undefined) {
    trimmed[0] = { ...first, text: first.text.replace(/^\s+/, '') }
  }
  if (last?.type === 'text' && last.text !== undefined) {
    const lastIndex = trimmed.length - 1
    trimmed[lastIndex] = { ...last, text: last.text.replace(/\s+$/, '') }
  }
  return trimmed.filter(node => node.type !== 'text' || node.text?.length !== 0)
}

function mergeInlineNodes(nodes: readonly RichTextNode[]): readonly RichTextNode[] {
  const merged: RichTextNode[] = []
  for (const node of nodes) {
    const previous = merged.at(-1)
    if (previous?.type === 'text' && node.type === 'text' && JSON.stringify(previous.marks ?? []) === JSON.stringify(node.marks ?? [])) {
      merged[merged.length - 1] = { ...previous, text: `${previous.text ?? ''}${node.text ?? ''}` }
    } else {
      merged.push(node)
    }
  }
  return merged
}

function inlineNodesToText(nodes: readonly RichTextNode[]): string {
  return nodes.map(node => `${node.text ?? ''}${node.children === undefined ? '' : inlineNodesToText(node.children)}`).join('')
}

function segmentToRichNodes(segment: Segment): readonly RichTextNode[] {
  if (segment.kind === 'rich') {
    return [segment.node]
  }
  if (segment.kind === 'checklist') {
    return segment.items.map(item => ({ text: `${item.checked ? '[x]' : '[ ]'} ${item.text}`, type: 'paragraph' as const }))
  }
  const rows = [segment.columns, ...segment.rows]
  return rows.map(row => ({ text: row.join(' | '), type: 'paragraph' as const }))
}

function markdownCellText(value: string) {
  return inlineNodesToText(parseInlineMarkdown(value.trim())).trim()
}

function splitMarkdownTableCells(value: string): readonly string[] {
  let text = value.trim()
  if (text.startsWith('|')) {
    text = text.slice(1)
  }
  if (text.endsWith('|') && !text.endsWith('\\|')) {
    text = text.slice(0, -1)
  }
  const cells: string[] = []
  let current = ''
  let escaped = false
  for (const character of text) {
    if (escaped) {
      current += character
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else if (character === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  if (escaped) {
    current += '\\'
  }
  cells.push(current.trim())
  return cells
}

function padCells(cells: readonly string[], width: number): readonly string[] {
  return Array.from({ length: width }, (_, index) => cells[index] ?? '')
}

function safeHref(value: string): string | undefined {
  const href = value.trim()
  if (href.length === 0 || Array.from(href).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })) {
    return undefined
  }
  return /^(?:https?:|mailto:|tel:)/i.test(href) ? href : undefined
}

function splitBareUrl(value: string) {
  const trailing = value.match(/[,!?;:)\]}，。！？；：）】、]+$/)?.[0] ?? ''
  if (trailing.length === 0 || trailing.length === value.length) {
    return { href: value, trailing: '' }
  }
  return {
    href: value.slice(0, -trailing.length),
    trailing,
  }
}

function segmentToText(segment: Segment): string {
  if (segment.kind === 'rich') {
    return inlineNodesToText([segment.node])
  }
  if (segment.kind === 'checklist') {
    return segment.items.map(item => item.text).join(' ')
  }
  return [...segment.columns, ...segment.rows.flat()].join(' ')
}

function hasMeaningfulSegments(segments: readonly Segment[]) {
  return segments.some(segment => segmentToText(segment).trim().length > 0)
}

function looksLikeMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.some((line, index) => (
    /^\s{0,3}#{1,6}\s+/.test(line)
    || /^\s{0,3}(?:[-+*]|\d+[.)])\s+/.test(line)
    || /^\s{0,3}>/.test(line)
    || /^\s{0,3}(?:`{3,}|~{3,})/.test(line)
    || isIndentedCodeLine(line)
    || isHorizontalRule(line)
    || isSetextHeadingStart(lines, index)
    || (isTableRow(line) && lines[index + 1] !== undefined && isTableSeparator(lines[index + 1]!))
    || /\[[^\]]+\]\([^)]*\)/.test(line)
    || /(?:\*\*|__|`)[^\n]+(?:\*\*|__|`)/.test(line)
  ))
}

function isMarkdownBlockStart(lines: readonly string[], index: number) {
  const line = lines[index] ?? ''
  return /^\s{0,3}(?:#{1,6}\s+|>|[-+*]\s+|\d+[.)]\s+|`{3,}|~{3,})/.test(line)
    || isIndentedCodeLine(line)
    || isHorizontalRule(line)
    || isSetextHeadingStart(lines, index)
    || (isTableRow(line) && lines[index + 1] !== undefined && isTableSeparator(lines[index + 1]!))
}

function isSetextHeadingStart(lines: readonly string[], index: number) {
  const line = lines[index] ?? ''
  const underline = lines[index + 1] ?? ''
  if (line.trim().length === 0 || isIndentedCodeLine(line)) {
    return false
  }
  if (/^\s{0,3}(?:#{1,6}\s+|>|[-+*]\s+|\d+[.)]\s+|`{3,}|~{3,})/.test(line) || isHorizontalRule(line)) {
    return false
  }
  return /^\s{0,3}(?:=+|-+)\s*$/.test(underline)
}

function isIndentedCodeLine(value: string) {
  return /^(?: {4}|\t)/.test(value)
}

function isTableRow(value: string) {
  const trimmed = value.trim()
  return trimmed.includes('|') && !trimmed.startsWith('```') && !trimmed.startsWith('~~~')
}

function isTableSeparator(value: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(value)
}

function isHorizontalRule(value: string) {
  return /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(value)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeLineEndings(value: string) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}
