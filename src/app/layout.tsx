import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Music Fes!',
  description: '音楽フェスの参加者募集情報を一元管理するシステム',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-orange-100 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
