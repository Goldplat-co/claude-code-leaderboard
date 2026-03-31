import type { Metadata } from 'next';
import Nav from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claude Code 리더보드',
  description: 'Claude Code 팀 사용량 리더보드',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard 폰트 CDN */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <Nav />
        {/* 메인 콘텐츠: 4xl 최대 너비로 가운데 정렬 */}
        <main className="mx-auto w-full max-w-4xl px-4 py-6 flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
