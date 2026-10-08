import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Inter } from 'next/font/google'
import { ServiceWorker } from '@/components/layout/ServiceWorker'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'SGPetCare',
    template: '%s · SGPetCare',
  },
  description:
    'Vaccinations, deworming, AVS licence renewals and vet visits for your pets in one place, with reminders before anything is due.',
  applicationName: 'SGPetCare',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'SGPetCare', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#FFF7ED',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
