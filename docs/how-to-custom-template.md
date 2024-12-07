## 如何自定义模版主题

本指南分为两个部分：模版结构介绍和如何自定义模版样式。

## 模版结构介绍
模版结构分为以下三个部分。其中，二级内容(sub-container) 位于一级标题的正文 (main-content) 中。

1. 大标题和描述 (hero)
2. 一级标题和正文 (main)
3. 二级标题和正文 (sub)

### 模版HTML结构

```html
<div class="one-container">
  <div class="one-list">
    <!-- 大标题区域 hero-container -->
    <div class="hero-container">

      <!-- 大标题 hero-title -->
      <div class="hero-title">
        <p>...</p>
      </div>

      <!-- 大标题描述 hero-content -->
      <div class="hero-content">

        <!-- 富文本编辑器生成的内容 -->
        <p>...</p>
        <blockquote>
          <p>good morning</p>
        </blockquote>

        <!-- 图片区域，位于描述内容的底部 -->
        <div data-class="oneimg-images">
          <img alt="chat_id.png" class="object-cover w-full"
            src="blob:https://oneimgai.com/ce65176f-87c2-468b-8315-9b72a980b952">
        </div>
      </div>
    </div>

    <!-- 一级标题区域 main-container -->
    <div class="main-container">
      <!-- 一级标题 main-title -->
      <div class="main-title">
        <!-- 富文本编辑器生成的内容 -->
        <p>...</p>
      </div>

      <!-- 一级标题正文（含二级标题和正文）main-content -->
      <div class="main-content">
        <!-- 富文本编辑器生成的内容 -->
        <p>...</p>
        <blockquote>
          <p>good morning</p>
        </blockquote>

        <!-- 一级标题正文图片区域，位于正文的底部 -->
        <div data-class="oneimg-images">
          <img alt="chat_id.png" class="object-cover w-full"
            src="blob:https://oneimgai.com/ce65176f-87c2-468b-8315-9b72a980b952">
        </div>

        <!-- 二级标题区域 sub-container -->
        <div class="sub-container">
          <!-- 二级标题 sub-title -->
          <div class="sub-title">
            <!-- 富文本编辑器生成的内容 -->
            <p>...</p>
          </div>

          <!-- 二级标题的正文 sub-content -->
          <div class="sub-content">
            <!-- 富文本编辑器生成的内容 -->
            <p>...</p>
             
            <!-- 二级标题正文图片区域，位于正文的底部 -->
            <div data-class="oneimg-images">
              <img alt="chat_id.png" class="object-cover w-full"
                src="blob:https://oneimgai.com/ce65176f-87c2-468b-8315-9b72a980b952">
            </div>
          </div>
        </div>
        <div class="sub-container">...</div>
        <!-- ...更多二级标题和正文 -->
      </div>
    </div>

    <div class="main-container">...</div>
    <!-- ...更多一级标题和正文 -->
  </div>
</div>
```

### 模版CSS样式

使用 CSS-in-JS 动态生成的 CSS 样式，CSS 类名做了简化处理。

```css
.hero-container {}
.hero-title {}
.hero-content {}
.main-container {}
.main-title {}
.main-content {}
.sub-container {}
.sub-title {}
.sub-content {}
```

## 如何自定义模版样式和颜色主题

自定义模版和主题分为三个步骤：

1. 编写模版样式
2. 编写颜色主题
3. 配置模版变量

