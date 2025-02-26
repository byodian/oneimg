import {
  cartoonBlue,
  cartoonGreen,
  cartoonPurple,
  cartoonTemplate,
  cartoonYellow,
  simpleSnowBlack,
  simpleSnowWhite,
  simpleTemplate,
  techBlue,
  techRoseRed,
  techTemplate,
  techVibrantOrange,
} from './templates'
import type { ArticleModuleTemplate, Size, ThemeColorItem } from '@/types'

export const DEFAULT_TEMPLATES = [
  { label: '简约科技风格', value: 'wechat-post-1', disabled: false, template: techTemplate },
  { label: '简约黑白风格', value: 'apple-style', disabled: false, template: simpleTemplate },
  { label: '简约卡通风格', value: 'cartoon-style', disabled: false, template: cartoonTemplate },
  { label: '更多模版尽情期待', value: 'post-more', disabled: true, template: null },
] as const

export const DEFAULT_TEMPLATE_MAP = DEFAULT_TEMPLATES
  .filter(item => !item.disabled)
  .reduce((acc, cur) => {
    const { value, template } = cur
    acc[value] = template
    return acc
  }, {} as Record<string, ArticleModuleTemplate>)

export const DEFAULT_THEME_COLOR_MAP: Record<string, ThemeColorItem[]> = {
  'wechat-post-1': [
    { value: '#4383ec', label: 'tech_blue', theme: techBlue },
    { value: '#ff611d', label: 'vibrant_orange', theme: techVibrantOrange },
    { value: '#f14040', label: 'rose_red', theme: techRoseRed },
  ],
  'apple-style': [
    { value: '#ddd', label: 'snow_white', theme: simpleSnowWhite },
    { value: '#000', label: 'midnight_black', theme: simpleSnowBlack },
  ],
  'cartoon-style': [
    { value: '#b38aef', label: 'purple', theme: cartoonPurple },
    { value: '#cdea9c', label: 'green', theme: cartoonGreen },
    { value: '#ffe97f', label: 'yellow', theme: cartoonYellow },
    { value: '#516cf5', label: 'blue', theme: cartoonBlue },
  ],
  'default': [
    { value: '#4383ec', label: 'tech_blue', theme: techBlue },
    { value: '#ff611d', label: 'vibrant_orange', theme: techBlue },
    { value: '#f14040', label: 'rose_red', theme: techBlue },
  ],
}

export const DEFAULT_TEMPLATE = 'apple-style'
export const DEFAULT_THEME = {
  label: 'snow_white',
  value: '#ddd',
}

export const DEFAULT_SIZE_NAME = 'default'
export const DEFAULT_SIZE_NAMES = [
  { label: 'Instagramt 帖子', value: 'instagram_post', disabled: false, description: '1080 × 1350 px' },
  { label: 'Twitter 帖子', value: 'twitter_post', disabled: false, description: '1600 × 900 px' },
  { label: '小红书帖子', value: 'redbook_post', disabled: false, description: '1242 × 1660 px' },
  { label: '微信长图', value: 'default', disabled: false, description: '' },
  { label: '更多尺寸尽情期待', value: 'size-more', disabled: true, description: '' },
] as const

export const DEFAULT_SIZE_MAP: Record<string, Size> = {
  redbook_post: { width: 1242, height: 1660 },
  instagram_post: { width: 1080, height: 1350 },
  twitter_post: { width: 1600, height: 900 },
  default: { width: 1125, height: 'auto' },
}
