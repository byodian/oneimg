import { create } from 'zustand'
import type { ArticleModuleTemplate, Size, ThemeColorItem } from '@/types'
import { DEFAULT_SIZE_MAP, DEFAULT_SIZE_NAME, DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_MAP, DEFAULT_THEME, DEFAULT_THEME_COLOR_MAP } from '@/theme'

interface TemplateStore {
  templateMap: Record<string, ArticleModuleTemplate>;
  templateName: string;
  theme: string;
  themeMap: Record<string, ThemeColorItem[]>;
  sizeName: string;
  size: Size,
  setSize: (size: Size) => void;
  setSizeName: (sizeName: string) => void;
  setTemplateName: (templateName: string) => void;
  setTheme: (theme: string) => void;
  setTemplateMap: (templateMap: Record<string, ArticleModuleTemplate>) => void;
}

export const useThemeStore = create<TemplateStore>(set => ({
  templateName: DEFAULT_TEMPLATE,
  theme: DEFAULT_THEME.label,
  templateMap: DEFAULT_TEMPLATE_MAP,
  themeMap: DEFAULT_THEME_COLOR_MAP,
  sizeName: DEFAULT_SIZE_NAME,
  size: DEFAULT_SIZE_MAP.default,
  setSize: size => set({ size }),
  setSizeName: sizeName => set({ sizeName }),
  setTemplateName: templateName => set({ templateName }),
  setTemplateMap: templateMap => set({ templateMap }),
  setTheme: theme => set({ theme }),
}))
