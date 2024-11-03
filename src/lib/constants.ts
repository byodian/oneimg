import type { ThemeColorMap } from '@/types/common'

export const themeTemplates = [
  { label: '简约科技风格', value: 'wechat-post-1', disabled: false },
  { label: '黑白苹果风格', value: 'apple-style', disabled: false },
  { label: '可爱卡通风格', value: 'cartoon-style', disabled: false },
  { label: '更多模版尽情期待', value: 'post-more', disabled: true },
] as const

export const themeColorMap: ThemeColorMap = {
  'wechat-post-1': [
    { value: '#4383ec', label: 'tech_blue' },
    { value: '#ff611d', label: 'vibrant_orange' },
    { value: '#f14040', label: 'rose_red' },
  ],
  'apple-style': [
    { value: '#ddd', label: 'snow_white' },
    { value: '#000', label: 'midnight_black' },
  ],
  'cartoon-style': [
    { value: '#000', label: 'snow_white' },
  ],
  'default': [
    { value: '#4383ec', label: 'tech_blue' },
    { value: '#ff611d', label: 'vibrant_orange' },
    { value: '#f14040', label: 'rose_red' },
  ],
}

export const defaultTheme = 'apple-style'
export const defaultThemeColor = {
  label: 'snow_white',
  value: '#ddd',
}
