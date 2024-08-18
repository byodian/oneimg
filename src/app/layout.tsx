import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    template: '%s | OneIMG',
    default: 'OneIMG',
  },
  description: 'OneIMG',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className={cn('h-full overflow-hidden bg-background font-sans antialiased', inter.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
