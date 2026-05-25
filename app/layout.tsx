import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NASDAQ Screener',
  description: 'Sector · Institutional · Earnings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-t-bg text-t-text font-mono antialiased">{children}</body>
    </html>
  );
}
