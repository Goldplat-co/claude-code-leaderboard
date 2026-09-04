'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * 좌측 사이드바 내비게이션.
 *
 * 메뉴가 늘어나면서 상단 가로 배치로는 한 줄에 담기 어려워졌고,
 * 성격이 다른 기능(Claude Code 사용량 / 시장 관측)이 한 줄에 섞여 구분이 안 됐다.
 * 그래서 카테고리로 묶은 좌측 사이드바로 바꾸고, 각 그룹은 접었다 펼 수 있게 했다.
 */

type NavItem = { label: string; href: string; isNew?: boolean; exact?: boolean };
type NavGroup = { id: string; title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: 'claude',
    title: 'Claude Code Dashboard',
    items: [
      { label: '순위', href: '/', exact: true },
      { label: '트렌드', href: '/trends' },
      { label: '환경 점검', href: '/env', isNew: true },
      { label: '팀 모니터링', href: '/team', isNew: true },
      { label: 'GitHub', href: '/github', isNew: true },
      { label: 'Best Practices', href: '/best-practices', isNew: true },
      { label: '설치 가이드', href: '/setup' },
    ],
  },
  {
    id: 'market',
    title: '시장 관측',
    items: [
      { label: '주얼리 상품 랭킹', href: '/jewelry', exact: true, isNew: true },
      { label: '주얼리 브랜드', href: '/jewelry/brands', isNew: true },
    ],
  },
];

const STORAGE_KEY = 'nav:collapsed';
const OPEN_KEY = 'nav:openGroups';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  // 사이드바 접힘 상태와 그룹 펼침 상태는 새로고침해도 유지되도록 브라우저에 저장한다.
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g) => [g.id, true]))
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(STORAGE_KEY);
      if (c) setCollapsed(c === '1');
      const o = localStorage.getItem(OPEN_KEY);
      if (o) setOpen((prev) => ({ ...prev, ...JSON.parse(o) }));
    } catch {
      /* 저장된 값이 깨졌으면 기본값을 쓴다 */
    }
    setReady(true);
  }, []);

  // 사이드바 폭을 CSS 변수로 알려준다.
  // layout.tsx는 서버 컴포넌트라 접힘 상태를 모르므로, 변수를 통해 본문 여백을 맞춘다.
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '60px' : '228px');
  }, [collapsed]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  }

  function toggleGroup(id: string) {
    const next = { ...open, [id]: !open[id] };
    setOpen(next);
    localStorage.setItem(OPEN_KEY, JSON.stringify(next));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // 로그인 페이지에서는 사이드바를 숨긴다
  if (pathname === '/login') return null;

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white
                  flex flex-col transition-[width] duration-200
                  ${collapsed ? 'w-[60px]' : 'w-[228px]'}`}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
    >
      {/* 상단 — 서비스명과 접기 버튼 */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-gray-100 shrink-0">
        {!collapsed && (
          <Link href="/" className="text-[15px] font-bold text-text-primary truncate">
            Goldplat OS
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mx-auto"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d={collapsed ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* 메뉴 — 카테고리별 토글 */}
      <nav className="flex-1 overflow-y-auto py-2">
        {GROUPS.map((group) => (
          <div key={group.id} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-1.5
                           text-[11px] font-semibold uppercase tracking-wide
                           text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="truncate">{group.title}</span>
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
                  className={`transition-transform shrink-0 ${open[group.id] ? '' : '-rotate-90'}`}
                >
                  <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {(collapsed || open[group.id]) && (
              <div className="px-2">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2 rounded-md text-sm font-medium transition-colors
                        ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5'}
                        ${active
                          ? 'bg-gold/10 text-gold-dark'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                      {collapsed ? (
                        // 접혔을 때는 라벨 첫 글자만 보여준다
                        <span className="text-[13px]">{item.label.slice(0, 1)}</span>
                      ) : (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.isNew && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A020] shrink-0" />
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 하단 — 내 계정과 로그아웃은 위치를 그대로 유지한다 */}
      <div className="border-t border-gray-100 p-2 shrink-0">
        <Link
          href="/my"
          title={collapsed ? '내 계정' : undefined}
          className={`flex items-center rounded-md text-sm font-medium transition-colors
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5'}
            ${pathname === '/my'
              ? 'bg-gold/10 text-gold-dark'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          {collapsed ? '내' : '내 계정'}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? '로그아웃' : undefined}
          className={`w-full flex items-center rounded-md text-sm font-medium
                      text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5'}`}
        >
          {collapsed ? '↩' : '로그아웃'}
        </button>
      </div>
    </aside>
  );
}
