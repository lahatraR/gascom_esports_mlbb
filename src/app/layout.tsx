import type { Metadata } from 'next';
import './globals.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'GASCOM Esports — MLBB Draft Simulator',
  description: 'Real-time draft analysis, prediction and decision engine for Mobile Legends: Bang Bang — by Gascom Esports',
  icons: {
    icon: `${BASE}/ges-logo.png`,
    shortcut: `${BASE}/ges-logo.png`,
    apple: `${BASE}/ges-logo.png`,
  },
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
