'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

const navItems: { label: string; href: string; isNew?: boolean }[] = [
  { label: '순위', href: '/' },
  { label: '트렌드', href: '/trends' },
  { label: '환경 점검', href: '/env', isNew: true },
  { label: '팀 모니터링', href: '/team', isNew: true },
  { label: 'Best Practices', href: '/best-practices', isNew: true },
  { label: 'GitHub', href: '/github', isNew: true },
  { label: '설치 가이드', href: '/setup' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  // 로그인 페이지에서는 Nav 숨김
  if (pathname === '/login') return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-text-primary">
          Claude Code Dashboard
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
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
          <Link
            href="/my"
            className={`ml-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/my'
                ? 'bg-gold/10 text-gold-dark'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            내 계정
          </Link>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
}
