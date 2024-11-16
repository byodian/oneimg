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
