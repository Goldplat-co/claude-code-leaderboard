import { createServerSupabase } from '@/lib/supabase';
import LeaderboardClient from './leaderboard-client';
import type { Member, DailyUsage } from '@/lib/types';

// 동적 렌더링 (빌드 시 Supabase 호출 방지)
export const dynamic = 'force-dynamic';

/**
 * 메인 페이지 (서버 컴포넌트)
 * Supabase에서 멤버 목록과 일별 사용량 데이터를 가져와서
 * 클라이언트 컴포넌트(LeaderboardClient)에 전달
 */
export default async function Page() {
  const supabase = createServerSupabase();

  // 멤버 목록과 일별 사용량을 병렬로 조회
  const [membersRes, usageRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at'),
    supabase.from('daily_usage').select('*').order('date', { ascending: false }),
  ]);

  const members: Member[] = membersRes.data ?? [];
  const dailyUsage: DailyUsage[] = usageRes.data ?? [];

  return (
    <div>
      {/* 페이지 제목 */}
      <h1 className="text-2xl font-bold mb-6">사용량 순위</h1>

      {/* 리더보드 클라이언트 컴포넌트 */}
      <LeaderboardClient members={members} dailyUsage={dailyUsage} />
    </div>
  );
}
