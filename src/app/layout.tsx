import '@/app/globals.css';

import { Inter, JetBrains_Mono } from 'next/font/google';
import { ReactNode } from 'react';
import { Metadata } from 'next';

import { Providers } from '@/components/providers';
import { Navigation } from '@/components/navigation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nest Oracle',
    template: '%s | Nest Oracle',
  },
  description: 'Optimistic oracle for truth verification and dispute resolution on NEAR.',
  applicationName: 'Nest Oracle',
  openGraph: {
    title: 'Nest Oracle',
    description: 'Optimistic oracle for truth verification and dispute resolution on NEAR.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nest Oracle',
    description: 'Optimistic oracle for truth verification and dispute resolution on NEAR.',
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <Navigation />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
