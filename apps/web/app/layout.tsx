import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'cortexchat',
  description: 'Open-source, local-first AI chat with intelligent model routing.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'cortexchat',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#212121' },
  ],
};

const THEME_INIT_SCRIPT = `
try {
  const stored = localStorage.getItem('cortexchat-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) document.documentElement.classList.add('dark');
} catch {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-screen overflow-hidden antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
