import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'NASDAQ Screener',
  description: 'Institutional · Sector · Earnings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body className="bg-terminal-bg text-terminal-text font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
