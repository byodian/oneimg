import type { ArticleModuleTemplate } from '@/types/template'

export function createTheme(): ArticleModuleTemplate {
  return {
    hero: {
      container: {
        backgroundColor: 'var(--hero-container-background)',
        backgroundImage: 'var(--hero-container-background-image)',
        color: 'var(--hero-container-foreground)',
      },
      title: {
        color: 'var(--hero-title-foreground)',
        backgroundColor: 'var(--hero-title-background)',
        backgroundImage: 'var(--hero-title-background-image)',
      },
      content: {
        color: 'var(--hero-content-foreground)',
        backgroundColor: 'var(--hero-content-background)',
        backgroundImage: 'var(--hero-content-background-image)',
      },
    },
    main: {
      container: {
        backgroundColor: 'var(--main-container-background)',
        backgroundImage: 'var(--main-container-background-image)',
        color: 'var(--main-container-foreground)',
      },
      title: {
        color: 'var(--main-title-foreground)',
        backgroundColor: 'var(--main-title-background)',
        backgroundImage: 'var(--main-title-background-image)',
      },
      content: {
        color: 'var(--main-content-foreground)',
        backgroundColor: 'var(--main-content-background)',
        backgroundImage: 'var(--main-content-background-image)',
      },
    },
    sub: {
      container: {
        backgroundColor: 'var(--sub-container-background)',
        backgroundImage: 'var(--sub-container-background-image)',
        color: 'var(--sub-container-foreground)',
      },
      title: {
        color: 'var(--sub-title-foreground)',
        backgroundColor: 'var(--sub-title-background)',
        backgroundImage: 'var(--sub-title-background-image)',
      },
      content: {
        color: 'var(--sub-content-foreground)',
        backgroundColor: 'var(--sub-content-background)',
        backgroundImage: 'var(--sub-content-background-image)',
      },
    },
  }
}
