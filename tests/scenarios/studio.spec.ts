import { type Page, expect, test } from '@playwright/test'

interface StudioState {
  readonly documentId: string
  readonly durableRevision: number
  readonly meaningful: boolean
  readonly recentCount: number
  readonly restored: boolean
  readonly revision: number
  readonly status: string
}

async function readStudioState(page: Page) {
  return JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}') as StudioState
}

async function dispatchPaste(
  locator: ReturnType<Page['locator']>,
  payload: { readonly html?: string; readonly text: string },
) {
  await locator.evaluate((element, value) => {
    const data = new DataTransfer()
    data.setData('text/plain', value.text)
    if (value.html !== undefined) {
      data.setData('text/html', value.html)
    }
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      clipboardData: data,
    }))
  }, payload)
}

async function readWheelScroll(page: Page, scroller: ReturnType<Page['locator']>) {
  await scroller.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.scrollTop = 0
    }
  })
  await scroller.hover()
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(50)
  return scroller.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      return { after: 0, clientHeight: 0, scrollHeight: 0 }
    }
    return {
      after: element.scrollTop,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }
  })
}

test.describe('General Long Image Studio slice', () => {
  test('opens an editable starter, commits meaningful content, and restores it', async ({ page }) => {
    await page.goto('/studio')

    const editorSurface = page.getByTestId('studio-editor')
    const root = editorSurface.locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')

    await expect(editorSurface).toBeVisible()
    await expect(root).toHaveAttribute('data-render-mode', 'edit')
    await expect(editor).toBeVisible()
    await expect(editor).toBeFocused()
    await expect(page.getByTestId('studio-starter-hint')).toContainText('开始输入')
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeVisible()
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeDisabled()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      durableRevision: 0,
      meaningful: false,
      recentCount: 0,
      restored: false,
      revision: 1,
    })

    await editor.fill('这是我的第一段有意义内容。')
    await editor.press('Escape')

    await expect.poll(() => readStudioState(page)).toMatchObject({
      durableRevision: 2,
      meaningful: true,
      recentCount: 1,
      revision: 2,
      status: '已保存',
    })
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root.getByText('这是我的第一段有意义内容。')).toBeVisible()
    const exportButton = page.getByRole('button', { name: '导出本地文件' })
    await expect(exportButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('oneimg-general-long-image-r2.png')

    const documentId = (await readStudioState(page)).documentId
    await page.reload()

    const restoredRoot = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(restoredRoot).toHaveAttribute('data-render-mode', 'edit')
    await expect(restoredRoot).toHaveAttribute('data-render-ready', 'true')
    await expect(restoredRoot.getByText('这是我的第一段有意义内容。')).toBeVisible()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      documentId,
      durableRevision: 2,
      meaningful: true,
      recentCount: 1,
      restored: true,
      revision: 2,
    })
  })

  test('clean preview hides editor chrome without changing the canonical root', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')

    await page.getByRole('button', { name: '清爽预览' }).click()

    await expect(page.getByTestId('studio-editor-chrome')).toBeHidden()
    await expect(page.getByTestId('studio-header')).toBeHidden()
    await expect(page.getByTestId('studio-clean-preview-chrome')).toBeVisible()
    await expect(root).toHaveAttribute('data-render-mode', 'preview')
    await expect(root).toHaveAttribute('data-document-id', /document:studio:/)
    await expect(page.getByRole('button', { name: '返回编辑' })).toBeVisible()
  })

  test('scrolls long content in edit and clean preview modes', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    const longText = Array.from({ length: 20 }, (_, index) => `第 ${index + 1} 段需要在长页面中保持可见。`).join('\n\n')

    await editor.fill(longText)
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })

    const scroller = page.getByTestId('studio-scroll-container')
    const editScroll = await readWheelScroll(page, scroller)
    expect(editScroll.scrollHeight).toBeGreaterThan(editScroll.clientHeight)
    expect(editScroll.after).toBeGreaterThan(0)

    await page.getByRole('button', { name: '清爽预览' }).click()
    await expect(root).toHaveAttribute('data-render-mode', 'preview')

    const previewScroll = await readWheelScroll(page, scroller)
    expect(previewScroll.scrollHeight).toBeGreaterThan(previewScroll.clientHeight)
    expect(previewScroll.after).toBeGreaterThan(0)
  })

  test('pastes semantic content locally as ordered safe blocks and undoes it once', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await dispatchPaste(editor, {
      html: `
        <h1 class="foreign-title" style="position: fixed; font-family: EvilFont">粘贴标题</h1>
        <p>第一段 <a href="https://example.com" onclick="alert('no')">安全链接</a></p>
        <ul><li>普通列表</li></ul>
        <blockquote>引用内容</blockquote>
        <pre><code>const answer = 42;</code></pre>
        <table style="width: 800px"><thead><tr><th>项目</th><th>值</th></tr></thead><tbody><tr><td>一个</td><td>两个</td></tr></tbody></table>
        <ul><li><input type="checkbox" checked>已完成</li><li><input type="checkbox">待处理</li></ul>
        <script>恶意脚本不应进入文档</script>
      `,
      text: '粘贴标题\n第一段 安全链接\n普通列表\n引用内容\nconst answer = 42;\n项目\t值\n一个\t两个\n- [x] 已完成\n- [ ] 待处理',
    })

    await expect.poll(() => readStudioState(page)).toMatchObject({
      durableRevision: 2,
      meaningful: true,
      revision: 2,
      status: '已保存',
    })
    await expect(root.locator('[data-block-kind="rich-text"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="data-table"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="checklist"]')).toHaveCount(1)
    const semanticBlockKinds = await root.locator('[data-block-kind]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-block-kind'))
    ))
    expect(semanticBlockKinds).toEqual(['rich-text', 'data-table', 'checklist'])
    await expect(root.locator('[data-node-type="heading"]')).toHaveText('粘贴标题')
    await expect(root.locator('[data-node-type="bullet-list"]')).toContainText('普通列表')
    await expect(root.locator('[data-node-type="blockquote"]')).toContainText('引用内容')
    await expect(root.locator('[data-node-type="code-block"]')).toContainText('const answer = 42;')
    await expect(root.locator('a[href="https://example.com"]')).toHaveText('安全链接')
    await expect(root.locator('[data-block-kind="checklist"]')).toContainText('已完成')
    await expect(root.locator('[data-block-kind="checklist"]')).toContainText('待处理')
    await expect(root.locator('[data-block-kind="checklist"] input').first()).toBeDisabled()

    const renderedMarkup = await root.innerHTML()
    expect(renderedMarkup).not.toContain('EvilFont')
    expect(renderedMarkup).not.toContain('foreign-title')
    expect(renderedMarkup).not.toContain('恶意脚本不应进入文档')
    const ownedCss = await page.locator('style[data-oneimg-owned-style]').textContent()
    expect(ownedCss).not.toContain('EvilFont')
    expect(ownedCss).not.toContain('position: fixed')

    await editor.focus()
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2 })
    await expect(root.locator('[data-node-type="bullet-list"]')).toContainText('普通列表')

    const undo = page.getByRole('button', { name: '撤销' })
    const redo = page.getByRole('button', { name: '重做' })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, meaningful: false })
    await expect(root.locator('[data-block-kind]')).toHaveCount(0)

    await expect(redo).toBeEnabled()
    await redo.click()
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 4, meaningful: true })
    await expect(root.locator('[data-block-kind="data-table"]')).toHaveCount(1)
  })

  test('parses Markdown and plain text without executing or retaining foreign presentation', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await dispatchPaste(editor, {
      text: `# Markdown 标题

Setext 标题
===

含有 **加粗**、\`内联代码\` 和 [安全链接](https://example.com)。
    const indented = true
- 普通列表一
- 普通列表二
1. 有序列表一
2. 有序列表二
> Markdown 引用
\`\`\`ts
const pasted = true
\`\`\`
| 名称 | 值 |
| --- | --- |
| 一 | 二 |
- [x] 已完成
- [ ] 待处理`,
    })

    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, meaningful: true, status: '已保存' })
    await expect(root.locator('[data-block-kind="rich-text"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="data-table"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="checklist"]')).toHaveCount(1)
    await expect(root.locator('[data-node-type="heading"]')).toHaveCount(2)
    await expect(root.locator('[data-node-type="heading"]').first()).toHaveText('Markdown 标题')
    await expect(root.locator('[data-node-type="heading"]').nth(1)).toHaveText('Setext 标题')
    await expect(root.locator('[data-node-type="ordered-list"]')).toContainText('有序列表二')
    await expect(root.locator('[data-node-type="code-block"]')).toHaveCount(2)
    await expect(root.locator('[data-node-type="code-block"]').first()).toContainText('const indented = true')
    await expect(root.locator('[data-node-type="code-block"]').last()).toContainText('const pasted = true')
    await expect(root.locator('strong')).toHaveText('加粗')
    await expect(root.locator('code').filter({ hasText: '内联代码' })).toHaveText('内联代码')
    await expect(root.locator('a[href="https://example.com"]')).toHaveText('安全链接')

    await page.reload()
    const restoredRoot = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(restoredRoot.locator('[data-block-kind="data-table"]')).toHaveCount(1)
    await expect(restoredRoot.locator('[data-block-kind="checklist"]')).toContainText('待处理')

    const plainEditor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await dispatchPaste(plainEditor, {
      html: '<div class="untrusted" style="position: absolute; width: 900px" onclick="steal()">普通文本 <a href="javascript:alert(1)">危险链接</a></div>',
      text: '普通文本 危险链接',
    })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, meaningful: true, status: '已保存' })
    await expect(restoredRoot.locator('[data-block-kind="rich-text"]')).toHaveCount(2)
    const pastedRichText = restoredRoot.locator('[data-block-kind="rich-text"]').last()
    await expect(pastedRichText.locator('a')).toHaveCount(0)
    const richTextContents = await restoredRoot.locator('[data-block-kind="rich-text"]').allTextContents()
    expect(richTextContents.at(-1)).toContain('普通文本 危险链接')
    const renderedMarkup = await pastedRichText.innerHTML()
    expect(renderedMarkup).not.toContain('untrusted')
    expect(renderedMarkup).not.toContain('position')
    expect(renderedMarkup).not.toContain('javascript:')
  })

  test('inserts a later paste after the active semantic block', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await dispatchPaste(root.locator('[contenteditable="true"]'), { text: '第一段粘贴内容' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, status: '已保存' })

    const firstBlockEditor = root.locator('[data-block-kind="rich-text"] [contenteditable="true"]').first()
    await dispatchPaste(firstBlockEditor, { text: '第二段粘贴内容' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, status: '已保存' })

    const blockKinds = await root.locator('[data-block-kind]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-block-kind'))
    ))
    expect(blockKinds).toEqual(['rich-text', 'rich-text'])
    const contents = await root.locator('[data-block-kind="rich-text"]').allTextContents()
    expect(contents).toEqual(['第一段粘贴内容', '第二段粘贴内容'])
  })

  test('recognizes tab-separated tables and explicit checklists in plain clipboard text', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await dispatchPaste(root.locator('[contenteditable="true"]'), {
      text: '普通文本第一行 https://plain.example\n普通文本第二行\n\n项目\t值\n一个\t两个\n- [ ] 待处理',
    })

    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, meaningful: true, status: '已保存' })
    await expect(root.locator('[data-block-kind]')).toHaveCount(3)
    await expect(root.locator('[data-block-kind="data-table"] th')).toHaveText(['项目', '值'])
    await expect(root.locator('[data-block-kind="data-table"] td')).toHaveText(['一个', '两个'])
    await expect(root.locator('[data-block-kind="checklist"] input')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="checklist"] input')).not.toBeChecked()
    await expect(root.locator('a[href="https://plain.example"]')).toHaveText('https://plain.example')
  })

  test('preserves a competing writer as a Conflict Draft', async ({ context, page }) => {
    await page.goto('/studio')

    const editor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await editor.fill('主分支的第一版内容。')
    await editor.press('Escape')
    await expect(page.getByTestId('studio-status')).toHaveText('已保存')

    const competingPage = await context.newPage()
    await competingPage.goto('/studio')
    const competingEditor = competingPage.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await expect(competingEditor).toContainText('主分支的第一版内容。')

    await editor.fill('主分支的第二版内容。')
    await editor.press('Escape')
    await expect(page.getByTestId('studio-status')).toHaveText('已保存')

    await competingEditor.fill('竞争分支的内容。')
    await competingEditor.press('Escape')

    await expect(competingPage.getByTestId('studio-conflict-notice')).toBeVisible()
    await expect(competingPage.getByTestId('studio-conflict-notice')).toContainText('冲突草稿')
    await expect(page.getByText('主分支的第二版内容。')).toBeVisible()

    await competingPage.getByRole('button', { name: '查看冲突草稿' }).click()
    await expect(competingPage.getByTestId('studio-conflict-preview')).toBeVisible()
    await expect(competingPage.getByText('竞争分支的内容。')).toBeVisible()
    await expect(competingPage.getByTestId('studio-editor').locator('[contenteditable="true"]')).toHaveCount(0)
    await competingPage.getByRole('button', { name: '返回当前 Draft' }).click()

    await competingPage.getByRole('button', { name: '恢复已提交版本' }).click()
    await expect(competingPage.getByText('主分支的第二版内容。')).toBeVisible()
    await competingPage.close()
  })
})
