import Image from 'next/image'
import { tutorialImages } from './images'

export interface ContentSection {
  heading: string;
  paragraphs: string[];
  sample?: string;
  image?: string;
  imageAlt?: string;
  links?: { label: string; href: string }[];
}

export function ContentSections({ sections }: { sections: ContentSection[] }) {
  return <>{sections.map(section => <section key={section.heading}>
    <h2>{section.heading}</h2>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.sample && <pre>{section.sample}</pre>}
    {section.image && section.image in tutorialImages && <figure>
      <Image src={tutorialImages[section.image as keyof typeof tutorialImages]} alt={section.imageAlt ?? section.heading} sizes="(max-width: 800px) 100vw, 760px" />
      <figcaption>{section.imageAlt}。专用示例，拍摄于 2026 年 11 月 1 日。</figcaption>
    </figure>}
    {section.links && <div className="flex flex-wrap gap-4">{section.links.map(link => <a key={link.href} href={link.href} {...(link.href.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}>{link.label}</a>)}</div>}
  </section>)}</>
}
