import type { ThemeConfig } from '@/types'

export const cartoonPurple: ThemeConfig = createCartoonThemeColor('#e3dceb', '#000', '#ffe36c', '#c0a1f1', 'purple')
export const cartoonGreen: ThemeConfig = createCartoonThemeColor('#cdea9c', '#000', '#ffe36c', '#99c64c', 'green')
export const cartoonYellow: ThemeConfig = createCartoonThemeColor('#ffe97f', '#000', '#ffbf74', '#ff773d', 'yellow')
export const cartoonBlue: ThemeConfig = createCartoonThemeColor('#516CF5', '#fff', '#FFCF4D', '#000', 'blue')

function createCartoonThemeColor(containerBgColor: string, containerColor: string, titleBgPrimaryColor: string, titleBgSecondaryColor: string, starIconColor: string) {
  return {
    hero: {
      container: {
        background: containerBgColor,
        backgroundImageLeft: `url(/images/cartoon-star-left-${starIconColor}.svg)`,
        backgroundImageRight: `url(/images/cartoon-star-right-${starIconColor}.svg)`,
        foreground: containerColor,
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
