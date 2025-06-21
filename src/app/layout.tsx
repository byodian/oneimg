import type { Metadata, Viewport } from 'next'
import { Noto_Sans_SC, ZCOOL_KuaiLe } from 'next/font/google'
import '@/app/globals.css'
import { headers } from 'next/headers'
import { NextAppDirEmotionCacheProvider } from 'tss-react/next/appDir'
import Script from 'next/script'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'

const notoSansSc = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans-sc',
})

const zCoolKuaiLe = ZCOOL_KuaiLe({
  subsets: ['latin'],
  variable: '--font-zcool-kuailve',
  weight: '400',
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
    url: 'https://oneimgai.com',
    siteName: 'OneIMG',
  },
  metadataBase: new URL('https://oneimgai.com'),
}

function getPlatform() {
  const headersList = headers()
  const userAgent = headersList.get('user-agent') ?? ''

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
      <head>
        {/* Google Adsense */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={cn('h-full antialiased', notoSansSc.variable, zCoolKuaiLe.variable)}>
        <NextAppDirEmotionCacheProvider options={{ key: 'tss' }}>
          {children}
          <Toaster />
        </NextAppDirEmotionCacheProvider>
      </body>
    </html>
  )
}
