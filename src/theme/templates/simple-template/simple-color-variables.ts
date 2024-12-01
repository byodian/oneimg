import type { ThemeConfig } from '@/types'

export const simpleSnowWhite: ThemeConfig = createSimpleThemeColor('#fcfcfc', '#161616', '#666', '#f4f4f4', '#e8e8e8')

export const simpleSnowBlack: ThemeConfig = createSimpleThemeColor('#000', '#fff', '#989898', '#111', '#282828')

function createSimpleThemeColor(containerBgColor: string, titlefgColor: string, contentColor: string, mainContainerEvenBgColor: string, mainContentSecondaryBgColor: string) {
  return {
    hero: {
      container: {
        background: containerBgColor,
        foreground: '#333',
      },
      title: {
        foreground: titlefgColor,
        background: 'transparent',
      },
      content: {
        foreground: contentColor,
        background: 'transparent',
      },
    },
    main: {
      container: {
        background: containerBgColor,
        backgroundEven: mainContainerEvenBgColor,
        backgroundOdd: containerBgColor,
      },
      title: {
        foreground: titlefgColor,
      },
      content: {
        foreground: contentColor,
        background: 'tranparent',
        secondaryBackground: mainContentSecondaryBgColor,
      },
    },
    sub: {
      container: {
      },
      title: {
        foreground: titlefgColor,
      },
      content: {
        foreground: contentColor,
      },
    },
  }
}
