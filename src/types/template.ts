export type CustomCSSProperties = React.CSSProperties & Record<string, React.CSSProperties | any>

export interface ModuleSection {
  container?: CustomCSSProperties;
  title?: CustomCSSProperties;
  content?: CustomCSSProperties;
}

export interface ArticleModuleTemplate {
  id?: string
  name?: string
  // layout: 'default' | 'compact' | 'card' | 'timeline'
  common?: ModuleSection;
  hero?: ModuleSection;
  main?: ModuleSection;
  sub?: ModuleSection
}

export type ModuleClassName = Record<'container' | 'title' | 'content', string>

export type ModuleClassNameMap = Record<'common' | 'hero' | 'main' | 'sub', ModuleClassName>

export interface ThemeConfigProperty {
  background?: string;
  foreground?: string;
  backgroundImage?: string;
  backgroundEven?: string;
  backgroundOdd?: string;
  backgroundPrimary?: string;
  backgroundSecondary?: string;
  foregroundPrimary?: string;
  foregroundSecondary?: string;
}

export interface ThemeConfig {
  hero?: {
    container?: ThemeConfigProperty;
    title?: ThemeConfigProperty;
    content?: ThemeConfigProperty;
  };
  main?: {
    container?: ThemeConfigProperty;
    title?: ThemeConfigProperty;
    content?: ThemeConfigProperty;
  };
  sub?: {
    container?: ThemeConfigProperty;
    title?: ThemeConfigProperty;
    content?: ThemeConfigProperty;
  };
}

export type ThemeColorItem = {
  value: string;
  label: string;
  theme?: ThemeConfig;
}

export type Size = {
  width: number;
  height: number | 'auto';
}
