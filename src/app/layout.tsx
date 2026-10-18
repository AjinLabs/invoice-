import type { Metadata } from 'next';
import { Inter, Oswald } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: 'TERRY7 WOMEN - Weight-Based POS Billing System',
  description: 'Official weight-based clothing billing, customer loyalty tracker, and WhatsApp cash memo for TERRY7 WOMEN.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-100 text-neutral-900 font-sans">
        <Suspense fallback={<div className="h-16 bg-neutral-900" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 pb-24 sm:pb-28">{children}</main>
      </body>
    </html>
  );
}
