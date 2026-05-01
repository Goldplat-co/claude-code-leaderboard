import { createServerSupabase } from '@/lib/supabase';
import GitHubClient from './github-client';

// 동적 렌더링 (빌드 시 Supabase 호출 방지)
export const dynamic = 'force-dynamic';

/**
 * GitHub Health Check 페이지 (서버 컴포넌트)
 *
 * Supabase에서 레포 목록과 최근 7일 활동 데이터를 병렬 조회 후
 * GitHubClient 클라이언트 컴포넌트에 전달
 */
export default async function GitHubPage() {
  const supabase = createServerSupabase();

  // 최근 7일 기준 날짜 계산
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  // 레포 목록 + 최근 7일 활동 데이터를 병렬 조회
  const [reposRes, activityRes] = await Promise.all([
    supabase
      .from('github_repos')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase
      .from('github_activity')
      .select('*')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false }),
  ]);

  return (
    <div>
      {/* 페이지 제목 */}
      <h1 className="text-2xl font-bold mb-6">GitHub Health Check</h1>

      {/* GitHub 클라이언트 컴포넌트 */}
      <GitHubClient
        repos={reposRes.data ?? []}
        activity={activityRes.data ?? []}
      />
    </div>
  );
}
