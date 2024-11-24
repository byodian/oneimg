import type { ArticleModuleTemplate } from '@/types'

export const simpleTemplate: ArticleModuleTemplate = {
  common: {
    container: {},
    title: {},
    content: {},
  },
  hero: {
    container: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '256px',
      padding: '45px 36px',
      textAlign: 'center',
      lineHeight: 1.2,
    },
    title: {
      marginBottom: '14px',
      fontWeight: 700,
      fontSize: '34px',
    },
    content: {
      'fontSize': '19px',
      ':where(p)': {
        marginTop: '18px',
        marginBottom: '18px',
      },
      ':where(:first-child)': {
        marginTop: 0,
      },
      ':where(:last-child)': {
        marginBottom: 0,
      },
    },
  },
  main: {
    container: {
      'padding': '45px 36px',

      '&:nth-of-type(2n)': {
        backgroundColor: 'var(--main-container-background-even)',
      },

      '&:nth-of-type(2n + 1)': {
        backgroundColor: 'var(--main-container-background-odd)',
      },
    },
    title: {
      fontSize: '30px',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    content: {
      'fontSize': '15px',
      '& :where(p)': {
        marginTop: '8px',
        marginBottom: '8px',
      },
      '& :where(img)': {
        marginTop: '8px',
        marginBottom: '8px',
      },
      '& :where(hr)': {
        borderTopColor: 'var(--main-content-secondary-background)',
      },
      '& :where(blockquote)': {
        borderLeftColor: 'var(--main-content-secondary-background)',
      },
      '& :where(code):not(pre code)': {
        backgroundColor: 'var(--main-content-secondary-background)',
        color: 'var(--sub-container-foreground)',
      },
    },
  },
  sub: {
    container: {},
    title: {
      lineHeight: 1.2,
      fontWeight: 700,
      fontSize: '20px',
    },
    content: {},
  },
}
