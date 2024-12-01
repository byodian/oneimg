import type { ThemeConfig } from '@/types'

export const techBlue: ThemeConfig = createTechThemeColor('#ccedff', 'tech-blue', '90deg, #3ca0ff 0%, #1d6dff 100%')

export const techVibrantOrange: ThemeConfig = createTechThemeColor('#fff6ef', 'vibrant-orange', '90deg, #ff611d 0%, #ff8e3c 100%')

export const techRoseRed: ThemeConfig = createTechThemeColor('#f4f4f4', 'rose-red', '90deg, #f14040 0%, #ff7676 100%')

export function createTechThemeColor(containerBgColor: string, containerBgImage: string, titleBgImage: string) {
  return {
    hero: {
      container: {
        background: containerBgColor,
        backgroundImage: `url(/images/them-bg-${containerBgImage}.png)`,
        foreground: '#333',
      },
      title: {
        foreground: '#333',
        background: 'transparent',
      },
      content: {
        foreground: '#333',
        background: 'transparent',
      },
    },
    main: {
      container: {
        background: containerBgColor,
      },
      title: {
        foreground: '#fff',
        backgroundImage: `linear-gradient(${titleBgImage})`,
      },
      content: {
        foreground: '#333',
        background: 'rgba(255, 255, 255, 0.7)',
      },
    },
    sub: {
      container: {
      },
      title: {
        foreground: '#fff',
        backgroundImage: `linear-gradient(${titleBgImage})`,
      },
      content: {
        foreground: '#333',
      },
    },
  }
}
