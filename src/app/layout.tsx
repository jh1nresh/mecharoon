import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(configuredSiteUrl ?? 'http://localhost:3000'),
  title: 'Mecharoon | Financial Control Infrastructure for Agentic Work',
  description:
    'Delegate budgets across agent trees. Reserve before execution. Reconcile every payment to the work that authorized it.',
  ...(configuredSiteUrl ? {alternates: {canonical: '/'}} : {}),
  robots: {
    index: Boolean(configuredSiteUrl),
    follow: Boolean(configuredSiteUrl),
  },
  openGraph: {
    type: 'website',
    ...(configuredSiteUrl ? {url: configuredSiteUrl} : {}),
    siteName: 'Mecharoon',
    title: 'The financial control infrastructure for agentic work.',
    description:
      'Delegate budgets across agent trees. Reserve before execution. Reconcile every payment to the work that authorized it.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Mecharoon Agent Spend Control Plane',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The financial control infrastructure for agentic work.',
    description:
      'Delegate budgets across agent trees. Reserve before execution. Reconcile every payment to the work that authorized it.',
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f1e8',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
