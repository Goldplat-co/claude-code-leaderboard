'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 네비게이션 항목 정의
const navItems: { label: string; href: string; isNew?: boolean }[] = [
  { label: '순위', href: '/' },
  { label: '트렌드', href: '/trends' },
  { label: '환경 점검', href: '/env', isNew: true },
  { label: '팀 모니터링', href: '/team', isNew: true },
  { label: '베스트 프랙티스', href: '/best-practices', isNew: true },
  { label: 'GitHub', href: '/github', isNew: true },
  { label: '설치 가이드', href: '/setup' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* 로고: 골드 그라데이션 텍스트 */}
        <Link href="/" className="text-xl font-bold text-text-primary">
          Claude Code Dashboard
        </Link>

        {/* 네비게이션 링크 */}
        <div className="flex gap-1">
          {navItems.map((item) => {
            // 현재 경로와 일치하면 활성 상태
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gold/10 text-gold-dark'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
                {item.isNew && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4A020] ml-1" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
