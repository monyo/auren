import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AUREN',
  description: 'Anonymous, Unique, Real, Exchange, Network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
