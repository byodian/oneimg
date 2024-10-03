import type { Metadata, Viewport } from 'next'
import { Noto_Sans_SC } from 'next/font/google'
import '@/app/globals.css'
import '@/app/styles/index.css'
import { headers } from 'next/headers'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'

const notoSansSc = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans-sc',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    template: '%s | OneIMG',
    default: 'OneIMG',
  },
  description: 'OneIMG - 文字转图片应用，快速生成多种尺寸的图片',
  openGraph: {
    title: 'OneIMG',
    description: 'OneIMG - 文字转图片应用，快速生成多种尺寸的图片',
    url: 'https://ongimgai.com',
    siteName: 'OneIMG',
  },
}

function getPlatform() {
  const headersList = headers()
  const userAgent = headersList.get('user-agent') || ''

  if (userAgent.includes('Win')) {
    return 'windows'
  }
  if (userAgent.includes('Mac')) {
    return 'mac'
  }
  if (userAgent.includes('X11')) {
    return 'unix'
  }
  if (userAgent.includes('Linux')) {
    return 'linux'
  }
  if (userAgent.includes('Android')) {
    return 'android'
  }
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    return 'ios'
  }

  return 'unknown'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full break-words overflow-hidden" data-platform={getPlatform()}>
      <body className={cn('h-full overflow-hidden antialiased', notoSansSc.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

export const runtime = 'edge'
