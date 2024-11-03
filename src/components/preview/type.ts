export type CustomCSSProperties = React.CSSProperties & Record<string, React.CSSProperties | any>

export interface TemplateStyle {
  container: CustomCSSProperties;
  title: CustomCSSProperties;
  content: CustomCSSProperties;
}

export interface Template {
  id?: string
  name?: string
  // layout: 'default' | 'compact' | 'card' | 'timeline'
  common: TemplateStyle;
  primary: TemplateStyle;
  secondary: TemplateStyle;
  thirdary: TemplateStyle;
}

export type Classes = Record<'container' | 'title' | 'content', string>

export type ClassesMap = Record<'common' | 'primary' | 'secondary' | 'thirdary', Classes>