由于本项目使用 CSS-in-JS 方案 [tss-react](https://www.tss-react.dev) 在运行时动态生成模版样式，你需要在 typescript 文件中编写模版的 CSS 样式。

在项目模版 [src/theme/templates](https://github.com/byodian/oneimg/tree/main/src/theme/templates) 文件夹中创建一个自定义模版样式文件夹，比如 demo-template

在 demo-template 模版文件夹中分别创建三个文件：
1. `demo-template.ts` - 模版的 CSS-in-JS 样式
2. `demo-color-variables.ts` - 模版主题颜色的 CSS 自定义变量
3. `index.ts` - 入口文件


`index.ts` 文件内容

```ts
export * from './demo-template'
export * from './demo-color-variables'
```

### 编写模版样式

tss-react 可以将 `demo-template.ts` 中的 CSS-in-JS 内容自动转换为 [CSS](#模版CSS样式) 样式，生成的样式会自动作用于各自对应的区域。

```ts
import type { ArticleModuleTemplate } from '@/types'

export const demoTemplate: ArticleModuleTemplate = {
  // 大标题区域
  hero: {
    container: {},
    title: {},
    content: {},
  },
  // 一级标题区域
  main: {
    container: {},
    title: {},
    content: {},
  },
  // 二级标题区域
  sub: {
    container: {},
    title: {},
    content: {},
  },
}
```

### 编写颜色主题

每个模版可以有很多颜色主题，项目使用 [CSS 自定义变量](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)实现颜色主题的切换。

CSS自定义变量使用驼峰命名方式：

```ts
import type { ThemeConfig } from '@/types'
export const demoBlue: ThemeConfig = {
  hero: {
    container: {
      background: '#e3dceb',
      backgroundImageLeft: 'url(/images/cartoon-star-left.svg)',
      foreground: '#000',
    },
    title: {
      foreground: '#fff',
      background: 'transparent',
    },
    content: {
      background: 'transparent',
    },
  },
  main: {
    container: {
      foreground: '#000',
      background: '#e3dceb',
    },
    title: {
      backgroundPrimary: '#ffe36c',
      backgroundSecondary: '#c0a1f1',
    },
    content: {
      background: '#fff',
    },
  },
  sub: {
    container: {},
    title: {
      background: '#ffe36c',
    },
    content: {},
  },
}
```

[generateThemeVariables](https://github.com/byodian/oneimg/blob/main/src/lib/template.ts#L67) 可以将 `demo-color-variables.ts` 中的内容转换为下面的格式，并使用 tss-react 的 `<GlobalStyles styles={{ ':root': cssVariables }} />` 自动插入到全局样式中。

```css
:root {
  --hero-container-background: #e3dceb;
  --hero-container-background-image-left: url(/images/cartoon-star-left.svg);
  --hero-container-foreground: #000;
  --hero-title-foreground: #fff;
  --hero-title-background: transparent;
  --hero-content-background: transparent;
  --main-container-foreground: #000;
  --main-container-background: #e3dceb;
  --main-title-background-primary: #ffe36c;
  --main-title-background-secondary: #c0a1f1;
  --main-content-background: #fff;
  --sub-title-background: #ffe36c;
}
```

在编写模版样式的时候，你可以在 color、background 等属性中使用这些变量，比如更新 `demo-templagte.ts` 文件：

```ts
import type { ArticleModuleTemplate } from '@/types'

export const demoTemplate: ArticleModuleTemplate = {
  // 大标题区域
  hero: {
    container: {
      color: 'var(--hero-container-foreground)',
      backgroundColor: 'var(--hero-container-background)',
      backgroundImage: 'var(--hero-container-background-image-left)',
    },
    title: {
      color: 'var(--hero-title-foreground)',
      backgroundColor: 'var(--hero-title-background)',
    },
    content: {
      backgroundColor: 'var(--hero-content-background)',
    },
  },
  // 一级标题区域
  main: {
    container: {
      color: 'var(--main-container-foreground)',
      backgroundColor: 'var(--main-container-background)',
    },
    title: {
      backgroundColor: 'var(--main-title-background-primary)',
    },
    content: {
      backgroundColor: 'var(--main-content-background)',
    },
  },
  // 二级标题区域
  sub: {
    container: {},
    title: {
      backgroundColor: 'var(--sub-title-background)',
    },
    content: {},
  },
}
```

### 配置模版变量
模版和颜色主题编写完成后，需要在 [src/theme/index.ts](https://github.com/byodian/oneimg/blob/main/src/theme/index.ts) 文件中引入。

```ts
import {
  demoBlue,
  demoTemplate,
} from './templates'

// 引入模版
// `value`: 模版标识
export const DEFAULT_TEMPLATES = [
  { label: 'demo模版', value: 'demo-style', disabled: false, template: demoTemplate },
  // ...
] as const

// 引入模版颜色主题
// DEFAULT_THEME_COLOR_MAP 所有的 keys 必须和对应模版标识一致
// `value` 为模版主题色
export const DEFAULT_THEME_COLOR_MAP: Record<string, ThemeColorItem[]> = {
  'demo-style': [
    { value: '#f14040', label: 'rose_red', theme: demoBlue },
    // ... 更多颜色主题
  ],
}
```
 