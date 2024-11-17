import { create } from 'zustand'
import type { ArticleModuleTemplate, ThemeColorItem } from '@/types'
import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_MAP, DEFAULT_THEME, DEFAULT_THEME_COLOR_MAP } from '@/theme'

interface TemplateStore {
  templateMap: Record<string, ArticleModuleTemplate>;
  templateName: string;
  theme: string;
  themeMap: Record<string, ThemeColorItem[]>;
  setTemplateName: (templateName: string) => void;
  setTheme: (theme: string) => void;
  setTemplateMap: (templateMap: Record<string, ArticleModuleTemplate>) => void;
}

export const useThemeStore = create<TemplateStore>(set => ({
  templateName: DEFAULT_TEMPLATE,
  theme: DEFAULT_THEME.label,
  templateMap: DEFAULT_TEMPLATE_MAP,
  themeMap: DEFAULT_THEME_COLOR_MAP,
  setTemplateName: templateName => set({ templateName }),
  setTemplateMap: templateMap => set({ templateMap }),
  setTheme: theme => set({ theme }),
}))
