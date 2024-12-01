import type { ThemeConfig } from '@/types'

export const cartoonPurple: ThemeConfig = createCartoonThemeColor('#e3dceb', '#ffe36c', '#c0a1f1')
export const cartoonGreen: ThemeConfig = createCartoonThemeColor('#cdea9c', '#ffe36c', '#99c64c')
export const cartoonYellow: ThemeConfig = createCartoonThemeColor('#ffe97f', '#ffbf74', '#ff773d')

function createCartoonThemeColor(containerBgColor: string, titleBgPrimaryColor: string, titleBgSecondaryColor: string) {
  return {
    hero: {
      container: {
        background: containerBgColor,
        foreground: '#333',
      },
      title: {
        foreground: '#fff',
        background: 'transparent',
      },
      content: {
        foreground: '#000',
        background: 'transparent',
      },
    },
    main: {
      container: {
        foreground: '#000',
        background: containerBgColor,
      },
      title: {
        backgroundPrimary: titleBgPrimaryColor,
        backgroundSecondary: titleBgSecondaryColor,
      },
      content: {
        background: '#fff',
      },
    },
    sub: {
      container: {
      },
      title: {
        background: titleBgPrimaryColor,
      },
      content: {
      },
    },
  }
}
