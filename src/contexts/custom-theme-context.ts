import { createContext } from 'react'
import { techTemplate } from '@/theme/templates'

export const CustomThemeContext = createContext({
  theme: 'tech_blue',
  template: techTemplate,
})
