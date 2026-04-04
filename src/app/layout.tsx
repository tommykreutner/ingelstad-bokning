import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prova-på-dagar – Ingelstadgymnasiet',
  description: 'Boka prova-på-dag på Ingelstadgymnasiet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
