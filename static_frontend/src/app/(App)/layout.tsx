"use client";

import './globals.css'
//import type { Metadata } from 'next'
import { Syncopate, Montserrat } from 'next/font/google'
import Navbar from './Navbar'
import Background from './Background'
import { env } from '@/config/environment'
import { UseInkathonProvider } from '@scio-labs/use-inkathon'
import { HomeIcon, UserGroupIcon, CogIcon } from '@heroicons/react/24/outline';

const navigation_app = [
    { name: 'Insta-core', icon: HomeIcon, href: '/instacore', current: false },
    { name: '1. Bulk-core', icon: UserGroupIcon, href: '/bulkcore1', current: false },
    { name: '2. Bulk-core', icon: CogIcon, href: '/bulkcore2', current: false },
    { name: 'test', icon: CogIcon, href: '/test', current: false },
  ]


const syncopate = Syncopate(
  { subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-syncopate',
  },
)

const montserrat = Montserrat(
  { subsets: ['latin'],
    weight: ['300', '400', '700'],
    variable: '--font-montserrat',
  },
)

// export const metadata: Metadata = {
//   title: 'Lastic',
//   description: 'Blockspace marketplace for Polkadot.',
// }

export default function RootLayout({
    children,
  } : {
    children: React.ReactNode
  }) {
  return (
    <html lang="en">
      <body className={`${syncopate.variable} ${montserrat.variable}`}>
        <Background>
          <UseInkathonProvider
              appName="lastic" // TODO
              connectOnInit={true}
              defaultChain={env.defaultChain}
          >
            <Navbar navigation={navigation_app}>
              <div className="py-10">
                <main>{children}</main>
              </div>

            </Navbar>
          </UseInkathonProvider>
        </Background>
      </body>
    </html>
  )
}

