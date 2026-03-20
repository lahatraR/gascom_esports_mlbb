import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GASCOM Esports — MLBB Draft Simulator',
  description: 'Real-time draft analysis, prediction and decision engine for Mobile Legends: Bang Bang',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
