import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Metaryon News Aggregator',
  description: 'Curated news aggregator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
