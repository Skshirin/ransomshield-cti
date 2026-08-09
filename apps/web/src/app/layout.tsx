import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/components/AppProvider'

export const metadata: Metadata = {
  title: 'RansomShield CTI Platform',
  description: 'ML-Powered Ransomware Detection with Blockchain-Based CTI Sharing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased bg-slate-50 text-slate-900">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
