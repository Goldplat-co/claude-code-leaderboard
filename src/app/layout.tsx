import type { Metadata } from 'next';
import Nav from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goldplat OS',
  description: '골드플랫 팀 대시보드',
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
      <body className="min-h-full bg-white">
        <Nav />
        {/*
          본문은 사이드바 오른쪽에 놓인다.
          사이드바가 fixed라 그만큼 왼쪽 여백을 주는데, 접었다 펼 때 폭이 바뀌므로
          Nav가 설정하는 --sidebar-w 변수를 따라간다.
        */}
        <div
          className="min-h-screen flex flex-col transition-[margin] duration-200"
          style={{ marginLeft: 'var(--sidebar-w, 228px)' }}
        >
          <main className="mx-auto w-full max-w-6xl px-4 py-6 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
