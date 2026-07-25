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
  title: 'Mecharoon | Financial Control for Autonomous Teams',
  description:
    "Bound every agent's budget, reconcile every payment, and trace each spend to the task and accepted work.",
  ...(configuredSiteUrl ? {alternates: {canonical: '/'}} : {}),
  robots: {
    index: Boolean(configuredSiteUrl),
    follow: Boolean(configuredSiteUrl),
  },
  openGraph: {
    type: 'website',
    ...(configuredSiteUrl ? {url: configuredSiteUrl} : {}),
    siteName: 'Mecharoon',
    title: 'Financial control for autonomous teams.',
    description:
      "Bound every agent's budget, reconcile every payment, and trace each spend to the task and accepted work.",
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
    title: 'Financial control for autonomous teams.',
    description:
      "Bound every agent's budget, reconcile every payment, and trace each spend to the task and accepted work.",
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
